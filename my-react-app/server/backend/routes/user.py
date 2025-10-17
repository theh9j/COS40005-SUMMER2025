from fastapi import APIRouter, HTTPException
from bson import ObjectId
from db.connection import users_collection, approvals_collection
from core.security import decode_access_token

router = APIRouter(prefix="/api/user", tags=["User"])

@router.get("/approval-status")
async def get_approval_status(token: str):
    user_data = decode_access_token(token)
    if not user_data or "user_id" not in user_data:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id_str = user_data["user_id"]
    try:
        user_id = ObjectId(user_id_str)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid user ID")


    user = await users_collection.find_one({"_id": user_id})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("role") != "instructor":
        return {"approval_status": None}

    approval_doc = await approvals_collection.find_one({"id": user_id_str})
    if approval_doc:
        return {"approval_status": approval_doc.get("status")}

    return {"approval_status": "pending"}