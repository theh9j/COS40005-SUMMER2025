
import os
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, UploadFile, Form, HTTPException
from bson import ObjectId

from db.connection import cases_collection, homeworks_collection

router = APIRouter(prefix="/api/instructor", tags=["Cases"])

BASE_UPLOAD_DIR = Path("uploads")

def now_iso():
    return datetime.now(timezone.utc).isoformat()

@router.post("/cases")
async def create_case(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    image: UploadFile = Form(...),
    case_type: Optional[str] = Form(None),
    homework_type: Optional[str] = Form("Annotate"),
    author_id: str = Form(...),
):
    """
    Create a new Case (title + optional description + image).
    Save image to uploads/{author_id}/cases/ and return case_id + image_url.
    - case_type: Medical specialty (Neurology, Cardiology, etc.)
    - homework_type: Type of homework (Q&A or Annotate). Defaults to Annotate.
    """
    if not title.strip():
        raise HTTPException(status_code=400, detail="Title is required")

    if not image:
        raise HTTPException(status_code=400, detail="Image file is required")

    # ensure folder exists
    user_cases_dir = BASE_UPLOAD_DIR / author_id / "cases"
    user_cases_dir.mkdir(parents=True, exist_ok=True)

    case_id = str(ObjectId())

    # file extension
    _, ext = os.path.splitext(image.filename or "")
    ext = ext.lower() if ext else ".png"

    filename = f"{case_id}{ext}"
    file_path = user_cases_dir / filename

    # save file
    with open(file_path, "wb") as f:
        f.write(await image.read())

    image_url = f"http://127.0.0.1:8000/uploads/{author_id}/cases/{filename}"

    doc = {
        "_id": ObjectId(case_id),
        "title": title.strip(),
        "description": (description.strip() if description else None),
        "image_url": image_url,
        "case_type": (case_type.strip() if case_type else None),
        "homework_type": (homework_type.strip() if homework_type else "Annotate"),
        "author_id": author_id,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "image_filename": filename,
    }

    await cases_collection.insert_one(doc)

    return {
        "case_id": case_id,
        "author_id": author_id,
        "image_url": image_url,
        "title": doc["title"],
        "description": doc["description"],
        "case_type": doc["case_type"],
        "homework_type": doc["homework_type"],
    }

@router.get("/cases")
async def list_cases(limit: int = 50):
    """
    List cases for management page.
    For each case, look up the associated homework to get the correct homework_type and class info.
    """
    items = await cases_collection.find({}).sort("created_at", -1).to_list(limit)
    out = []
    for c in items:
        case_id = str(c["_id"])
        
        # Look up homework for this case to get the correct homework_type and class info
        homework = await homeworks_collection.find_one({"case_id": case_id})
        homework_type = homework.get("homework_type") if homework else c.get("homework_type", "Annotate")
        
        # Get class information if assigned to a class
        class_info = None
        if homework and homework.get("audience") == "Classrooms":
            class_info = {
                "name": homework.get("class_name"),
                "year": homework.get("year")
            }
        
        # Normalize image URL: convert relative URLs to full URLs
        image_url = c.get("image_url")
        if image_url and not image_url.startswith("http") and not image_url.startswith("blob:"):
            # It's a relative URL, convert to full URL
            image_url = f"http://127.0.0.1:8000{image_url}"
        
        out.append({
            "case_id": case_id,
            "title": c.get("title"),
            "author_id": c.get("author_id"),
            "description": c.get("description"),
            "image_url": image_url,
            "case_type": c.get("case_type"),
            "homework_type": homework_type,
            "class_info": class_info,
            "created_at": c.get("created_at"),
        })
    return out

from glob import glob

@router.put("/cases/{case_id}")
async def update_case(
    case_id: str,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = Form(None),
    case_type: Optional[str] = Form(None),
    homework_type: Optional[str] = Form(None),
    author_id: Optional[str] = Form(None),
):
    """Update an existing case.

    Supports updating metadata and replacing the case image.
    """
    try:
        oid = ObjectId(case_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid case_id")

    case = await cases_collection.find_one({"_id": oid})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    update_doc = {}

    if title is not None:
        update_doc["title"] = title.strip() or None
    if description is not None:
        update_doc["description"] = description.strip() or None
    if case_type is not None:
        update_doc["case_type"] = case_type.strip() or None
    if homework_type is not None:
        update_doc["homework_type"] = homework_type.strip() or None

    # Save new image if provided
    if image:
        # Determine author_id for storage
        stored_author_id = author_id or case.get("author_id")
        if not stored_author_id:
            raise HTTPException(status_code=400, detail="author_id is required to update case image")

        user_cases_dir = BASE_UPLOAD_DIR / stored_author_id / "cases"
        user_cases_dir.mkdir(parents=True, exist_ok=True)

        # Attempt to delete old image file if stored
        old_filename = case.get("image_filename")
        if old_filename:
            old_path = user_cases_dir / old_filename
            try:
                if old_path.exists():
                    old_path.unlink()
            except Exception:
                pass

        # Save new image
        _, ext = os.path.splitext(image.filename or "")
        ext = ext.lower() if ext else ".png"
        filename = f"{case_id}{ext}"
        file_path = user_cases_dir / filename
        with open(file_path, "wb") as f:
            f.write(await image.read())

        image_url = f"http://127.0.0.1:8000/uploads/{stored_author_id}/cases/{filename}"
        update_doc["image_url"] = image_url
        update_doc["image_filename"] = filename

    if update_doc:
        await cases_collection.update_one({"_id": oid}, {"$set": update_doc})

    # Return updated case data
    updated_case = await cases_collection.find_one({"_id": oid})

    return {
        "case_id": case_id,
        "title": updated_case.get("title"),
        "description": updated_case.get("description"),
        "image_url": updated_case.get("image_url"),
        "case_type": updated_case.get("case_type"),
        "homework_type": updated_case.get("homework_type"),
        "created_at": updated_case.get("created_at"),
    }


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
    author_id = case.get("author_id")
    if author_id:
        user_cases_dir = BASE_UPLOAD_DIR / author_id / "cases"
        # Preferred: delete by stored filename
        filename = case.get("image_filename")
        if filename:
            file_path = user_cases_dir / filename
            try:
                if file_path.exists():
                    file_path.unlink()
            except Exception as e:
                # Don't fail deletion if file missing
                print("Warning: failed to delete case image:", e)
        else:
            # Fallback: delete any file matching {case_id}.*
            pattern = str(user_cases_dir / f"{case_id}.*")
            for p in glob(pattern):
                try:
                    Path(p).unlink()
                except Exception as e:
                    print("Warning: failed to delete image:", e)
    else:
        print("Warning: no author_id found for case, cannot delete image")

    return {"ok": True, "deleted_case_id": case_id}

