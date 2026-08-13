"""
Respondent CRUD operations — handles public form access, response sessions,
answer upsert, and submission.

Design decisions:
- All public endpoints use `public_token` (not integer ID) per Module 1.5 item 2.
- Answer save is a true upsert: SELECT existing → update or INSERT, enforced
  by the UniqueConstraint on (response_id, question_id) per Module 1.5 item 1.
- Type-specific validation runs server-side on every answer save.
"""
import re
from datetime import datetime
from sqlalchemy.orm import Session, joinedload

from app.models.form import Form
from app.models.question import Question
from app.models.question_option import QuestionOption
from app.models.response import Response
from app.models.answer import Answer


def get_public_form(db: Session, slug: str) -> Form | None:
    """Fetch a published form by slug, with questions and options eager-loaded."""
    return (
        db.query(Form)
        .options(joinedload(Form.questions).joinedload(Question.options))
        .filter(Form.public_slug == slug, Form.status == "published")
        .first()
    )


def start_response(db: Session, form_id: int) -> Response:
    """Create a new response session for a form."""
    response = Response(form_id=form_id)
    db.add(response)
    db.commit()
    db.refresh(response)
    return response


def get_response_by_token(db: Session, token: str) -> Response | None:
    """Fetch a response by its public_token (Module 1.5 item 2)."""
    return (
        db.query(Response)
        .options(joinedload(Response.answers))
        .filter(Response.public_token == token)
        .first()
    )


def upsert_answer(
    db: Session, response: Response, question_id: int, value_text: str | None
) -> tuple[Answer | None, str | None]:
    """
    Save (upsert) a single answer.

    True upsert: checks for existing answer on this (response, question) pair
    and updates it if found, otherwise creates a new one.
    This handles client retries and back-navigation safely per Module 1.5 item 1.
    
    Returns (answer, None) on success, (None, error_message) on validation failure.
    """
    # Fetch the question to validate the answer
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        return None, f"Question {question_id} not found"

    # Verify question belongs to the same form as the response
    if question.form_id != response.form_id:
        return None, f"Question {question_id} does not belong to this form"

    # Type-specific validation
    error = _validate_answer(db, question, value_text)
    if error:
        return None, error

    # Upsert: find existing or create new
    existing = (
        db.query(Answer)
        .filter(Answer.response_id == response.id, Answer.question_id == question_id)
        .first()
    )

    if existing:
        existing.value_text = value_text
        db.commit()
        db.refresh(existing)
        return existing, None
    else:
        answer = Answer(
            response_id=response.id,
            question_id=question_id,
            value_text=value_text,
        )
        db.add(answer)
        db.commit()
        db.refresh(answer)
        return answer, None


def submit_response(db: Session, response: Response) -> tuple[bool, str | None]:
    """
    Mark a response as complete.

    Validates that all required questions have been answered.
    Returns (True, None) on success, (False, error_message) on failure.
    """
    if response.is_complete:
        return False, "Response already submitted"

    # Get all required questions for this form
    required_questions = (
        db.query(Question)
        .filter(Question.form_id == response.form_id, Question.is_required == True)
        .all()
    )

    # Check which required questions have answers
    answered_question_ids = set(
        a.question_id for a in
        db.query(Answer.question_id)
        .filter(Answer.response_id == response.id)
        .all()
    )

    missing = [q.id for q in required_questions if q.id not in answered_question_ids]
    if missing:
        return False, f"Required questions not answered: {missing}"

    # Also validate non-empty answers for required questions
    for q in required_questions:
        answer = (
            db.query(Answer)
            .filter(Answer.response_id == response.id, Answer.question_id == q.id)
            .first()
        )
        if answer and (answer.value_text is None or answer.value_text.strip() == ""):
            missing.append(q.id)

    if missing:
        return False, f"Required questions have empty answers: {missing}"

    response.is_complete = True
    response.submitted_at = datetime.utcnow()
    db.commit()
    return True, None


def _validate_answer(db: Session, question: Question, value_text: str | None) -> str | None:
    """
    Type-specific answer validation.
    
    Returns None if valid, error message string if invalid.
    Empty/None values are allowed here — required-field checking happens at submit time.
    """
    if value_text is None or value_text.strip() == "":
        return None  # Empty is OK at save-time; required check is at submit

    value = value_text.strip()

    if question.type == "email":
        # Basic email pattern validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, value):
            return "Please enter a valid email address"

    elif question.type == "number":
        try:
            num = float(value)
        except ValueError:
            return "Please enter a valid number"

        # Check min/max from settings_json
        if question.settings_json:
            import json
            settings = json.loads(question.settings_json)
            if "min" in settings and num < settings["min"]:
                return f"Value must be at least {settings['min']}"
            if "max" in settings and num > settings["max"]:
                return f"Value must be at most {settings['max']}"

    elif question.type == "yes_no":
        if value.lower() not in ("yes", "no"):
            return "Please answer Yes or No"

    elif question.type == "rating":
        try:
            rating = int(value)
        except ValueError:
            return "Please enter a valid rating"

        max_rating = 5
        if question.settings_json:
            import json
            settings = json.loads(question.settings_json)
            max_rating = settings.get("maxRating", 5)

        if rating < 1 or rating > max_rating:
            return f"Rating must be between 1 and {max_rating}"

    elif question.type in ("multiple_choice", "dropdown"):
        # Value must match one of the existing option labels
        valid_labels = [
            opt.label for opt in
            db.query(QuestionOption)
            .filter(QuestionOption.question_id == question.id)
            .all()
        ]
        if value not in valid_labels:
            return f"'{value}' is not a valid option. Valid options: {valid_labels}"

    # short_text and long_text have no special validation
    return None
