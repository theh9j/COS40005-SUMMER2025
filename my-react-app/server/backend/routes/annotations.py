# backend/routes/annotations.py
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from db.connection import annotations_collection, versions_collection
from datetime import datetime

router = APIRouter(prefix="/api/annotations", tags=["Annotations"])
from ws_manager import ws_manager 

def clean_obj(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, list):
        return [clean_obj(i) for i in obj]
    if isinstance(obj, dict):
        return {k: clean_obj(v) for k, v in obj.items()}
    return obj

@router.get("/{case_id}")
async def get_annotations(case_id: str):
    docs = await annotations_collection.find({"caseId": case_id}).to_list(None)
    for d in docs:
        d["id"] = str(d["_id"])
    return docs

@router.post("/")
async def create_annotation(payload: dict):
    payload["createdAt"] = datetime.now()
    payload["updatedAt"] = datetime.now()
    result = await annotations_collection.insert_one(payload)
    payload["id"] = str(result.inserted_id)
    await ws_manager.broadcast(payload["caseId"], {"type": "add", "annotation": payload})
    return payload

@router.put("/{annotation_id}")
async def update_annotation(annotation_id: str, update: dict):
    update["updatedAt"] = datetime.now()
    res = await annotations_collection.update_one({"_id": ObjectId(annotation_id)}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Annotation not found")
    doc = await annotations_collection.find_one({"_id": ObjectId(annotation_id)})
    doc["id"] = str(doc["_id"])
    await ws_manager.broadcast(doc["caseId"], {"type": "update", "annotation": doc})
    return doc

@router.delete("/{annotation_id}")
async def delete_annotation(annotation_id: str):
    doc = await annotations_collection.find_one({"_id": ObjectId(annotation_id)})
    if not doc:
        raise HTTPException(404, "Annotation not found")
    await annotations_collection.delete_one({"_id": ObjectId(annotation_id)})
    await ws_manager.broadcast(doc["caseId"], {"type": "delete", "annotationId": annotation_id})
    return {"deletedId": annotation_id}

@router.post("/snapshot/{case_id}")
async def save_snapshot(case_id: str, payload: dict):
    user_id = payload.get("userId")
    annotations = payload.get("annotations", [])

    # Count existing versions for this case
    existing_versions = await versions_collection.count_documents({"caseId": case_id})
    next_version_number = existing_versions + 1  # start from 1

    version_doc = {
        "caseId": case_id,
        "userId": user_id,
        "version": next_version_number,  
        "annotations": annotations,
        "createdAt": datetime.now(),
    }

    result = await versions_collection.insert_one(version_doc)
    version_doc["_id"] = str(result.inserted_id)
    return clean_obj(version_doc)

@router.get("/versions/{case_id}")
async def get_versions(case_id: str):
    versions = await versions_collection.find({"caseId": case_id}).sort("version", -1).to_list(None)

    cleaned = []
    for v in versions:
        v["_id"] = str(v["_id"])
        if "version" not in v:
            v["version"] = 0
        v["id"] = v["_id"]
        cleaned.append(clean_obj(v))

    return cleaned

@router.delete("/versions/{version_id}")
async def delete_version(version_id: str):
    doc = await versions_collection.find_one({"_id": ObjectId(version_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Version not found")

    case_id = doc["caseId"]
    version_number = doc["version"]

    await versions_collection.delete_one({"_id": ObjectId(version_id)})

    # Shift down all versions after this one
    await versions_collection.update_many(
        {"caseId": case_id, "version": {"$gt": version_number}},
        {"$inc": {"version": -1}}
    )

    return {"message": f"Deleted version {version_number}"}