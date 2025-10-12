from fastapi import APIRouter, HTTPException
from db.connection import users_collection
from models.models import User
from core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/signup")
async def signup(user: User):
    existing = await users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_dict = user.model_dump()
    user_dict["password"] = hash_password(user.password)
    result = await users_collection.insert_one(user_dict)
    new_user = await users_collection.find_one({"_id": result.inserted_id})

    token = create_access_token({
        "user_id": str(new_user["_id"]),
        "firstName": new_user["firstName"],
        "lastName": new_user["lastName"],
        "email": new_user["email"],
        "role": new_user["role"]
    })
    return {"message": "User created", "token": token}


@router.post("/login")
async def login(data: dict):
    email = data.get("email")
    password = data.get("password")

    user = await users_collection.find_one({"email": email})
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "user_id": str(user["_id"]),
        "firstName": user["firstName"],
        "lastName": user["lastName"],
        "email": user["email"],
        "role": user.get("role", "student")
    })

    return {"message": "Login successful", "token": token}