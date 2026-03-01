from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from bson import ObjectId
from db.connection import users_collection, approvals_collection
from core.security import decode_access_token, create_access_token
from models.models import UserUpdate
from datetime import datetime
from pathlib import Path
from uuid import uuid4
import os
import shutil

router = APIRouter(prefix="/api/user", tags=["User"])

# ===============================
# Constants
# ===============================

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_ROOT = BASE_DIR / "uploads"
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
MAX_FILE_SIZE_MB = 5


# ===============================
# Approval Status
# ===============================

@router.get("/approval-status")
async def get_approval_status(token: str):
    user_data = decode_access_token(token)
    if not user_data or "user_id" not in user_data:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = ObjectId(user_data["user_id"])
    user = await users_collection.find_one({"_id": user_id})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("role") != "instructor":
        return {"approval_status": None}

    approval_doc = await approvals_collection.find_one({"id": str(user_id)})

    if approval_doc:
        return {"approval_status": approval_doc.get("status")}

    return {"approval_status": "pending"}


# ===============================
# Update User Info (Text Fields)
# ===============================

@router.patch("/update")
async def update_user_info(token: str, update_data: UserUpdate):
    user_data = decode_access_token(token)
    if not user_data or "user_id" not in user_data:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = ObjectId(user_data["user_id"])

    update_fields = update_data.model_dump(exclude_unset=True)

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields provided")

    await users_collection.update_one(
        {"_id": user_id},
        {"$set": update_fields}
    )

    updated_user = await users_collection.find_one({"_id": user_id})

    new_token_data = {
        "user_id": str(updated_user["_id"]),
        "firstName": updated_user["firstName"],
        "lastName": updated_user["lastName"],
        "email": updated_user["email"],
        "role": updated_user.get("role", "student"),
        "profile_photo": updated_user.get("profile_photo")
    }

    new_token = create_access_token(new_token_data)

    return {
        "message": "User updated successfully",
        "token": new_token
    }


# ===============================
# Upload Profile Photo
# ===============================

@router.post("/upload-profile-photo")
async def upload_profile_photo(token: str, file: UploadFile = File(...)):
    user_data = decode_access_token(token)
    if not user_data or "user_id" not in user_data:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id_str = user_data["user_id"]
    user_id = ObjectId(user_id_str)

    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid image type")

    # Validate file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    # Create folder: uploads/{userId}/profile_photos
    user_folder = os.path.join(UPLOAD_ROOT, user_id_str, "profile_photos")
    os.makedirs(user_folder, exist_ok=True)

    # Secure filename
    safe_name = Path(file.filename).name
    unique_name = f"{uuid4().hex}_{safe_name}"
    file_path = os.path.join(user_folder, unique_name)

    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(contents)

    # Optional: delete old profile photo
    user = await users_collection.find_one({"_id": user_id})
    old_photo = user.get("profile_photo")

    if old_photo:
        old_path = old_photo.replace("/api/user/profile-photo/", "")
        full_old_path = os.path.join(UPLOAD_ROOT, old_path)
        if os.path.exists(full_old_path):
            try:
                os.remove(full_old_path)
            except:
                pass

    # Store relative path in DB
    relative_path = f"{user_id_str}/profile_photos/{unique_name}"

    await users_collection.update_one(
        {"_id": user_id},
        {"$set": {
            "profile_photo": relative_path,
            "updated_at": datetime.utcnow()
        }}
    )

    return {
        "message": "Profile photo uploaded",
        "profile_photo_url": f"/api/user/profile-photo/{relative_path}"
    }


# ===============================
# Serve Profile Photo
# ===============================

@router.get("/profile-photo/{path:path}")
async def serve_profile_photo(path: str):
    file_path = UPLOAD_ROOT / path

    if not file_path.exists():
        print("DEBUG PATH:", file_path)  # optional debug
        raise HTTPException(status_code=404, detail="Image not found")

    return FileResponse(str(file_path))