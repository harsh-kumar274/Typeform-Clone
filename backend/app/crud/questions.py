"""
Question & Option CRUD operations.

Design decisions:
- Module 1.5 item 5: order_index is renormalized on delete to keep contiguous 0,1,2,...
- Reorder runs in a single transaction and validates all IDs belong to the target form.
- Options CRUD is simple — no complex validation beyond existence checks.
"""
import json
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.question import Question
from app.models.question_option import QuestionOption
from app.schemas.question import QuestionCreate, QuestionUpdate
from app.schemas.question_option import QuestionOptionCreate, QuestionOptionUpdate


def get_question(db: Session, question_id: int) -> Question | None:
    return db.query(Question).filter(Question.id == question_id).first()


def create_question(db: Session, form_id: int, data: QuestionCreate) -> Question:
    """Add a question at the end of the form's question list."""
    # Auto-calculate order_index as max+1
    max_order = (
        db.query(func.max(Question.order_index))
        .filter(Question.form_id == form_id)
        .scalar()
    )
    next_order = (max_order + 1) if max_order is not None else 0

    question = Question(
        form_id=form_id,
        type=data.type,
        title=data.title,
        description=data.description,
        is_required=data.is_required,
        order_index=next_order,
        settings_json=json.dumps(data.settings_json) if data.settings_json else None,
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


def update_question(db: Session, question_id: int, data: QuestionUpdate) -> Question | None:
    """Partial update for a question."""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "settings_json" and value is not None:
            setattr(question, key, json.dumps(value))
        else:
            setattr(question, key, value)

    db.commit()
    db.refresh(question)
    return question


def delete_question(db: Session, question_id: int) -> bool:
    """
    Delete a question and renormalize sibling order_index values.
    
    Module 1.5 item 5: After deleting, re-sequence remaining questions
    to be contiguous (0, 1, 2, ...) — makes manual DB inspection and
    reorder logic easier to reason about.
    """
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        return False

    form_id = question.form_id
    db.delete(question)
    db.flush()

    # Renormalize order_index for remaining questions in this form
    remaining = (
        db.query(Question)
        .filter(Question.form_id == form_id)
        .order_by(Question.order_index)
        .all()
    )
    for i, q in enumerate(remaining):
        q.order_index = i

    db.commit()
    return True


def reorder_questions(db: Session, form_id: int, order_data: list[dict]) -> tuple[bool, str | None]:
    """
    Bulk reorder questions within a form.
    
    Body: [{"id": 1, "order_index": 0}, {"id": 2, "order_index": 1}, ...]
    
    Runs in a single transaction. Validates all IDs belong to the target form.
    Returns (True, None) on success, (False, error_message) on failure.
    """
    # Get all question IDs for this form
    form_question_ids = set(
        q.id for q in db.query(Question.id).filter(Question.form_id == form_id).all()
    )

    submitted_ids = set(item["id"] for item in order_data)

    # Validate all submitted IDs belong to this form
    invalid_ids = submitted_ids - form_question_ids
    if invalid_ids:
        return False, f"Questions {list(invalid_ids)} do not belong to form {form_id}"

    # Apply the new order
    for item in order_data:
        db.query(Question).filter(Question.id == item["id"]).update(
            {"order_index": item["order_index"]}
        )

    db.commit()
    return True, None


# --- Question Options ---

def create_option(db: Session, question_id: int, data: QuestionOptionCreate) -> QuestionOption:
    """Add an option at the end of the question's option list."""
    max_order = (
        db.query(func.max(QuestionOption.order_index))
        .filter(QuestionOption.question_id == question_id)
        .scalar()
    )
    next_order = (max_order + 1) if max_order is not None else 0

    option = QuestionOption(
        question_id=question_id,
        label=data.label,
        order_index=next_order,
    )
    db.add(option)
    db.commit()
    db.refresh(option)
    return option


def update_option(db: Session, option_id: int, data: QuestionOptionUpdate) -> QuestionOption | None:
    """Partial update for an option."""
    option = db.query(QuestionOption).filter(QuestionOption.id == option_id).first()
    if not option:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(option, key, value)

    db.commit()
    db.refresh(option)
    return option


def delete_option(db: Session, option_id: int) -> bool:
    """Delete an option."""
    option = db.query(QuestionOption).filter(QuestionOption.id == option_id).first()
    if not option:
        return False
    db.delete(option)
    db.commit()
    return True
