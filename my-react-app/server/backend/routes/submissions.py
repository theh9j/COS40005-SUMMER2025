from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Body
from fastapi.responses import FileResponse
from bson import ObjectId
from datetime import datetime
from pathlib import Path
from uuid import uuid4
import os
import shutil

from db.connection import (
    submissions_collection,
    homeworks_collection,
    homework_targets_collection,
)
from models.models import SubmissionCreate, SubmissionOut, GradeRequest

router = APIRouter(prefix="/api", tags=["Submissions"])

UPLOAD_ROOT = Path("uploads")
UPLOAD_ROOT.mkdir(exist_ok=True)


def now():
    return datetime.utcnow()


# ====================================================
# Upload File
# ====================================================

@router.post("/submissions/upload")
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


@router.get("/files/{userId}/homework/{filename}")
async def download_submission_file(userId: str, filename: str):
    file_path = UPLOAD_ROOT / userId / "homework" / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path)


# ====================================================
# Get My Submission
# ====================================================

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
        updated_at=sub.get("updated_at").isoformat() if sub.get("updated_at") else None
    )


# ====================================================
# Create / Update Submission (with validation)
# ====================================================

@router.post("/submissions", response_model=SubmissionOut)
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


# ====================================================
# Grade Submission
# ====================================================

@router.post("/submissions/{submission_id}/grade")
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