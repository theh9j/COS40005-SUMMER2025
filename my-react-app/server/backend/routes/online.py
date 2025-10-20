from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from bson import ObjectId
from db.connection import users_collection

router = APIRouter(prefix="/activity", tags=["Activity"])

@router.post("/ping/{user_id}")
async def user_ping(user_id: str):
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"last_active": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Heartbeat received"}