from fastapi import APIRouter, HTTPException
from bson import ObjectId
from db.connection import users_collection, approvals_collection
from models.models import User, Approval

router = APIRouter(prefix="/api/admin", tags=["Admin"])

async def get_instructor_status(user):
    if user.get("role") != "instructor":
        return None
    approval = await approvals_collection.find_one({"id": str(user["_id"])})
    if approval:
        return approval.get("status") == "verified"
    return False


# 🔹 GET all users
@router.get("/users")
async def get_all_users():
    users_cursor = users_collection.find({})
    users = []
    async for user in users_cursor:
        verified = await get_instructor_status(user)
        users.append({
            "id": str(user["_id"]),
            "firstName": user.get("firstName", ""),
            "lastName": user.get("lastName", ""),
            "email": user.get("email", ""),
            "role": user.get("role", ""),
            "instructorVerified": verified,
            "active": user.get("suspension", False) in [0, False],
        })
    return users


@router.post("/users/{user_id}/role")
async def update_role(user_id: str, data: dict):
    new_role = data.get("role")
    if new_role not in ["student", "instructor", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    prev_role = user.get("role")

    # update role in users collection
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": new_role}}
    )

    # handle instructor approval logic
    if new_role == "instructor":
        existing_approval = await approvals_collection.find_one({"id": user_id})
        if not existing_approval:
            approval = Approval(id=user_id)
            await approvals_collection.insert_one(approval.model_dump())
    elif prev_role == "instructor" and new_role != "instructor":
        await approvals_collection.delete_one({"id": user_id})

    return {"message": f"Role updated to {new_role}", "role": new_role}


@router.post("/users/{user_id}/verify-instructor")
async def verify_instructor(user_id: str, data: dict):
    verified = bool(data.get("verified", False))
    user = await users_collection.find_one({"_id": ObjectId(user_id)})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("role") != "instructor":
        raise HTTPException(status_code=400, detail="User is not an instructor")

    approval = await approvals_collection.find_one({"id": str(user_id)})

    if verified:
        if approval:
            await approvals_collection.update_one({"id": str(user_id)}, {"$set": {"status": "verified"}})
        else:
            await approvals_collection.insert_one({"id": str(user_id), "status": "verified"})
        message = "Instructor verified"
    else:
        if approval:
            await approvals_collection.update_one({"id": str(user_id)}, {"$set": {"status": "pending"}})
        else:
            await approvals_collection.insert_one({"id": str(user_id), "status": "pending"})
        message = "Verification revoked"

    return {"message": message, "verified": verified}


@router.post("/users/{user_id}/active")
async def set_active(user_id: str, data: dict):
    active = bool(data.get("active", True))

    suspension_value = 0 if active else 1

    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"suspension": suspension_value}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    msg = "Account reactivated" if active else "Account deactivated"
    return {"message": msg, "active": active}
