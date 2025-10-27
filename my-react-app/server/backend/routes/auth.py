from fastapi import APIRouter, HTTPException
from db.connection import users_collection, approvals_collection
from models.models import User, Approval
from datetime import datetime
from pathlib import Path
from core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/signup")
async def signup(user: User):
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    banned_user = await users_collection.find_one({"suspension": 1})
    if banned_user:
        raise HTTPException(status_code=400, detail="Account suspended")

    user_dict = user.model_dump()
    user_dict["password"] = hash_password(user.password)
    user_dict["created_at"] = datetime.now()

    result = await users_collection.insert_one(user_dict)
    new_user_id = result.inserted_id
    new_user = await users_collection.find_one({"_id": new_user_id})

    user_storage = Path("uploads/" + str(new_user_id))
    user_storage.mkdir(parents=True, exist_ok=True)

    token_data = {
        "user_id": str(new_user_id),
        "firstName": new_user["firstName"],
        "lastName": new_user["lastName"],
        "email": new_user["email"],
        "role": new_user["role"]
    }

    if new_user["role"] == "instructor":
        user_id_str = str(new_user_id)
        existing_approval = await approvals_collection.find_one({"id": user_id_str})
        if not existing_approval:
            approval = Approval(id=user_id_str, status="pending")
            await approvals_collection.insert_one(approval.model_dump())

    token = create_access_token(token_data)
    return {"message": "User created", "token": token}


@router.post("/login")
async def login(data: dict):
    email = data.get("email")
    password = data.get("password")

    user = await users_collection.find_one({"email": email})
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id_str = str(user["_id"])
    token_data = {
        "user_id": user_id_str,
        "firstName": user["firstName"],
        "lastName": user["lastName"],
        "email": user["email"],
        "role": user.get("role", "student")
    }

    token = create_access_token(token_data)
    return {"message": "Login successful", "token": token}