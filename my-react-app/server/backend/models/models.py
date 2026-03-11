from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, Dict, Any, List, Literal, Union

class User(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str
    created_at: datetime = "if this is missing, it's probably bugged. Uh oh."
    dob: str = "None"
    role: str
    suspension: bool = 0
    last_active: datetime | None = None
    classrooms: List[str] = []

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

class ForumAuthor(BaseModel):
    user_id: Optional[str] = None
    name: Optional[str] = None
    avatarUrl: Optional[str] = None

class ForumReply(BaseModel):
    id: str
    author: ForumAuthor
    role: Optional[Literal["student", "instructor", "admin"]] = None
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)

class ForumThread(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    author: ForumAuthor
    title: str
    content: str
    tags: List[str] = Field(default_factory=list)
    imageUrl: Optional[str] = None
    replies: List[ForumReply] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        populate_by_name = True
        from_attributes = True

class ClassRoom(BaseModel):
    name: str
    year: str
    instructors: List[str]

#                  SUBMISSION

class FileItem(BaseModel):
    name: str
    url: str
    type: str
    size: int

class AnswerItem(BaseModel):
    index: int        # index of question
    value: Any        # string for short, number for mcq choice

class SubmissionCreate(BaseModel):
    notes: Optional[str] = None
    files: Optional[List[FileItem]] = None
    answers: Optional[List[AnswerItem]] = None

class SubmissionOut(BaseModel):
    submission_id: str
    status: Literal["none", "submitted", "grading", "graded"]
    score: Optional[int] = None
    notes: Optional[str] = None
    files: Optional[List[FileItem]] = None
    answers: Optional[List[AnswerItem]] = None
    updated_at: Optional[str] = None

class GradeRequest(BaseModel):
    score: int
    rubric: List[Dict[str, Any]]
    feedback: str | None = None

#                      HOMEWORK

class HWUpload(BaseModel):
    name: str
    url: str
    type: str
    size: int

# ---- Questions ----
class QuestionShort(BaseModel):
    type: Literal["short"]
    prompt: str
    points: int
    guidance: Optional[str] = None
    expectedAnswer: Optional[str] = None
    imageIndex: Optional[int] = None

class QuestionEssay(BaseModel):
    # ✅ NEW: accept essay from frontend
    type: Literal["essay"]
    prompt: str
    points: int
    guidance: Optional[str] = None
    # keep optional for compatibility (even if you don’t use it)
    expectedAnswer: Optional[str] = None
    imageIndex: Optional[int] = None

class QuestionMCQ(BaseModel):
    type: Literal["mcq"]
    prompt: str
    points: int
    guidance: Optional[str] = None
    options: List[str]
    correctIndex: Optional[int] = None
    imageIndex: Optional[int] = None

# ✅ now includes essay
Question = Union[QuestionShort, QuestionEssay, QuestionMCQ]

# ---- Homework Related ----
class Case(BaseModel):
    title: str
    description: Optional[str] = None
    type: Optional[str] = None
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Homework(BaseModel):
    case_id: str
    homework_type: Literal["Q&A", "Annotate"]
    focus: List[Dict[str, Any]] = Field(default_factory=list)
    audience: Literal["All Students", "Classrooms"]
    class_id: Optional[str] = None
    class_name: Optional[str] = None
    year: Optional[str] = None
    password: Optional[str] = None
    due_at: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class QNA(BaseModel):
    case_id: str
    instructions: Optional[str] = None
    total_questions: int = 0
    questions: List[Question] = Field(default_factory=list)

class Annot(BaseModel):
    case_id: str
    annotation_image: str = ""
    reference_images: List[str] = Field(default_factory=list)