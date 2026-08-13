"""
Form CRUD operations.

All database access for forms lives here — routers call these functions,
never touch the ORM directly. This separation makes testing straightforward
and keeps business logic out of the route handlers.

Design decisions (Module 1.5 item 4):
- `duplicate_form` copies only questions + options, NOT responses/answers.
- A new draft form from duplication has no slug and response_count=0.
"""
import json
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.form import Form
from app.models.question import Question
from app.models.question_option import QuestionOption
from app.models.response import Response
from app.schemas.form import FormCreate, FormUpdate
from app.services.slug import generate_slug


DEFAULT_CREATOR_ID = 1


def get_forms(db: Session) -> list[dict]:
    """
    List all forms for the default creator with response counts.
    Returns dicts (not ORM objects) because response_count is a computed field.
    """
    forms = (
        db.query(
            Form,
            func.count(Response.id).label("response_count"),
        )
        .outerjoin(Response, Response.form_id == Form.id)
        .filter(Form.creator_id == DEFAULT_CREATOR_ID)
        .group_by(Form.id)
        .order_by(Form.updated_at.desc())
        .all()
    )

    result = []
    for form, count in forms:
        result.append({
            "id": form.id,
            "title": form.title,
            "description": form.description,
            "status": form.status,
            "public_slug": form.public_slug,
            "response_count": count,
            "created_at": form.created_at,
            "updated_at": form.updated_at,
        })
    return result


def get_form(db: Session, form_id: int) -> Form | None:
    """Get a single form with eager-loaded questions and their options."""
    return (
        db.query(Form)
        .options(
            joinedload(Form.questions).joinedload(Question.options)
        )
        .filter(Form.id == form_id)
        .first()
    )


def create_form(db: Session, data: FormCreate) -> Form:
    """Create a new draft form for the default creator."""
    form = Form(
        creator_id=DEFAULT_CREATOR_ID,
        title=data.title,
        description=data.description,
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return form


def update_form(db: Session, form_id: int, data: FormUpdate) -> Form | None:
    """Partial update — only non-None fields are applied."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(form, key, value)

    form.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(form)
    return form


def delete_form(db: Session, form_id: int) -> bool:
    """Delete a form. Cascades to questions, options, responses, answers via ORM."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        return False
    db.delete(form)
    db.commit()
    return True


def publish_form(db: Session, form_id: int) -> tuple[Form | None, str | None]:
    """
    Publish a form: generate a slug and set status to 'published'.

    Validation rules:
    - Must have at least 1 question.
    - All multiple_choice/dropdown questions must have >= 2 options.

    Returns (form, None) on success, or (None, error_message) on failure.
    """
    form = (
        db.query(Form)
        .options(joinedload(Form.questions).joinedload(Question.options))
        .filter(Form.id == form_id)
        .first()
    )
    if not form:
        return None, "Form not found"

    # Validation: at least 1 question
    if len(form.questions) == 0:
        return None, "Cannot publish a form with no questions"

    # Validation: choice/dropdown questions need >= 2 options
    invalid_questions = []
    for q in form.questions:
        if q.type in ("multiple_choice", "dropdown") and len(q.options) < 2:
            invalid_questions.append(q.id)

    if invalid_questions:
        return None, f"Questions {invalid_questions} need at least 2 options before publishing"

    # Generate slug if not already present (keep existing slug on re-publish)
    if not form.public_slug:
        form.public_slug = generate_slug()

    form.status = "published"
    form.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(form)
    return form, None


def unpublish_form(db: Session, form_id: int) -> Form | None:
    """Set status to draft but keep the existing slug (Module 1.5 consistent behavior)."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        return None

    form.status = "draft"
    form.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(form)
    return form


def duplicate_form(db: Session, form_id: int) -> Form | None:
    """
    Deep-copy a form with its questions and options.
    
    Module 1.5 item 4: Does NOT copy responses or answers.
    The duplicate starts as a fresh draft with response_count=0.
    """
    original = (
        db.query(Form)
        .options(joinedload(Form.questions).joinedload(Question.options))
        .filter(Form.id == form_id)
        .first()
    )
    if not original:
        return None

    # Create new form (draft, no slug)
    new_form = Form(
        creator_id=original.creator_id,
        title=f"{original.title} (Copy)",
        description=original.description,
        status="draft",
        public_slug=None,
        theme_color=original.theme_color,
        thank_you_message=original.thank_you_message,
    )
    db.add(new_form)
    db.flush()  # Get the new form's ID

    # Deep-copy questions and their options
    for q in original.questions:
        new_question = Question(
            form_id=new_form.id,
            type=q.type,
            title=q.title,
            description=q.description,
            is_required=q.is_required,
            order_index=q.order_index,
            settings_json=q.settings_json,
        )
        db.add(new_question)
        db.flush()

        for opt in q.options:
            new_option = QuestionOption(
                question_id=new_question.id,
                label=opt.label,
                order_index=opt.order_index,
            )
            db.add(new_option)

    db.commit()
    db.refresh(new_form)
    return new_form
