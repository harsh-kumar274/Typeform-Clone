"""Pydantic schemas for Creator entity."""
from datetime import datetime
from pydantic import BaseModel, EmailStr


class CreatorBase(BaseModel):
    name: str
    email: EmailStr


class CreatorCreate(CreatorBase):
    pass


class CreatorRead(CreatorBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
