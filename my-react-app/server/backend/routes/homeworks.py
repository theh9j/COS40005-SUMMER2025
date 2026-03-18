from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from bson import ObjectId
from datetime import datetime
from typing import Optional
from pathlib import Path
import shutil
import time

from db.connection import (
    homeworks_collection,
    users_collection,
    classrooms_collection,
    cases_collection,
    qna_collection,
    annot_collection,
)

router = APIRouter(prefix="/api/instructor/homeworks", tags=["Homeworks"])

UPLOAD_ROOT = Path("uploads")

def now():
    return datetime.utcnow()


# ====================================================
# Instructor: Create Homework
# ====================================================

# ====================================================
# Instructor: Create Homework
# ====================================================

@router.post("/", response_model=dict)
async def create_homework(payload: dict):
    # Accept both frontend payload styles:
    # 1) New builder payload with `newCase`
    # 2) Existing dashboard payload with `case_id`
    new_case = payload.get("newCase", {})
    case_id = payload.get("case_id")
    due_at_iso = payload.get("dueAtISO") or payload.get("due_at")
    audience_raw = (payload.get("audience") or "all").strip().lower()
    instructions = payload.get("instructions")
    auto_checklist = payload.get("autoChecklist") or payload.get("checklist") or []
    suggested_focus_tags = payload.get("suggestedFocusTags") or []
    homework_type = payload.get("homeworkType") or "Annotate"
    reference_uploads = payload.get("referenceUploads") or payload.get("uploads") or []
    questions = payload.get("questions") or []
    password = payload.get("password") or ""
    class_ids = payload.get("classIds") or payload.get("class_ids") or []
    class_labels = payload.get("classLabels") or payload.get("class_labels") or []
    max_points = payload.get("maxPoints")

    class_ids = [str(cid) for cid in class_ids if cid]
    class_labels = [str(label) for label in class_labels if label]

    # If labels were not provided, resolve them from the classroom records
    if not class_labels and class_ids:
        valid_ids = []
        for cid in class_ids:
            try:
                valid_ids.append(ObjectId(cid))
            except Exception:
                continue

        if valid_ids:
            cursor = classrooms_collection.find({"_id": {"$in": valid_ids}})
            async for cls in cursor:
                name = cls.get("name")
                year = cls.get("year")
                if name:
                    if year:
                        class_labels.append(f"{name} ({year})")
                    else:
                        class_labels.append(name)

    if not case_id and not new_case.get("title"):
        raise HTTPException(status_code=400, detail="Case title is required")
    if not due_at_iso:
        raise HTTPException(status_code=400, detail="Due date is required")

    audience = "Classrooms" if audience_raw in ("classroom", "classrooms") else "All Students"

    # Create case when payload uses `newCase`, otherwise attach homework to provided case_id.
    if not case_id:
        case_doc = {
            "title": new_case["title"],
            "description": new_case.get("description"),
            "case_type": new_case.get("type", "Cardiology"),
            "homework_type": homework_type,
            "created_at": now(),
        }
        if new_case.get("imagePreviewUrl"):
            case_doc["image_url"] = new_case.get("imagePreviewUrl")

        case_result = await cases_collection.insert_one(case_doc)
        case_id = str(case_result.inserted_id)

    if max_points is None:
        if isinstance(questions, list) and len(questions) > 0:
            max_points = sum(int(q.get("points", 0) or 0) for q in questions)
        else:
            max_points = 100

    homework_doc = {
        "case_id": case_id,
        "homework_type": homework_type,
        "focus": suggested_focus_tags or auto_checklist,
        "audience": audience,
        "due_at": due_at_iso,
        "status": "active",
        "max_points": int(max_points),
        "created_at": now(),
    }

    if audience == "Classrooms":
        if class_ids:
            homework_doc["class_ids"] = class_ids
        if class_labels:
            homework_doc["class_labels"] = class_labels
        if password:
            homework_doc["password"] = password

    if instructions is not None:
        homework_doc["instructions"] = instructions

    homework_result = await homeworks_collection.insert_one(homework_doc)

    if homework_type == "Q&A":
        qna_doc = {
            "case_id": case_id,
            "instructions": instructions,
            "total_questions": len(questions),
            "questions": questions,
        }
        await qna_collection.insert_one(qna_doc)
    elif homework_type == "Annotate":
        annot_doc = {
            "case_id": case_id,
            "annotation_image": new_case.get("imagePreviewUrl", ""),
            "reference_images": [u.get("url", "") for u in reference_uploads] if reference_uploads else [],
        }
        await annot_collection.insert_one(annot_doc)

    return {"case_id": case_id, "homework_id": str(homework_result.inserted_id)}


# ====================================================
# Student: Get Homework by Case
# ====================================================

