"""
Public respondent router — no auth required, uses public_token for response identity.

These endpoints power the /f/{slug} respondent experience.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.crud import responses as responses_crud
from app.schemas.form import FormRead
from app.schemas.response import PublicResponseStart, PublicResponseResume
from app.schemas.answer import AnswerRead

router = APIRouter()


class AnswerPayload(BaseModel):
    question_id: int
    value_text: str | None = None


@router.get("/public/forms/{slug}", response_model=FormRead)
def get_public_form(slug: str, db: Session = Depends(get_db)):
    """Fetch a published form by its public slug. Returns 404 if not published."""
    form = responses_crud.get_public_form(db, slug)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found or not published")
    return form


@router.post("/public/forms/{slug}/responses", response_model=PublicResponseStart, status_code=201)
def start_response(slug: str, db: Session = Depends(get_db)):
    """Start a new response session. Returns a public_token for subsequent calls."""
    form = responses_crud.get_public_form(db, slug)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found or not published")

    response = responses_crud.start_response(db, form.id)
    return PublicResponseStart(response_token=response.public_token)


@router.get("/public/responses/{response_token}", response_model=PublicResponseResume)
def get_response_for_resume(response_token: str, db: Session = Depends(get_db)):
    """
    Module 1.5 item 3: Resume endpoint for respondent-side hydration.
    
    Returns the response's answers so the frontend can pre-populate
    answered questions on page refresh or back-navigation.
    """
    response = responses_crud.get_response_by_token(db, response_token)
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")

    return PublicResponseResume(
        form_slug=response.form.public_slug or "",
        answers=[AnswerRead.model_validate(a) for a in response.answers],
        is_complete=response.is_complete,
    )


@router.patch("/public/responses/{response_token}/answers", response_model=AnswerRead)
def save_answer(response_token: str, data: AnswerPayload, db: Session = Depends(get_db)):
    """
    Upsert a single answer for a response.
    
    True upsert: updates if already answered, inserts if new.
    Runs type-specific validation (email format, number range, valid option label, etc.).
    """
    response = responses_crud.get_response_by_token(db, response_token)
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")
    if response.is_complete:
        raise HTTPException(status_code=400, detail="Response already submitted")

    answer, error = responses_crud.upsert_answer(db, response, data.question_id, data.value_text)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return answer


@router.post("/public/responses/{response_token}/submit", status_code=200)
def submit_response(response_token: str, db: Session = Depends(get_db)):
    """
    Mark the response as complete.
    
    Validates all required questions have non-empty answers.
    Returns 400 with a list of missing question IDs if validation fails.
    """
    response = responses_crud.get_response_by_token(db, response_token)
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")

    success, error = responses_crud.submit_response(db, response)
    if not success:
        raise HTTPException(status_code=400, detail=error)
    return {"detail": "Response submitted successfully"}
