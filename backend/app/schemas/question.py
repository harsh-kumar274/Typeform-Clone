"""
Pydantic schemas for Question entity.

The `settings_json` field is stored as a JSON string in the DB but exposed
as an optional dict in the API for ergonomic client usage.
"""
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, field_validator

from app.schemas.question_option import QuestionOptionRead


QuestionType = Literal[
    "short_text", "long_text", "multiple_choice", "dropdown",
    "email", "number", "yes_no", "rating"
]


class QuestionBase(BaseModel):
    type: QuestionType
    title: str
    description: str | None = None
    is_required: bool = False
    settings_json: dict | None = None


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    type: QuestionType | None = None
    title: str | None = None
    description: str | None = None
    is_required: bool | None = None
    settings_json: dict | None = None


class QuestionRead(QuestionBase):
    id: int
    form_id: int
    order_index: int
    options: list[QuestionOptionRead] = []
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("settings_json", mode="before")
    @classmethod
    def parse_settings_json(cls, v):
        """Convert JSON string from DB into a dict for the API response."""
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return None
        return v
