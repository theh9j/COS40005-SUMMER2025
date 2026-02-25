from fastapi import APIRouter, HTTPException
from bson import ObjectId
from db.connection import users_collection, classrooms_collection
from datetime import datetime

router = APIRouter(prefix="/api/classroom", tags=["Classroom"])


# ===============================
# Create Classroom (with year)
# ===============================

@router.post("/create")
async def create_classroom(data: dict):
    name = data.get("name")
    year = data.get("year")

    if not name or not year:
        raise HTTPException(status_code=400, detail="name and year are required")

    # ensure (name + year) unique
    existing = await classrooms_collection.find_one({
        "name": name,
        "year": year
    })

    if existing:
        raise HTTPException(status_code=400, detail="Classroom already exists for this year")

    classroom = {
        "name": name,
        "year": year,
        "created_at": datetime.utcnow(),
        "members": []
    }

    result = await classrooms_collection.insert_one(classroom)

    return {
        "message": "Classroom created",
        "id": str(result.inserted_id),
        "display": f"Class {name} ({year})"
    }


# ===============================
# Add Student To Classroom
# ===============================

@router.post("/add-student")
async def add_student_to_classroom(data: dict):
    student_id = data.get("student_id")
    classroom_id = data.get("classroom_id")

    if not student_id or not classroom_id:
        raise HTTPException(status_code=400, detail="student_id and classroom_id required")

    student_obj = ObjectId(student_id)
    classroom_obj = ObjectId(classroom_id)

    classroom = await classrooms_collection.find_one({"_id": classroom_obj})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")

    student = await users_collection.find_one({"_id": student_obj, "role": "student"})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    await users_collection.update_one(
        {"_id": student_obj},
        {"$addToSet": {"classrooms": classroom_obj}}
    )

    await classrooms_collection.update_one(
        {"_id": classroom_obj},
        {"$addToSet": {"members": student_obj}}
    )

    return {
        "message": "Student added",
        "classroom": f"Class {classroom['name']} ({classroom['year']})"
    }


# ===============================
# Get All Classrooms
# ===============================

@router.get("/all")
async def get_all_classrooms():
    cursor = classrooms_collection.find({})
    result = []

    async for cls in cursor:
        result.append({
            "id": str(cls["_id"]),
            "name": cls.get("name"),
            "year": cls.get("year"),
            "display": f"Class {cls.get('name')} ({cls.get('year')})",
            "members_count": len(cls.get("members", []))
        })

    return {"classrooms": result}


# ===============================
# Get Students In Classroom
# ===============================

@router.get("/students/{classroom_id}")
async def get_classroom_students(classroom_id: str):
    classroom = await classrooms_collection.find_one(
        {"_id": ObjectId(classroom_id)}
    )

    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")

    member_ids = classroom.get("members", [])

    students = []
    cursor = users_collection.find({
        "_id": {"$in": member_ids}
    })

    async for user in cursor:
        students.append({
            "id": str(user["_id"]),
            "firstName": user.get("firstName"),
            "lastName": user.get("lastName"),
            "email": user.get("email"),
        })

    return {
        "classroom": f"Class {classroom['name']} ({classroom['year']})",
        "students": students
    }


# ===============================
# Remove Student From Classroom
# ===============================

@router.post("/remove-student")
async def remove_student_from_classroom(data: dict):
    student_id = data.get("student_id")
    classroom_id = data.get("classroom_id")

    if not student_id or not classroom_id:
        raise HTTPException(status_code=400, detail="student_id and classroom_id required")

    student_obj = ObjectId(student_id)
    classroom_obj = ObjectId(classroom_id)

    await users_collection.update_one(
        {"_id": student_obj},
        {"$pull": {"classrooms": classroom_obj}}
    )

    await classrooms_collection.update_one(
        {"_id": classroom_obj},
        {"$pull": {"members": student_obj}}
    )

    return {"message": "Student removed"}