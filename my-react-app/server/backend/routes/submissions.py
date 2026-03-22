from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Body
from fastapi.responses import FileResponse
from bson import ObjectId
from datetime import datetime
from pathlib import Path
import shutil

from db.connection import (
    submissions_collection,
    homeworks_collection,
    classrooms_collection,
    cases_collection,
    qna_collection,
    versions_collection,
)
from models.models import SubmissionCreate, SubmissionOut, GradeRequest

router = APIRouter(prefix="/api", tags=["Submissions"])

UPLOAD_ROOT = Path("uploads")
UPLOAD_ROOT.mkdir(exist_ok=True)


def now():
    return datetime.utcnow()


def to_iso(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if value is None:
        return None
    return str(value)


def build_model_answers(questions):
    out = []
    for idx, q in enumerate(questions or []):
        qtype = q.get("type")
        item = {
            "index": idx,
            "type": qtype,
            "prompt": q.get("prompt", ""),
            "points": q.get("points", 0),
        }
        if qtype in ("short", "essay"):
            item["expectedAnswer"] = q.get("expectedAnswer")
        elif qtype == "mcq":
            item["options"] = q.get("options", [])
            item["correctIndex"] = q.get("correctIndex")
        out.append(item)
    return out


@router.post("/submissions/upload")
async def upload_submission_file(
    file: UploadFile = File(...),
    homeworkId: str = Query(...),
    userId: str = Query(...)
):
    user_dir = UPLOAD_ROOT / userId / "submissions" / homeworkId
    user_dir.mkdir(parents=True, exist_ok=True)

    safe_name = Path(file.filename).name
    file_path = user_dir / safe_name

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "url": f"/uploads/{userId}/submissions/{homeworkId}/{safe_name}",
        "name": safe_name,
        "type": file.content_type or "application/octet-stream",
        "size": file_path.stat().st_size,
    }


@router.get("/files/{userId}/homework/{filename}")
async def download_submission_file(userId: str, filename: str):
    file_path = UPLOAD_ROOT / userId / "homework" / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path)


@router.get("/submissions/mine", response_model=SubmissionOut)
async def my_submission(
    homeworkId: str = Query(...),
    userId: str = Query(...)
):
    sub = await submissions_collection.find_one({
        "homework_id": homeworkId,
        "user_id": userId
    })

    if not sub:
        return SubmissionOut(submission_id="", status="none")

    return SubmissionOut(
        submission_id=str(sub["_id"]),
        status=sub.get("status", "submitted"),
        score=sub.get("score"),
        notes=sub.get("notes"),
        files=sub.get("files"),
        answers=sub.get("answers"),
        updated_at=to_iso(sub.get("updated_at"))
    )


