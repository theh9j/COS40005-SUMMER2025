from fastapi import APIRouter, HTTPException
from datetime import datetime
from bson import ObjectId
from db.connection import annotations_collection, versions_collection
from models.models import Annotation, AnnotationVersion

router = APIRouter(prefix="/annotations", tags=["Annotations"])

# --- Save a new annotation ---
@router.post("/")
async def save_annotation(annotation: Annotation):
    annotation_dict = annotation.model_dump()
    annotation_dict["created_at"] = datetime.utcnow()
    annotation_dict["updated_at"] = datetime.utcnow()
    result = await annotations_collection.insert_one(annotation_dict)
    annotation_dict["_id"] = str(result.inserted_id)
    return annotation_dict

# --- Get all annotations for a case ---
@router.get("/{case_id}")
async def get_annotations(case_id: str):
    annotations = await annotations_collection.find({"case_id": case_id}).to_list(1000)
    for ann in annotations:
        ann["_id"] = str(ann["_id"])
    return annotations

# --- Save a snapshot of all annotations (version history) ---
@router.post("/version")
async def save_annotation_version(version: AnnotationVersion):
    version_dict = version.model_dump()
    version_dict["createdAt"] = datetime.utcnow()
    result = await versions_collection.insert_one(version_dict)
    version_dict["_id"] = str(result.inserted_id)
    return version_dict

# --- Get all versions for a case ---
@router.get("/version/{case_id}")
async def get_annotation_versions(case_id: str):
    versions = await versions_collection.find({"caseId": case_id}).sort("createdAt", -1).to_list(100)
    for v in versions:
        v["_id"] = str(v["_id"])
    return versions

# --- Delete a version ---
@router.delete("/version/{version_id}")
async def delete_annotation_version(version_id: str):
    result = await versions_collection.delete_one({"_id": ObjectId(version_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Version not found")
    return {"message": "Version deleted"}
