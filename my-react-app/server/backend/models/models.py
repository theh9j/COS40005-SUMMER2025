from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, Dict, Any, List

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

class Annotation(BaseModel):
    id: Optional[str] = None      
    case_id: str                   
    user_id: str                   
    type: str                      
    data: Dict[str, Any]            
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

class AnnotationVersion(BaseModel):
    id: Optional[str] = None
    caseId: str
    userId: str
    annotations: List[Dict[str, Any]]
    createdAt: datetime = datetime.now()