@router.post("/submissions", response_model=SubmissionOut)
async def create_or_update_submission(
    homeworkId: str = Query(...),
    caseId: str = Query(...),
    userId: str = Query(...),
    payload: SubmissionCreate = Body(...)
):
    timestamp = now()

    try:
        hw = await homeworks_collection.find_one({"_id": ObjectId(homeworkId)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid homework id")

    if not hw:
        raise HTTPException(status_code=404, detail="Homework not found")

    due_at = hw.get("due_at")
    if due_at:
        try:
            due_dt = datetime.fromisoformat(str(due_at).replace("Z", "+00:00"))
            if due_dt.replace(tzinfo=None) < timestamp:
                raise HTTPException(status_code=400, detail="Deadline passed")
        except HTTPException:
            raise
        except Exception:
            pass

    audience = hw.get("audience", "All Students")
    assigned = False

    if audience == "All Students":
        assigned = True
    elif audience == "Classrooms":
        class_ids = [str(x) for x in (hw.get("class_ids") or []) if x]
        if class_ids:
            # Check membership across any selected classroom
            valid_ids = []
            for class_id in class_ids:
                try:
                    valid_ids.append(ObjectId(class_id))
                except Exception:
                    continue

            if valid_ids:
                cursor = classrooms_collection.find({"_id": {"$in": valid_ids}})
                async for classroom in cursor:
                    member_ids = [str(x) for x in classroom.get("members", [])]
                    student_ids = [str(x) for x in classroom.get("students", [])]
                    if userId in member_ids or userId in student_ids:
                        assigned = True
                        break
        else:
            # Legacy fallback for older homework docs that used class_name/year
            classroom = await classrooms_collection.find_one({
                "name": hw.get("class_name"),
                "year": hw.get("year")
            })
            if classroom:
                member_ids = [str(x) for x in classroom.get("members", [])]
                student_ids = [str(x) for x in classroom.get("students", [])]
                assigned = userId in member_ids or userId in student_ids

    if not assigned:
        raise HTTPException(status_code=403, detail="Not assigned")

    files_list = [f.model_dump() for f in payload.files] if payload.files else []
    answers_list = [a.model_dump() for a in payload.answers] if payload.answers else []

    class_ids = [str(x) for x in (hw.get("class_ids") or []) if x]
    class_labels = [str(x) for x in (hw.get("class_labels") or []) if x]

    update_doc = {
        "homework_id": homeworkId,
        "case_id": caseId,
        "user_id": userId,
        "notes": payload.notes,
        "files": files_list,
        "answers": answers_list,
        "status": "submitted",
        "class_ids": class_ids,
        "class_labels": class_labels,
        "updated_at": timestamp,
    }

    existing = await submissions_collection.find_one({
        "homework_id": homeworkId,
        "user_id": userId,
    })

    if existing:
        await submissions_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": update_doc}
        )
        submission_id = str(existing["_id"])
    else:
        update_doc["created_at"] = timestamp
        result = await submissions_collection.insert_one(update_doc)
        submission_id = str(result.inserted_id)

    return SubmissionOut(
        submission_id=submission_id,
        status="submitted",
        notes=payload.notes,
        files=files_list,
        answers=answers_list,
        updated_at=timestamp.isoformat(),
    )


@router.get("/instructor/submissions")
async def instructor_submissions():
    rows = await submissions_collection.find({}).sort("updated_at", -1).to_list(1000)
    out = []

    for sub in rows:
        case_id = str(sub.get("case_id") or "")
        user_id = str(sub.get("user_id") or "")
        homework_id = str(sub.get("homework_id") or "")

        case_doc = None
        if case_id:
            try:
                case_doc = await cases_collection.find_one({"_id": ObjectId(case_id)})
            except Exception:
                case_doc = await cases_collection.find_one({"case_id": case_id})

        homework_doc = None
        if homework_id:
            try:
                homework_doc = await homeworks_collection.find_one({"_id": ObjectId(homework_id)})
            except Exception:
                homework_doc = None
        if not homework_doc and case_id:
            homework_doc = await homeworks_collection.find_one({"case_id": case_id}, sort=[("created_at", -1)])

        class_id = None
        class_name = (homework_doc or {}).get("class_name")
        year = (homework_doc or {}).get("year")

        class_ids = (homework_doc or {}).get("class_ids") or []
        if isinstance(class_ids, list) and len(class_ids) > 0:
            class_id = str(class_ids[0])

        resolved_classroom = None
        if class_id:
            try:
                resolved_classroom = await classrooms_collection.find_one({"_id": ObjectId(class_id)})
            except Exception:
                resolved_classroom = None

        # Legacy fallback: class_name may contain classroom ObjectId string.
        if not resolved_classroom and class_name:
            try:
                resolved_classroom = await classrooms_collection.find_one({"_id": ObjectId(str(class_name))})
            except Exception:
                resolved_classroom = None

        if resolved_classroom:
            class_id = str(resolved_classroom.get("_id"))
            class_name = resolved_classroom.get("name")
            year = resolved_classroom.get("year")

        classroom_label = None
        if class_name:
            classroom_label = f"{class_name} ({year})" if year else str(class_name)

        qna_doc = await qna_collection.find_one({"case_id": case_id}) if case_id else None
        latest_version = await versions_collection.find_one(
            {"caseId": case_id, "userId": user_id},
            sort=[("version", -1)]
        ) if case_id and user_id else None

        out.append({
            "id": str(sub["_id"]),
            "homework_id": homework_id,
            "case_id": case_id,
            "case_title": (case_doc or {}).get("title") or f"Case {case_id[:8]}",
            "case_image_url": (case_doc or {}).get("image_url", ""),
            "homework_type": (homework_doc or {}).get("homework_type", "Annotate"),
            "student_id": user_id,
            "status": sub.get("status", "submitted"),
            "score": sub.get("score"),
            "feedback": sub.get("feedback", ""),
            "rubric": sub.get("rubric", []),
            "notes": sub.get("notes"),
            "files": sub.get("files", []),
            "answers": sub.get("answers", []),
            "model_answers": build_model_answers((qna_doc or {}).get("questions", [])),
            "annotations": (latest_version or {}).get("annotations", []),
            "annotation_version": (latest_version or {}).get("version"),
            "max_points": int((homework_doc or {}).get("max_points") or 100),
            "published": bool(sub.get("published", False)),
            "published_at": to_iso(sub.get("published_at")),
            "class_id": class_id,
            "class_name": class_name,
            "year": year,
            "classroom": classroom_label,
            "updated_at": to_iso(sub.get("updated_at")),
            "created_at": to_iso(sub.get("created_at")),
        })

    return out


@router.post("/submissions/{submission_id}/grade")
async def grade_submission(submission_id: str, payload: GradeRequest):
    graded_at = now()
    result = await submissions_collection.update_one(
        {"_id": ObjectId(submission_id)},
        {"$set": {
            "score": payload.score,
            "rubric": payload.rubric,
            "feedback": payload.feedback,
            "status": "graded",
            "graded_at": graded_at,
            "updated_at": graded_at,
        }}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")

    return {
        "status": "graded",
        "score": payload.score,
        "rubric": payload.rubric,
        "feedback": payload.feedback,
        "updated_at": graded_at.isoformat(),
    }