@router.get("/by-case", response_model=dict)
async def homework_by_case(
    caseId: str = Query(...),
    userId: str = Query(...)
):
    # Get case for page context even when homework is inaccessible.
    case = None
    try:
        case = await cases_collection.find_one({"_id": ObjectId(caseId)})
    except Exception:
        case = await cases_collection.find_one({"case_id": caseId})
    if case:
        case["_id"] = str(case["_id"])
        case.pop("created_at", None)

    # Get latest homework by case.
    hw = await homeworks_collection.find_one(
        {"case_id": caseId},
        sort=[("created_at", -1)]
    )

    if not hw:
        return {
            "case": case,
            "homework": None,
            "qna": None,
            "annot": None,
            "assigned": False
        }

    # Get QNA if exists
    qna = await qna_collection.find_one({"case_id": caseId})
    if qna:
        qna.pop("_id", None)

    # Get Annot if exists
    annot = await annot_collection.find_one({"case_id": caseId})
    if annot:
        annot.pop("_id", None)

    # Assignment check
    assigned = False
    is_instructor_like = False
    try:
        user_doc = await users_collection.find_one({"_id": ObjectId(userId)})
        if user_doc and str(user_doc.get("role", "")).lower() in ("instructor", "admin"):
            is_instructor_like = True
    except Exception:
        pass

    if is_instructor_like:
        assigned = True

    audience = (hw.get("audience") or "All Students")
    audience_norm = str(audience).strip().lower()

    if not assigned and audience_norm in ("all students", "all"):
        assigned = True
    elif not assigned and audience_norm in ("classrooms", "classroom"):
        # Check if user is in any selected classroom.
        class_ids = [str(x) for x in hw.get("class_ids", []) if x]
        if class_ids:
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
                    if userId in member_ids:
                        assigned = True
                        break

        if not assigned:
            classroom = await classrooms_collection.find_one({
                "name": hw.get("class_name"),
                "year": hw.get("year")
            })
            if classroom:
                member_ids = [str(x) for x in classroom.get("members", [])]
                assigned = userId in member_ids

    hw["_id"] = str(hw["_id"])
    hw.pop("created_at", None)

    # If not assigned to this homework, hide homework payload while still returning case.
    if not assigned:
        return {
            "case": case,
            "homework": None,
            "qna": None,
            "annot": None,
            "assigned": False
        }

    return {
        "case": case,
        "homework": hw,
        "qna": qna,
        "annot": annot,
        "assigned": assigned
    }


@router.put("/by-case/{case_id}", response_model=dict)
async def update_homework_by_case(case_id: str, payload: dict):
    hw = await homeworks_collection.find_one(
        {"case_id": case_id},
        sort=[("created_at", -1)]
    )

    if not hw:
        raise HTTPException(status_code=404, detail="Homework not found for case")

    update_doc = {}
    unset_doc = {}

    if payload.get("instructions") is not None:
        update_doc["instructions"] = payload.get("instructions")
    if payload.get("due_at") is not None:
        update_doc["due_at"] = payload.get("due_at")
    if payload.get("max_points") is not None:
        try:
            update_doc["max_points"] = int(payload.get("max_points"))
        except Exception:
            raise HTTPException(status_code=400, detail="max_points must be a number")

    audience_payload = payload.get("audience")
    if audience_payload is not None:
        audience_norm = str(audience_payload).strip().lower()
        update_doc["audience"] = "Classrooms" if audience_norm in ("classroom", "classrooms") else "All Students"

    class_ids_payload = payload.get("class_ids") or payload.get("classIds")
    class_labels_payload = payload.get("class_labels") or payload.get("classLabels")
    class_name_payload = payload.get("class_name") or payload.get("className")
    year_payload = payload.get("year")
    password_payload = payload.get("password")

    if class_ids_payload is not None:
        class_ids = [str(cid) for cid in class_ids_payload if cid]
        update_doc["class_ids"] = class_ids

        resolved_labels = []
        valid_ids = []
        for class_id in class_ids:
            try:
                valid_ids.append(ObjectId(class_id))
            except Exception:
                continue

        if valid_ids:
            cursor = classrooms_collection.find({"_id": {"$in": valid_ids}})
            async for cls in cursor:
                label = f"{cls.get('name')} ({cls.get('year')})"
                resolved_labels.append(label)

        if resolved_labels:
            update_doc["class_labels"] = resolved_labels

    if class_labels_payload is not None:
        update_doc["class_labels"] = [str(label) for label in class_labels_payload if label]

    if password_payload is not None:
        password_text = str(password_payload).strip() if password_payload is not None else ""
        if password_text:
            update_doc["password"] = password_text
        else:
            unset_doc["password"] = ""

    effective_audience = update_doc.get("audience", hw.get("audience"))
    if effective_audience == "All Students":
        unset_doc["class_ids"] = ""
        unset_doc["class_labels"] = ""
        unset_doc["password"] = ""

    if effective_audience == "Classrooms":
        if update_doc.get("class_ids") == []:
            unset_doc["class_ids"] = ""
        if update_doc.get("class_labels") == []:
            unset_doc["class_labels"] = ""

    update_ops = {}
    if update_doc:
        update_ops["$set"] = update_doc
    if unset_doc:
        update_ops["$unset"] = unset_doc

    if update_ops:
        await homeworks_collection.update_one({"_id": hw["_id"]}, update_ops)

    return {"status": "ok", "homework_id": str(hw["_id"])}

@router.post("/upload")
async def upload_homework_file(
    file: UploadFile = File(...),
    caseId: str = Query(...),
    userId: str = Query(...)  # instructor ID
):
    """
    Upload an image file for annotation homework.
    Path: uploads/{userId}/cases/{filename}
    """
    if not file:
        raise HTTPException(status_code=400, detail="File is required")

    # Path: uploads/{userId}/cases/
    cases_dir = UPLOAD_ROOT / userId / "cases"
    cases_dir.mkdir(parents=True, exist_ok=True)

    # Generate filename with timestamp to avoid conflicts
    timestamp = int(time.time() * 1000)
    safe_name = Path(file.filename).name
    filename = f"{timestamp}_{safe_name}"
    file_path = cases_dir / filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

    # Return full URL and relative URL
    full_url = f"http://127.0.0.1:8000/uploads/{userId}/cases/{filename}"
    relative_url = f"/uploads/{userId}/cases/{filename}"

    return {
        "name": filename,
        "url": full_url,
        "relative_url": relative_url,
        "type": file.content_type,
        "size": file_path.stat().st_size,
        "filename": filename
    }