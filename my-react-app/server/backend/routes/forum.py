import os
from pathlib import Path
from datetime import datetime
from typing import Optional
from fastapi.encoders import jsonable_encoder
from bson import ObjectId
import random
from collections import Counter
from datetime import timedelta

from fastapi import APIRouter, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse

from db.connection import users_collection, forum_collection
from models.models import ForumThread, ForumReply, ForumAuthor 

router = APIRouter(prefix="/forum", tags=["Forum"])

BASE_UPLOAD_DIR = Path("uploads")

async def get_trending_tags(limit: int = 5):
    """
    Returns up to `limit` trending tags.
    If all counts are equal or no tags exist → random selection.
    """
    cursor = forum_collection.find(
        {}, {"tags": 1, "timestamp": 1}
    )

    tag_counter = Counter()

    async for doc in cursor:
        for tag in doc.get("tags", []):
            tag_counter[tag] += 1

    if not tag_counter:
        return []

    # Group tags by frequency
    freq_map = {}
    for tag, count in tag_counter.items():
        freq_map.setdefault(count, []).append(tag)

    # Sort frequencies desc
    sorted_freqs = sorted(freq_map.keys(), reverse=True)

    result = []
    for freq in sorted_freqs:
        tags = freq_map[freq]
        random.shuffle(tags)
        for tag in tags:
            result.append(tag)
            if len(result) == limit:
                return result

    return result

@router.get("/tags/trending")
async def get_trending_tags_api():
    tags = await get_trending_tags(limit=5)
    return tags

@router.get("/tags")
async def get_all_tags():
    tags = set()
    async for doc in forum_collection.find({}, {"tags": 1}):
        tags.update(doc.get("tags", []))
    return sorted(tags)

def serialize_doc(doc):
    """Convert MongoDB _id to string and handle nested replies."""
    if not doc:
        return doc
    doc["id"] = str(doc.get("_id"))
    doc.pop("_id", None)

    # Ensure replies and author fields are serializable
    if "replies" in doc:
        for reply in doc["replies"]:
            if isinstance(reply.get("id"), ObjectId):
                reply["id"] = str(reply["id"])
    return doc

@router.get("")
async def get_all_threads():
    """Fetch all forum threads sorted by latest first."""
    threads = []
    async for thread in forum_collection.find().sort("timestamp", -1):
        threads.append(serialize_doc(thread))
    return threads


@router.post("/create")
async def create_thread(
    user_id: str = Form(...),
    title: str = Form(...),
    content: str = Form(...),
    tags: str = Form(""),
    image: Optional[UploadFile] = None,
):
    """Create a new thread with optional image upload."""

    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_folder = BASE_UPLOAD_DIR / str(user_id)
    user_folder.mkdir(parents=True, exist_ok=True)

    image_url = None
    if image:
        ext = os.path.splitext(image.filename)[1]
        filename = f"forum_post_{int(datetime.now().timestamp())}{ext}"
        file_path = user_folder / filename
        with open(file_path, "wb") as f:
            f.write(await image.read())
        image_url = f"http://127.0.0.1:8000/uploads/{user_id}/{filename}"

    tags_list = [tag.strip() for tag in tags.split(",") if tag.strip()]

    if not tags_list:
        trending = await get_trending_tags(limit=5)

        if trending:
            tags_list = trending
        else:
            # fallback: random tags from all existing threads
            cursor = forum_collection.find({}, {"tags": 1})
            all_tags = set()
            async for doc in cursor:
                all_tags.update(doc.get("tags", []))
            tags_list = random.sample(list(all_tags), min(5, len(all_tags)))


    author = ForumAuthor(
        user_id=str(user["_id"]),
        name=f"{user.get('firstName', '')} {user.get('lastName', '')}".strip(),
        avatarUrl=None,
    )

    thread = ForumThread(
        author=author,
        title=title,
        content=content,
        tags=tags_list,
        imageUrl=image_url,
        replies=[],
        timestamp=datetime.now(),
    )

    result = await forum_collection.insert_one(
        thread.model_dump(by_alias=True, exclude_none=True)
    )


    response_thread = thread.model_dump()
    response_thread["id"] = str(result.inserted_id)
    
    if "_id" in response_thread:
        del response_thread["_id"]

    return JSONResponse(status_code=200, content={"status": "success", "thread": jsonable_encoder(response_thread)})


@router.post("/reply")
async def add_reply(
    thread_id: str = Form(...),
    user_id: str = Form(...),
    content: str = Form(...),
):
    """Add a reply to a thread."""

    thread = await forum_collection.find_one({"_id": ObjectId(thread_id)})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    reply_author = ForumAuthor(
        user_id=str(user["_id"]),
        name=f"{user.get('firstName', '')} {user.get('lastName', '')}".strip(),
        avatarUrl=None,
    )

    reply = ForumReply(
        id=str(ObjectId()),
        author=reply_author,
        role=user.get("role", "student"),
        content=content,
        timestamp=datetime.now(),
    )

    await forum_collection.update_one(
        {"_id": ObjectId(thread_id)},
        {"$push": {"replies": reply.model_dump(by_alias=True, exclude_none=True)}},
    )

    return JSONResponse(
        status_code=200,
        content={"status": "success", "reply": jsonable_encoder(reply)}
    )

@router.get("/{thread_id}")
async def get_thread(thread_id: str):
    """Fetch a single thread by ID."""
    thread = await forum_collection.find_one({"_id": ObjectId(thread_id)})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    return serialize_doc(thread)