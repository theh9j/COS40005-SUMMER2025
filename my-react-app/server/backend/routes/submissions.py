from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Body
from fastapi.responses import FileResponse
from bson import ObjectId
from datetime import datetime
from typing import Optional
from pathlib import Path
from uuid import uuid4
import os
import shutil

from db.connection import submissions_collection
from models.models import SubmissionCreate, SubmissionOut, GradeRequest

router = APIRouter(prefix="/api", tags=["Submissions"])

# ===============================
# Utilities
# ===============================

def now():
    return datetime.utcnow()

# 👇 Root uploads directory only
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ===============================
# File Upload
# ===============================

@router.post("/upload")
async def upload_submission_file(
    file: UploadFile = File(...),
    caseId: str = Query(...),
    userId: str = Query(...),
):
    try:
        # 👇 uploads/{userId}
        user_dir = os.path.join(UPLOAD_DIR, userId)
        os.makedirs(user_dir, exist_ok=True)

        # Secure filename
        safe_name = Path(file.filename).name
        unique_name = f"{caseId}_{uuid4().hex}_{safe_name}"
        file_path = os.path.join(user_dir, unique_name)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(file_path)

        return {
            "url": f"/api/files/{userId}/{unique_name}",
            "name": safe_name,
            "type": file.content_type or "application/octet-stream",
            "size": file_size
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===============================
# File Download
# ===============================

@router.get("/files/{userId}/{filename}")
async def download_submission_file(userId: str, filename: str):
    file_path = os.path.join(UPLOAD_DIR, userId, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path, filename=filename)


# ===============================
# Student: Get My Submission
# ===============================

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
        return SubmissionOut(
            submission_id="",
            status="none"
        )

    return SubmissionOut(
        submission_id=str(sub["_id"]),
        status=sub.get("status", "submitted"),
        score=sub.get("score"),
        notes=sub.get("notes"),
        files=sub.get("files"),
        answers=sub.get("answers"),
        updated_at=sub.get("updated_at").isoformat() if sub.get("updated_at") else None
    )


# ===============================
# Student: Create / Update Submission
# ===============================

@router.post("/submissions", response_model=SubmissionOut)
async def create_or_update_submission(
    homeworkId: str = Query(...),
    caseId: str = Query(...),
    userId: str = Query(...),
    payload: SubmissionCreate = Body(...)
):
    try:
        timestamp = now()

        existing = await submissions_collection.find_one({
            "homework_id": homeworkId,
            "user_id": userId
        })

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

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===============================
# Instructor: List Submissions
# ===============================

@router.get("/instructor/submissions")
async def list_submissions(
    caseId: Optional[str] = None,
    status: Optional[str] = None
):
    query = {}
    if caseId:
        query["case_id"] = caseId
    if status:
        query["status"] = status

    cursor = submissions_collection.find(query).sort("updated_at", -1)

    items = []
    async for s in cursor:
        items.append({
            "id": str(s["_id"]),
            "case_id": s["case_id"],
            "student_id": s["user_id"],
            "status": s.get("status", "submitted"),
            "score": s.get("score"),
            "updated_at": s.get("updated_at").isoformat() if s.get("updated_at") else None
        })

    return items


# ===============================
# Instructor: Grade Submission
# ===============================

@router.post("/submissions/{submission_id}/grade")
async def grade_submission(submission_id: str, payload: GradeRequest):
    try:
        obj_id = ObjectId(submission_id)

        result = await submissions_collection.update_one(
            {"_id": obj_id},
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

        return {
            "status": "graded",
            "score": payload.score
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))