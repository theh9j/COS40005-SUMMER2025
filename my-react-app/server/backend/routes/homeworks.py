from fastapi import APIRouter, HTTPException, Query, UploadFile, File
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
)
from models.models import HomeworkCreate, HomeworkOut

router = APIRouter(prefix="/api/instructor/homeworks", tags=["Homeworks"])

UPLOAD_ROOT = Path("uploads")

def now():
    return datetime.utcnow()


# ====================================================
# Instructor: Create Homework
# ====================================================

@router.post("/", response_model=dict)
async def create_homework(payload: HomeworkCreate):
    timestamp = now()

    hw_doc = {
        "case_id": payload.case_id,
        "due_at": payload.due_at,
        "instructions": payload.instructions,
        "checklist": payload.checklist or [],
        "status": "active",
        "created_at": timestamp,
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