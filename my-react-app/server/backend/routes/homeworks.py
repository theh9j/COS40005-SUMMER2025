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
    # Extract data from payload
    new_case = payload.get("newCase", {})
    due_at_iso = payload.get("dueAtISO", "")
    audience = payload.get("audience", "All Students")
    instructions = payload.get("instructions")
    auto_checklist = payload.get("autoChecklist", [])
    suggested_focus_tags = payload.get("suggestedFocusTags", [])
    homework_type = payload.get("homeworkType", "Q&A")
    reference_uploads = payload.get("referenceUploads", [])
    questions = payload.get("questions", [])
    password = payload.get("password", "")
    class_name = payload.get("className", "")
    year = payload.get("year", "")

    # Validate required fields
    if not new_case.get("title"):
        raise HTTPException(status_code=400, detail="Case title is required")
    if not due_at_iso:
        raise HTTPException(status_code=400, detail="Due date is required")
    if audience == "Classrooms":
        if not class_name:
            raise HTTPException(status_code=400, detail="Class name is required for classroom audience")

    # Create case document
    case_doc = {
        "title": new_case["title"],
        "description": new_case.get("description"),
        "type": new_case.get("type", "Cardiology"),
        "homework_type": homework_type,
        "created_at": now(),
    }

    # Handle case image URL if provided (imageFile can't be sent in JSON, so use imagePreviewUrl if available)
    if new_case.get("imagePreviewUrl"):
        case_doc["image_url"] = new_case.get("imagePreviewUrl")

    case_result = await cases_collection.insert_one(case_doc)
    case_id = str(case_result.inserted_id)

    # Create homework document
    homework_doc = {
        "case_id": case_id,
        "homework_type": homework_type,
        "focus": suggested_focus_tags or auto_checklist,
        "audience": audience,
        "due_at": due_at_iso,
        "status": "active",
        "created_at": now(),
    }

    if audience == "Classrooms":
        homework_doc["class_name"] = class_name
        homework_doc["year"] = year
        if password:
            homework_doc["password"] = password

    homework_result = await homeworks_collection.insert_one(homework_doc)

    # Create QNA document if Q&A homework
    if homework_type == "Q&A":
        qna_doc = {
            "case_id": case_id,
            "instructions": instructions,
            "total_questions": len(questions),
            "questions": questions,
        }
        await qna_collection.insert_one(qna_doc)

    # Create Annot document if Annotate homework
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
    # Get homework
    hw = await homeworks_collection.find_one({
        "case_id": caseId
    })

    if not hw:
        return {
            "case": None,
            "homework": None,
            "qna": None,
            "annot": None,
            "assigned": False
        }

    # Check if homework is active
    if hw.get("status") != "active":
        return {
            "case": None,
            "homework": None,
            "qna": None,
            "annot": None,
            "assigned": False
        }

    # Get case
    case = await cases_collection.find_one({"_id": ObjectId(caseId)})
    if case:
        case["_id"] = str(case["_id"])
        case.pop("created_at", None)

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
    audience = hw.get("audience", "All Students")

    if audience == "All Students":
        assigned = True
    elif audience == "Classrooms":
        # Check if user is in the classroom
        classroom = await classrooms_collection.find_one({
            "name": hw.get("class_name"),
            "year": hw.get("year")
        })
        if classroom and userId in classroom.get("students", []):
            assigned = True

    hw["_id"] = str(hw["_id"])
    hw.pop("created_at", None)

    return {
        "case": case,
        "homework": hw,
        "qna": qna,
        "annot": annot,
        "assigned": assigned
    }

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