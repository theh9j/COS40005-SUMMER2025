from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Body
from bson import ObjectId
from datetime import datetime
from typing import Optional
from pathlib import Path
import shutil

from db.connection import (
    homeworks_collection,
    homework_targets_collection,
    homework_uploads_collection,
    homework_questions_collection,
    submissions_collection,
)
from models.models import (
    HomeworkCreate,
    HomeworkOut,
    SubmissionCreate,
    SubmissionOut,
    GradeRequest,
)

router = APIRouter(prefix="/api/instructor/homeworks", tags=["Homeworks"])
submissions_router = APIRouter(prefix="/api", tags=["Submissions"])

UPLOAD_ROOT = Path("uploads")

def now():
    return datetime.utcnow()


# ====================================================
# Instructor: Create Homework
# ====================================================

@router.post("/", response_model=dict)
async def create_homework(payload: HomeworkCreate):
    timestamp = now()

    password = payload.password or payload.requirement_id

    hw_doc = {
        "case_id": payload.case_id,
        "due_at": payload.due_at,
        "instructions": payload.instructions,
        "checklist": payload.checklist or [],
        "status": "active",
        "created_at": timestamp,
        "password": password,
        "requirement_id": payload.requirement_id,
        "class_name": payload.class_name,
        "year": payload.year,
    }

    result = await homeworks_collection.insert_one(hw_doc)
    hw_id = str(result.inserted_id)

    # Target audience
    target_doc = {"homework_id": hw_id}

    if payload.audience == "all":
        target_doc["all_flag"] = True
    elif payload.audience == "group":
        target_doc["group_name"] = payload.group_name
    elif payload.audience == "list":
        target_doc["student_ids"] = payload.student_ids or []

    await homework_targets_collection.insert_one(target_doc)

    # Uploads
    if payload.uploads:
        await homework_uploads_collection.insert_many([
            {"homework_id": hw_id, **u.model_dump()}
            for u in payload.uploads
        ])

    # Questions
    if payload.questions:
        await homework_questions_collection.insert_many([
            {
                "homework_id": hw_id,
                "idx": idx,
                **q.model_dump()
            }
            for idx, q in enumerate(payload.questions)
        ])

    return {"homework_id": hw_id, "status": "active"}


# ====================================================
# Student: Get Homework by Case
# ====================================================

@router.get("/by-case", response_model=HomeworkOut)
async def homework_by_case(
    caseId: str = Query(...),
    userId: str = Query(...)
):
    hw = await homeworks_collection.find_one({
        "case_id": caseId,
        "status": "active"
    })

    if not hw:
        return HomeworkOut(
            homework_id="",
            case_id=caseId,
            status="none",
            due_at="",
            assigned=False,
            instructions=None,
            uploads=[],
            questions=[]
        )

    hw_id = str(hw["_id"])

    # Assignment check
    target = await homework_targets_collection.find_one({
        "homework_id": hw_id
    })

    assigned = False

    if target:
        if target.get("all_flag"):
            assigned = True
        elif userId in (target.get("student_ids") or []):
            assigned = True
        elif target.get("group_name"):
            assigned = True

    uploads = await homework_uploads_collection.find(
        {"homework_id": hw_id}
    ).to_list(length=100)

    for u in uploads:
        u.pop("_id", None)
        u.pop("homework_id", None)

    questions = await homework_questions_collection.find(
        {"homework_id": hw_id}
    ).sort("idx", 1).to_list(length=200)

    for q in questions:
        q.pop("_id", None)
        q.pop("homework_id", None)
        q.pop("idx", None)

    return HomeworkOut(
        homework_id=hw_id,
        case_id=hw["case_id"],
        status=hw["status"],
        due_at=hw.get("due_at"),
        assigned=assigned,
        instructions=hw.get("instructions"),
        uploads=uploads,
        questions=questions
    )

@router.post("/upload")
async def upload_homework_file(
    file: UploadFile = File(...),
    homeworkId: str = Query(...),
    userId: str = Query(...)  # instructor ID
):
    # Validate homework
    hw = await homeworks_collection.find_one({"_id": ObjectId(homeworkId)})
    if not hw:
        raise HTTPException(status_code=404, detail="Homework not found")

    # Path: uploads/{userId}/homeworks/{homeworkId}/
    hw_dir = UPLOAD_ROOT / userId / "homeworks" / homeworkId
    hw_dir.mkdir(parents=True, exist_ok=True)

    safe_name = Path(file.filename).name
    file_path = hw_dir / safe_name

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    url = f"/uploads/{userId}/homeworks/{homeworkId}/{safe_name}"

    await homework_uploads_collection.insert_one({
        "homework_id": homeworkId,
        "owner_id": userId,
        "name": safe_name,
        "url": url,
        "type": file.content_type or "application/octet-stream",
        "size": file_path.stat().st_size
    })

    return {
        "name": safe_name,
        "url": url,
        "type": file.content_type,
        "size": file_path.stat().st_size
    }
# ====================================================
# Student: Submission Endpoints (migrated from submissions.py)
# ====================================================

@submissions_router.post("/submissions/upload")
async def upload_submission_file(
    file: UploadFile = File(...),
    homeworkId: str = Query(...),
    userId: str = Query(...)  # student ID
):
    # Path: uploads/{userId}/submissions/{homeworkId}/
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
        "size": file_path.stat().st_size
    }


@submissions_router.get("/submissions/mine", response_model=SubmissionOut)
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
        updated_at=sub.get("updated_at").isoformat() if sub.get("updated_at") else None
    )


@submissions_router.post("/submissions", response_model=SubmissionOut)
async def create_or_update_submission(
    homeworkId: str = Query(...),
    caseId: str = Query(...),
    userId: str = Query(...),
    payload: SubmissionCreate = Body(...)
):
    timestamp = now()

    # Validate homework
    hw = await homeworks_collection.find_one({
        "_id": ObjectId(homeworkId)
    })

    if not hw:
        raise HTTPException(status_code=404, detail="Homework not found")

    if hw.get("status") != "active":
        raise HTTPException(status_code=400, detail="Homework inactive")

    due_at = hw.get("due_at")
    if due_at and datetime.fromisoformat(due_at) < timestamp:
        raise HTTPException(status_code=400, detail="Deadline passed")

    # Validate assignment
    target = await homework_targets_collection.find_one({
        "homework_id": homeworkId
    })

    assigned = False
    if target:
        if target.get("all_flag"):
            assigned = True
        elif userId in (target.get("student_ids") or []):
            assigned = True
        elif target.get("group_name"):
            assigned = True

    if not assigned:
        raise HTTPException(status_code=403, detail="Not assigned")

    files_list = [f.model_dump() for f in payload.files] if payload.files else []
    answers_list = [a.model_dump() for a in payload.answers] if payload.answers else []

    update_doc = {
        "homework_id": homeworkId,
        "case_id": caseId,
        "user_id": userId,
        "notes": payload.notes,
        "files": files_list,
        "answers": answers_list,
        "status": "submitted",
        "updated_at": timestamp
    }

    existing = await submissions_collection.find_one({
        "homework_id": homeworkId,
        "user_id": userId
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
        updated_at=timestamp.isoformat()
    )


@submissions_router.post("/submissions/{submission_id}/grade")
async def grade_submission(submission_id: str, payload: GradeRequest):
    result = await submissions_collection.update_one(
        {"_id": ObjectId(submission_id)},
        {"$set": {
            "score": payload.score,
            "rubric": payload.rubric,
            "feedback": payload.feedback,
            "status": "graded",
            "graded_at": now(),
            "updated_at": now()
        }}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")

    return {"status": "graded", "score": payload.score}
