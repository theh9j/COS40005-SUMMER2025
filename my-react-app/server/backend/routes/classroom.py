from fastapi import APIRouter, HTTPException
from bson import ObjectId
from db.connection import users_collection, classrooms_collection
from datetime import datetime
from typing import List

router = APIRouter(prefix="/api/classroom", tags=["Classroom"])


# Create a new classroom
@router.post("/create")
async def create_classroom(data: dict):
    """Create a new classroom"""
    classroom_name = data.get("name")
    
    if not classroom_name:
        raise HTTPException(status_code=400, detail="Classroom name is required")
    
    # ensure classroom doesn't already exist
    existing = await classrooms_collection.find_one({"name": classroom_name})
    if existing:
        raise HTTPException(status_code=400, detail="Classroom already exists")

    classroom = {
        "name": classroom_name,
        "created_at": datetime.now(),
        "members": [],
    }

    result = await classrooms_collection.insert_one(classroom)
    return {"message": "Classroom created", "classroom": classroom_name, "id": str(result.inserted_id)}


# Add student to classroom
@router.post("/add-student")
async def add_student_to_classroom(data: dict):
    """Add a student to a classroom"""
    student_id = data.get("student_id")
    classroom_name = data.get("classroom_name")
    
    if not student_id or not classroom_name:
        raise HTTPException(status_code=400, detail="Student ID and classroom name are required")
    
    try:
        # verify classroom exists
        cls = await classrooms_collection.find_one({"name": classroom_name})
        if not cls:
            raise HTTPException(status_code=404, detail="Classroom not found")

        result = await users_collection.update_one(
            {"_id": ObjectId(student_id), "role": "student"},
            {"$set": {"classroom": classroom_name}}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Student not found")

        # add to classroom members (avoid duplicates)
        await classrooms_collection.update_one(
            {"_id": cls["_id"]},
            {"$addToSet": {"members": ObjectId(student_id)}}
        )

        return {
            "message": f"Student added to {classroom_name}",
            "student_id": student_id,
            "classroom": classroom_name
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Get all classrooms (unique classroom names from users)
@router.get("/all")
async def get_all_classrooms():
    """Get all classrooms"""
    try:
        classrooms_cursor = classrooms_collection.find({})
        out = []
        async for cls in classrooms_cursor:
            out.append({"id": str(cls["_id"]), "name": cls.get("name"), "members": [str(m) for m in cls.get("members", [])]})
        return {"classrooms": out}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Get students in a classroom
@router.get("/students/{classroom_name}")
async def get_classroom_students(classroom_name: str):
    """Get all students in a classroom"""
    try:
        users_cursor = users_collection.find(
            {"classroom": classroom_name, "role": "student"}
        )
        students = []

        async for user in users_cursor:
            students.append({
                "id": str(user["_id"]),
                "firstName": user.get("firstName", ""),
                "lastName": user.get("lastName", ""),
                "email": user.get("email", ""),
            })

        return {"classroom": classroom_name, "students": students}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Remove student from classroom
@router.post("/remove-student")
async def remove_student_from_classroom(data: dict):
    """Remove a student from classroom (set back to Unassigned)"""
    student_id = data.get("student_id")
    
    if not student_id:
        raise HTTPException(status_code=400, detail="Student ID is required")
    
    try:
        result = await users_collection.update_one(
            {"_id": ObjectId(student_id)},
            {"$set": {"classroom": "Unassigned"}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Student not found")
        
        return {
            "message": "Student removed from classroom",
            "student_id": student_id,
            "classroom": "Unassigned"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Get all students (role=student)
@router.get("/students-all")
async def get_all_students():
    try:
        users_cursor = users_collection.find({"role": "student"})
        students = []
        async for user in users_cursor:
            students.append({
                "id": str(user["_id"]),
                "firstName": user.get("firstName", ""),
                "lastName": user.get("lastName", ""),
                "classroom": user.get("classroom", "Unassigned"),
            })
        return {"students": students}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
