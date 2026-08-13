"""Pydantic schemas for Answer entity."""
from datetime import datetime
from pydantic import BaseModel


class AnswerBase(BaseModel):
    question_id: int
    value_text: str | None = None


class AnswerCreate(AnswerBase):
    pass


class AnswerUpdate(BaseModel):
    question_id: int
    value_text: str | None = None


class AnswerRead(AnswerBase):
    id: int
    response_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AnswerWithQuestion(AnswerRead):
    """Extended answer schema that includes question title and type for results views."""
    question_title: str | None = None
    question_type: str | None = None
