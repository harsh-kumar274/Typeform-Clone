"""
Pydantic schemas for Form entity.

FormRead includes nested questions (with their options) for the builder view.
FormListItem is a lighter variant for the dashboard cards.
"""
from datetime import datetime
from pydantic import BaseModel

from app.schemas.question import QuestionRead


class FormBase(BaseModel):
    title: str
    description: str | None = None


class FormCreate(FormBase):
    pass


class FormUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    theme_color: str | None = None
    thank_you_message: str | None = None


class FormRead(FormBase):
    id: int
    creator_id: int
    status: str
    public_slug: str | None = None
    theme_color: str
    thank_you_message: str
    questions: list[QuestionRead] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FormListItem(BaseModel):
    """Lightweight form for dashboard listing — no nested questions."""
    id: int
    title: str
    description: str | None = None
    status: str
    public_slug: str | None = None
    response_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
