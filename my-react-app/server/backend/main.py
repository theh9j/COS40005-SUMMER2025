from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.connection import db, users_collection
from core.security import hash_password
from routes import auth

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)

@app.on_event("startup")
async def startup_event():

    # Check if admin exists
    admin_email = "nothingnoteworthy@gmail.com"
    existing_admin = await users_collection.find_one({"email": admin_email})

    if not existing_admin:

        admin_user = {
            "firstName": "Admin",
            "lastName": "Sir",
            "email": admin_email,
            "password": hash_password("processor123"),
            "role": "admin",
        }

        await users_collection.insert_one(admin_user)

@app.get("/")
def home():
    return {"message": "Backend is running"}
