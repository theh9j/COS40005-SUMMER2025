from motor.motor_asyncio import AsyncIOMotorClient
from decouple import config

MONGO_URL = config("MONGO_URL", default="mongodb://localhost:27017")

client = AsyncIOMotorClient(MONGO_URL)
db = client["project"]
users_collection = db["users"]
data_collection = db["data"]
approvals_collection = db["approvals"]