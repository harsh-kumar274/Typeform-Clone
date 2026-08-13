"""Pydantic schemas for Response entity."""
from datetime import datetime
from pydantic import BaseModel

from app.schemas.answer import AnswerRead, AnswerWithQuestion


class ResponseBase(BaseModel):
    form_id: int


class ResponseCreate(ResponseBase):
    pass


class ResponseRead(BaseModel):
    id: int
    form_id: int
    public_token: str
    is_complete: bool
    started_at: datetime
    submitted_at: datetime | None = None

    model_config = {"from_attributes": True}


class ResponseSummary(BaseModel):
    """Lightweight response for list views — includes a short answer preview."""
    id: int
    public_token: str
    is_complete: bool
    started_at: datetime
    submitted_at: datetime | None = None
    answer_preview: str | None = None  # first answer's text, truncated

    model_config = {"from_attributes": True}


class ResponseDetail(ResponseRead):
    """Full response with all answers and question metadata."""
    answers: list[AnswerWithQuestion] = []


class PublicResponseStart(BaseModel):
    """Returned to the respondent after starting a new response session."""
    response_token: str


class PublicResponseResume(BaseModel):
    """
    Returned by GET /public/responses/{token} for respondent-side hydration
    (Module 1.5 item 3). Lets the frontend pre-populate answered questions
    on page refresh or back-navigation.
    """
    form_slug: str
    answers: list[AnswerRead] = []
    is_complete: bool
