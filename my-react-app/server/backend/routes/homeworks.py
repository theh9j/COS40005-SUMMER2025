from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from bson import ObjectId
from datetime import datetime

from db.connection import (
    homeworks_collection,
    homework_targets_collection,
    homework_uploads_collection,
    homework_questions_collection,
)
from models.models import HomeworkCreate, HomeworkOut

router = APIRouter(prefix="/api", tags=["Homework"])


# ===============================
# Utilities
# ===============================

def now():
    return datetime.utcnow()


# ===============================
# Instructor: Create Homework
# ===============================

@router.post("/instructor/homeworks")
async def create_homework(payload: HomeworkCreate):
    try:
        timestamp = now()

        # Main homework document
        hw_doc = {
            "case_id": payload.case_id,
            "due_at": payload.due_at,
            "instructions": payload.instructions,
            "checklist": payload.checklist or [],
            "status": "active",
            "created_at": timestamp,

            # Optional metadata
            "requirement_id": payload.requirement_id,
            "class_name": payload.class_name,
            "year": payload.year,
        }

        result = await homeworks_collection.insert_one(hw_doc)
        hw_id = str(result.inserted_id)

        # ===============================
        # Audience Target
        # ===============================

        target_doc = {"homework_id": hw_id}

        if payload.audience == "all":
            target_doc["all_flag"] = True

        elif payload.audience == "group":
            target_doc["group_name"] = payload.group_name

        elif payload.audience == "list":
            target_doc["student_ids"] = payload.student_ids or []

        await homework_targets_collection.insert_one(target_doc)

        # ===============================
        # Uploads
        # ===============================

        if payload.uploads:
            await homework_uploads_collection.insert_many([
                {
                    "homework_id": hw_id,
                    **upload.model_dump()
                }
                for upload in payload.uploads
            ])

        # ===============================
        # Questions (ordered)
        # ===============================

        if payload.questions:
            await homework_questions_collection.insert_many([
                {
                    "homework_id": hw_id,
                    "idx": index,
                    **question.model_dump()
                }
                for index, question in enumerate(payload.questions)
            ])

        return {
            "homework_id": hw_id,
            "status": "active"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===============================
# Student: Get Homework By Case
# ===============================

@router.get("/homeworks/by-case", response_model=HomeworkOut)
async def homework_by_case(
    caseId: str = Query(...),
    userId: str = Query(...)
):
    try:
        # Find active homework
        hw = await homeworks_collection.find_one({
            "case_id": caseId,
            "status": "active"
        })

        if not hw:
            return HomeworkOut(
                homework_id="",
                case_id=caseId,
                status="active",
                due_at="",
                assigned=False,
                instructions=None,
                uploads=[],
                questions=[]
            )

        hw_id = str(hw["_id"])

        # ===============================
        # Check Audience
        # ===============================

        target = await homework_targets_collection.find_one({
            "homework_id": hw_id
        })

        assigned = False

        if target:
            if target.get("all_flag"):
                assigned = True

            elif target.get("group_name"):
                # If you later implement groups, check membership here
                assigned = True

            elif userId in (target.get("student_ids") or []):
                assigned = True

        # ===============================
        # Fetch Uploads
        # ===============================

        uploads = await homework_uploads_collection.find({
            "homework_id": hw_id
        }).to_list(length=100)

        for u in uploads:
            u.pop("_id", None)
            u.pop("homework_id", None)

        # ===============================
        # Fetch Questions (ordered)
        # ===============================

        questions = await homework_questions_collection.find({
            "homework_id": hw_id
        }).sort("idx", 1).to_list(length=200)

        for q in questions:
            q.pop("_id", None)
            q.pop("homework_id", None)
            q.pop("idx", None)

        return HomeworkOut(
            homework_id=hw_id,
            case_id=hw["case_id"],
            status=hw.get("status", "active"),
            due_at=hw.get("due_at", ""),
            assigned=assigned,
            instructions=hw.get("instructions"),
            uploads=uploads,
            questions=questions
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))