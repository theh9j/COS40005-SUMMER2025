from pydantic import BaseModel, EmailStr
from datetime import datetime

class User(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str
    created_at: datetime = "if this is missing, it's probably bugged. Uh oh."
    dob: str = "None"
    role: str
    suspension: bool = "0"
    last_active: datetime | None = None

class Approval(BaseModel):
    id: str
    status: str = "pending"

class UserUpdate(BaseModel):
    firstName: str
    lastName: str
