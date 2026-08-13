"""
Question & Option management router.

Handles question CRUD, reordering, and option management.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.crud import questions as questions_crud
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionRead
from app.schemas.question_option import QuestionOptionCreate, QuestionOptionUpdate, QuestionOptionRead

router = APIRouter()


# --- Reorder request schema ---
class ReorderItem(BaseModel):
    id: int
    order_index: int


# --- Questions ---

@router.post("/forms/{form_id}/questions", response_model=QuestionRead, status_code=201)
def add_question(form_id: int, data: QuestionCreate, db: Session = Depends(get_db)):
    """Add a question to a form (appended at the end)."""
    return questions_crud.create_question(db, form_id, data)


@router.patch("/questions/{question_id}", response_model=QuestionRead)
def update_question(question_id: int, data: QuestionUpdate, db: Session = Depends(get_db)):
    """Partial update for a question (title, description, type, required, settings)."""
    question = questions_crud.update_question(db, question_id, data)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@router.delete("/questions/{question_id}", status_code=204)
def delete_question(question_id: int, db: Session = Depends(get_db)):
    """Delete a question and renormalize sibling order indices."""
    if not questions_crud.delete_question(db, question_id):
        raise HTTPException(status_code=404, detail="Question not found")
    return None


@router.post("/forms/{form_id}/questions/reorder", status_code=200)
def reorder_questions(form_id: int, order_data: list[ReorderItem], db: Session = Depends(get_db)):
    """
    Bulk reorder questions within a form.
    
    Body: [{"id": 1, "order_index": 0}, {"id": 2, "order_index": 1}, ...]
    Runs in a single DB transaction. Validates all IDs belong to the target form.
    """
    items = [item.model_dump() for item in order_data]
    success, error = questions_crud.reorder_questions(db, form_id, items)
    if not success:
        raise HTTPException(status_code=400, detail=error)
    return {"detail": "Reorder successful"}


# --- Options ---

@router.post("/questions/{question_id}/options", response_model=QuestionOptionRead, status_code=201)
def add_option(question_id: int, data: QuestionOptionCreate, db: Session = Depends(get_db)):
    """Add an option to a choice/dropdown question."""
    question = questions_crud.get_question(db, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    if question.type not in ("multiple_choice", "dropdown"):
        raise HTTPException(status_code=400, detail="Options are only for multiple_choice and dropdown questions")
    return questions_crud.create_option(db, question_id, data)


@router.patch("/options/{option_id}", response_model=QuestionOptionRead)
def update_option(option_id: int, data: QuestionOptionUpdate, db: Session = Depends(get_db)):
    """Update an option's label or order."""
    option = questions_crud.update_option(db, option_id, data)
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")
    return option


@router.delete("/options/{option_id}", status_code=204)
def delete_option(option_id: int, db: Session = Depends(get_db)):
    """Delete an option."""
    if not questions_crud.delete_option(db, option_id):
        raise HTTPException(status_code=404, detail="Option not found")
    return None
