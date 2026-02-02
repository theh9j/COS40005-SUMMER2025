import os
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, UploadFile, Form, HTTPException
from bson import ObjectId

from db.connection import cases_collection

router = APIRouter(prefix="/api/instructor", tags=["Cases"])

BASE_UPLOAD_DIR = Path("uploads") / "cases"

def now_iso():
    return datetime.now(timezone.utc).isoformat()

@router.post("/cases")
async def create_case(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    image: UploadFile = Form(...),
):
    """
    Create a new Case (title + optional description + image).
    Save image to uploads/cases/ and return case_id + image_url.
    """
    if not title.strip():
        raise HTTPException(status_code=400, detail="Title is required")

    if not image:
        raise HTTPException(status_code=400, detail="Image file is required")

    # ensure folder exists
    BASE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    case_id = str(ObjectId())

    # file extension
    _, ext = os.path.splitext(image.filename or "")
    ext = ext.lower() if ext else ".png"

    filename = f"{case_id}{ext}"
    file_path = BASE_UPLOAD_DIR / filename

    # save file
    with open(file_path, "wb") as f:
        f.write(await image.read())

    image_url = f"http://127.0.0.1:8000/uploads/cases/{filename}"

    doc = {
        "_id": ObjectId(case_id),
        "title": title.strip(),
        "description": (description.strip() if description else None),
        "image_url": image_url,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "image_filename": filename,

    }

    await cases_collection.insert_one(doc)

    return {
        "case_id": case_id,
        "image_url": image_url,
        "title": doc["title"],
        "description": doc["description"],
    }

@router.get("/cases")
async def list_cases(limit: int = 50):
    """
    Optional: list cases for management page
    """
    items = await cases_collection.find({}).sort("created_at", -1).to_list(limit)
    out = []
    for c in items:
        out.append({
            "case_id": str(c["_id"]),
            "title": c.get("title"),
            "description": c.get("description"),
            "image_url": c.get("image_url"),
            "created_at": c.get("created_at"),
        })
    return out

from glob import glob

@router.delete("/cases/{case_id}")
async def delete_case(case_id: str):
    """
    Delete a case by id, also delete its uploaded image file if exists.
    """
    try:
        oid = ObjectId(case_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid case_id")

    case = await cases_collection.find_one({"_id": oid})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Remove DB doc first
    await cases_collection.delete_one({"_id": oid})

    # Try delete image file
    # Preferred: delete by stored filename
    filename = case.get("image_filename")
    if filename:
        file_path = BASE_UPLOAD_DIR / filename
        try:
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            # Don't fail deletion if file missing
            print("Warning: failed to delete case image:", e)
    else:
        # Fallback: delete any file matching {case_id}.*
        pattern = str(BASE_UPLOAD_DIR / f"{case_id}.*")
        for p in glob(pattern):
            try:
                Path(p).unlink()
            except Exception as e:
                print("Warning: failed to delete image:", e)

    return {"ok": True, "deleted_case_id": case_id}

