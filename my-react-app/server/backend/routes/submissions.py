from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Body
from fastapi.responses import FileResponse
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional, List
import os
import shutil

from db.connection import (
    submissions_collection, homeworks_collection
)
from models.submission import SubmissionCreate, SubmissionOut, GradeRequest

router = APIRouter(prefix="/api", tags=["Submissions"])

def now_iso():
    return datetime.now(timezone.utc).isoformat()

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "uploads/submissions"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ---------- File upload endpoint ----------
@router.post("/upload")
async def upload_submission_file(
    file: UploadFile = File(...),
    caseId: str = Query(...),
    userId: str = Query(...),
    type: str = Query("submission")
):
    """Upload a file for homework submission"""
    try:
        print(f"[DEBUG] File upload: {file.filename}, userId={userId}, caseId={caseId}, type={file.content_type}")
        
        # Create user-specific directory
        user_upload_dir = os.path.join(UPLOAD_DIR, userId)
        os.makedirs(user_upload_dir, exist_ok=True)
        
        # Save file with a unique name to prevent conflicts
        file_path = os.path.join(user_upload_dir, f"{caseId}_{file.filename}")
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return file metadata
        file_size = os.path.getsize(file_path)
        return {
            "url": f"/api/files/{userId}/{caseId}/{file.filename}",
            "name": file.filename,
            "type": file.content_type or "application/octet-stream",
            "size": file_size
        }
    except Exception as e:
        print(f"[ERROR] File upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

# ---------- File download endpoint ----------
@router.get("/files/{userId}/{caseId}/{filename}")
async def download_submission_file(userId: str, caseId: str, filename: str):
    """Download a submission file"""
    file_path = os.path.join(UPLOAD_DIR, userId, f"{caseId}_{filename}")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path, filename=filename)

# ---------- Student: my submission ----------
@router.get("/submissions/mine", response_model=SubmissionOut)
async def my_submission(homeworkId: str = Query(..., alias="homeworkId"),
                        userId: str = Query(..., alias="userId")):
    """Fetch student's submission for a specific homework"""
    try:
        print(f"[DEBUG] Fetching submission for user {userId}, homework {homeworkId}")
        
        sub = await submissions_collection.find_one({"homework_id": homeworkId, "user_id": userId})
        
        if not sub:
            print(f"[DEBUG] No submission found, returning 'none' status")
            return SubmissionOut(submission_id="", status="none")
        
        print(f"[DEBUG] Found submission: {sub}")
        
        # Convert MongoDB document to response model
        response_data = {
            "submission_id": str(sub["_id"]),
            "status": sub.get("status", "submitted"),
            "notes": sub.get("notes"),
            "files": sub.get("files"),
            "answers": sub.get("answers"),
            "score": sub.get("score"),
            "updated_at": sub.get("updated_at")
        }
        
        return SubmissionOut(**response_data)
    except Exception as e:
        print(f"[ERROR] Failed to fetch submission: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching submission: {str(e)}")

# ---------- Student: create/update submission ----------
@router.post("/submissions", response_model=SubmissionOut)
async def create_or_update_submission(
    homeworkId: str = Query(..., alias="homeworkId"),
    caseId: str = Query(..., alias="caseId"),
    userId: str = Query(..., alias="userId"),
    payload: SubmissionCreate = Body(default=None)
):
    """Create or update homework submission with notes and files"""
    try:
        # Note: We don't require homework to exist in DB (supports mock homework)
        # In production, you can uncomment the validation below:
        # hw = await homeworks_collection.find_one({"_id": ObjectId(homeworkId)})
        # if not hw:
        #     raise HTTPException(status_code=404, detail="Homework not found")

        print(f"[DEBUG] Creating/updating submission for user {userId}, homework {homeworkId}")
        print(f"[DEBUG] Payload: {payload}")

        # Look for existing submission
        sub = await submissions_collection.find_one({"homework_id": homeworkId, "user_id": userId})
        
        # Convert Pydantic models to dictionaries for MongoDB
        files_list = None
        if payload and payload.files:
            files_list = [file.model_dump() if hasattr(file, 'model_dump') else file.dict() for file in payload.files]
        
        answers_list = None
        if payload and payload.answers:
            answers_list = [ans.model_dump() if hasattr(ans, 'model_dump') else ans.dict() for ans in payload.answers]
        
        # Build submission document
        doc = {
            "homework_id": homeworkId,
            "case_id": caseId,
            "user_id": userId,
            "notes": payload.notes if payload and payload.notes else None,
            "files": files_list,
            "answers": answers_list,
            "status": "submitted",
            "updated_at": now_iso()
        }

        if not sub:
            # Create new submission
            doc["created_at"] = now_iso()
            print(f"[DEBUG] Creating new submission document")
            res = await submissions_collection.insert_one(doc)
            doc["submission_id"] = str(res.inserted_id)
            print(f"[DEBUG] Created submission with ID: {doc['submission_id']}")
        else:
            # Update existing submission
            print(f"[DEBUG] Updating existing submission {sub['_id']}")
            await submissions_collection.update_one(
                {"_id": sub["_id"]}, 
                {"$set": doc}
            )
            doc["submission_id"] = str(sub["_id"])
            print(f"[DEBUG] Updated submission {doc['submission_id']}")

        # Verify document was saved
        saved_doc = await submissions_collection.find_one({"_id": sub["_id"] if sub else ObjectId(doc["submission_id"])})
        print(f"[DEBUG] Verified saved document: {saved_doc}")

        return SubmissionOut(**doc)
    
    except Exception as e:
        print(f"[ERROR] Failed to create/update submission: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to save submission: {str(e)}")

# ---------- Instructor: list submissions ----------
@router.get("/instructor/submissions")
async def list_submissions(caseId: Optional[str] = None,
                           status: Optional[str] = None):
    q = {}
    if caseId: q["case_id"] = caseId
    if status: q["status"] = status
    cursor = submissions_collection.find(q).sort("updated_at", -1)
    items = []
    async for s in cursor:
        items.append({
            "id": str(s["_id"]),
            "case_id": s["case_id"],
            "case_title": "",  # FE có mock title, bạn có thể join từ bảng case nếu có
            "student_id": s["user_id"],
            "status": s.get("status","submitted"),
            "score": s.get("score"),
            "updated_at": s.get("updated_at")
        })
    return items

# ---------- Instructor: grade ----------
@router.post("/submissions/{submission_id}/grade")
async def grade_submission(submission_id: str, payload: GradeRequest):
    sub = await submissions_collection.find_one({"_id": ObjectId(submission_id)})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    await submissions_collection.update_one(
        {"_id": sub["_id"]},
        {"$set": {
            "score": payload.score,
            "rubric": payload.rubric,
            "feedback": payload.feedback,
            "status": "graded",
            "graded_at": now_iso()
        }}
    )
    return {"status": "graded", "score": payload.score, "graded_at": now_iso()}
