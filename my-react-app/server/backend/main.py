from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.connection import users_collection, approvals_collection, classrooms_collection
import random
from pathlib import Path
from datetime import datetime
from core.security import hash_password
from fastapi.staticfiles import StaticFiles
from routes import auth, admin, online, annotations, user, ws_routes, forum
from routes import homeworks, submissions, ai, classroom, cases

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(online.router)
app.include_router(user.router)
app.include_router(annotations.router)
app.include_router(ws_routes.router)
app.include_router(forum.router)
app.include_router(homeworks.router)
app.include_router(submissions.router)
app.include_router(ai.router)
app.include_router(classroom.router)
app.include_router(cases.router)


app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.on_event("startup")
async def startup_event():


    #UPLOADS STARTUP


    uploads_root = Path("uploads")
    uploads_root.mkdir(parents=True, exist_ok=True)


    #ADMIN STARTUP


    admin_email = "you@admin.com"
    existing_admin = await users_collection.find_one({"email": admin_email})

    if not existing_admin:
        admin_user = {
            "firstName": "Admin",
            "lastName": "Sir",
            "email": admin_email,
            "password": hash_password("processor123"),
            "role": "admin",
        }
        result = await users_collection.insert_one(admin_user)
        admin_id = result.inserted_id

        user_storage = uploads_root / str(admin_id)
        user_storage.mkdir(parents=True, exist_ok=True)

        print(f"[OK] Admin account created: {admin_email}")
    else:
        print(f"[INFO] Admin account already exists: {admin_email}")


    #STUDENT STARTUP


    student_count = await users_collection.count_documents({"role": "student"})
    student_needed = 3 - student_count
    if student_needed > 0:
        for i in range(student_needed):
            first = f"Student{i+1}"
            last = random.choice(["Nguyen", "Tran", "Pham", "Le", "Do"])
            email = f"{first.lower()}@swin.edu"
            student = {
                "firstName": first,
                "lastName": last,
                "email": email,
                "password": hash_password("student123"),
                "role": "student",
            }
            result = await users_collection.insert_one(student)
            new_user_id = result.inserted_id

            user_storage = uploads_root / str(new_user_id)
            user_storage.mkdir(parents=True, exist_ok=True)

        print(f"[OK] Added {student_needed} random student accounts")


    #INSTRUCTOR STARTUP


    instructor_count = await users_collection.count_documents({"role": "instructor"})
    instructor_needed = 6 - instructor_count
    if instructor_needed > 0:

        for i in range(instructor_needed):
            first = f"Instructor{i+1}"
            last = random.choice(["Smith", "Johnson", "Brown", "Miller", "Taylor"])
            email = f"{first.lower()}@swin.edu"
            status = "verified" if i % 2 == 0 else "pending"

            instructor = {
                "firstName": first,
                "lastName": last,
                "email": email,
                "password": hash_password("teach123"),
                "role": "instructor",
            }

            result = await users_collection.insert_one(instructor)
            new_user_id = result.inserted_id

            user_storage = uploads_root / str(new_user_id)
            user_storage.mkdir(parents=True, exist_ok=True)

            existing_approval = await approvals_collection.find_one({"id": str(new_user_id)})
            if not existing_approval:
                await approvals_collection.insert_one({"id": str(new_user_id), "status": status})

        print(f"[OK] Added {instructor_needed} instructor accounts (pending & verified)")

<<<<<<< HEAD

    #CLASSROOMS STARTUP


    # classroom_count = await classrooms_collection.count_documents("")
    print("✅ Database seeding complete.")
=======
    print("[OK] Database seeding complete.")
>>>>>>> c54aaf6682d3d49bbde080eb48a01bc3de126614

@app.get("/")
def home():
    return {"message": "Backend is running"}
