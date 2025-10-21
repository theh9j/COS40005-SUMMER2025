from fastapi import APIRouter, HTTPException
from bson import ObjectId
from db.connection import users_collection, approvals_collection
from core.security import decode_access_token, create_access_token
from models.models import UserUpdate 

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

@router.patch("/update")
async def update_user_info(token: str, update_data: UserUpdate):
    # Decode token and get user ID
    user_data = decode_access_token(token)
    if not user_data or "user_id" not in user_data:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id_str = user_data["user_id"]
    try:
        user_id = ObjectId(user_id_str)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid user ID")

    # Update the user in the database
    update_fields = update_data.model_dump()
    result = await users_collection.update_one(
        {"_id": user_id},
        {"$set": update_fields}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    # Get the fully updated user from DB
    updated_user = await users_collection.find_one({"_id": user_id})

    # Create a NEW token with the updated info
    new_token_data = {
        "user_id": str(updated_user["_id"]),
        "firstName": updated_user["firstName"],
        "lastName": updated_user["lastName"],
        "email": updated_user["email"],
        "role": updated_user.get("role", "student")
    }

    new_token = create_access_token(new_token_data)

    # Return the new token
    return {"message": "User updated successfully", "token": new_token}