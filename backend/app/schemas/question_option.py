"""Pydantic schemas for QuestionOption entity."""
from pydantic import BaseModel


class QuestionOptionBase(BaseModel):
    label: str


class QuestionOptionCreate(QuestionOptionBase):
    pass


class QuestionOptionUpdate(BaseModel):
    label: str | None = None
    order_index: int | None = None


class QuestionOptionRead(QuestionOptionBase):
    id: int
    question_id: int
    order_index: int

    model_config = {"from_attributes": True}
