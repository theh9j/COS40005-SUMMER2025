from fastapi import APIRouter, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime
from bson import ObjectId
from pathlib import Path
import shutil
import os

from db.connection import forum_collection

router = APIRouter(prefix="/api/forum", tags=["Forum"])


@router.post("/create")
async def create_thread(
    title: str = Form(...),
    content: str = Form(...),
    authorId: str = Form(...),
    authorName: str = Form(...),
    avatarUrl: str = Form(...),
    tags: str = Form("[]"),
    image: UploadFile | None = None
):
    try:
        user_folder = Path(f"uploads/{authorId}")
        user_folder.mkdir(parents=True, exist_ok=True)

        image_path = None
        if image:
            filename = f"forum_post_{datetime.now().timestamp()}_{image.filename}"
            image_path = user_folder / filename
            with open(image_path, "wb") as f:
                shutil.copyfileobj(image.file, f)
            image_path = str(image_path)

        thread = {
            "title": title,
            "content": content,
            "tags": eval(tags) if tags else [],
            "author": {
                "id": authorId,
                "name": authorName,
                "avatarUrl": avatarUrl
            },
            "imageUrl": image_path,
            "timestamp": datetime.now(),
            "replies": []
        }

        result = await forum_collection.insert_one(thread)
        thread["_id"] = str(result.inserted_id)
        return thread

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/threads")
async def get_threads():
    threads = await forum_collection.find({}).sort("timestamp", -1).to_list(None)
    for t in threads:
        t["id"] = str(t["_id"])
        del t["_id"]
    return threads

@router.get("/thread/{thread_id}")
async def get_thread(thread_id: str):
    from bson import ObjectId
    thread = await forum_collection.find_one({"_id": ObjectId(thread_id)})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    thread["id"] = str(thread["_id"])
    del thread["_id"]
    return thread

@router.post("/thread/{thread_id}/reply")
async def add_reply(
    thread_id: str,
    authorId: str = Form(...),
    authorName: str = Form(...),
    avatarUrl: str = Form(...),
    content: str = Form(...),
):
    thread = await forum_collection.find_one({"_id": ObjectId(thread_id)})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    reply = {
        "id": str(ObjectId()),
        "author": {
            "id": authorId,
            "name": authorName,
            "avatarUrl": avatarUrl
        },
        "content": content,
        "timestamp": datetime.now(),
    }

    await forum_collection.update_one(
        {"_id": ObjectId(thread_id)},
        {"$push": {"replies": reply}}
    )

    return reply

@router.delete("/thread/{thread_id}")
async def delete_thread(thread_id: str, authorId: str):
    thread = await forum_collection.find_one({"_id": ObjectId(thread_id)})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    if thread["author"]["id"] != authorId:
        raise HTTPException(status_code=403, detail="You can only delete your own threads")

    await forum_collection.delete_one({"_id": ObjectId(thread_id)})
    return JSONResponse({"message": "Thread deleted successfully"})
