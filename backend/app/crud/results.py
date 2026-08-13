"""
Results & Stats CRUD — powers the creator's response viewer and analytics.

Stats aggregation runs per-question:
- choice/dropdown/yes_no → option counts + percentages
- rating/number → average, min, max, distribution
- text types → response count + sample answers
"""
import json
import csv
import io
from collections import Counter
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.form import Form
from app.models.question import Question
from app.models.response import Response
from app.models.answer import Answer


def get_responses_list(db: Session, form_id: int, page: int = 1, per_page: int = 20) -> dict:
    """
    Paginated list of responses for a form.
    Includes a short answer preview (first non-empty answer text).
    """
    total = db.query(func.count(Response.id)).filter(Response.form_id == form_id).scalar()
    
    responses = (
        db.query(Response)
        .filter(Response.form_id == form_id)
        .order_by(Response.started_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    items = []
    for resp in responses:
        # Get first non-empty answer as preview
        first_answer = (
            db.query(Answer)
            .filter(Answer.response_id == resp.id, Answer.value_text != None, Answer.value_text != "")
            .first()
        )
        items.append({
            "id": resp.id,
            "public_token": resp.public_token,
            "is_complete": resp.is_complete,
            "started_at": resp.started_at,
            "submitted_at": resp.submitted_at,
            "answer_preview": (first_answer.value_text[:80] + "...") if first_answer and len(first_answer.value_text) > 80 else (first_answer.value_text if first_answer else None),
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page if total > 0 else 0,
    }


def get_response_detail(db: Session, response_id: int) -> dict | None:
    """Full response with all answers joined with question metadata."""
    response = (
        db.query(Response)
        .options(joinedload(Response.answers).joinedload(Answer.question))
        .filter(Response.id == response_id)
        .first()
    )
    if not response:
        return None

    answers = []
    for a in sorted(response.answers, key=lambda x: x.question.order_index if x.question else 0):
        answers.append({
            "id": a.id,
            "question_id": a.question_id,
            "response_id": a.response_id,
            "value_text": a.value_text,
            "created_at": a.created_at,
            "question_title": a.question.title if a.question else None,
            "question_type": a.question.type if a.question else None,
        })

    return {
        "id": response.id,
        "form_id": response.form_id,
        "public_token": response.public_token,
        "is_complete": response.is_complete,
        "started_at": response.started_at,
        "submitted_at": response.submitted_at,
        "answers": answers,
    }


def get_form_stats(db: Session, form_id: int) -> dict:
    """
    Per-question aggregated statistics.

    For each question:
    - choice/dropdown/yes_no: option counts and percentages
    - rating/number: average, min, max, count, distribution buckets
    - text types: response count and up to 5 sample answers
    """
    form = (
        db.query(Form)
        .options(joinedload(Form.questions).joinedload(Question.options))
        .filter(Form.id == form_id)
        .first()
    )
    if not form:
        return {"questions": []}

    total_responses = db.query(func.count(Response.id)).filter(
        Response.form_id == form_id, Response.is_complete == True
    ).scalar()

    total_sessions = db.query(func.count(Response.id)).filter(
        Response.form_id == form_id
    ).scalar()

    question_stats = []
    for q in sorted(form.questions, key=lambda x: x.order_index):
        answers = (
            db.query(Answer)
            .join(Response)
            .filter(Answer.question_id == q.id, Response.is_complete == True)
            .all()
        )

        stat = {
            "question_id": q.id,
            "title": q.title,
            "type": q.type,
            "response_count": len(answers),
        }

        values = [a.value_text for a in answers if a.value_text and a.value_text.strip()]

        if q.type in ("multiple_choice", "dropdown"):
            counter = Counter(values)
            total = sum(counter.values())
            option_labels = [opt.label for opt in q.options]
            stat["options"] = [
                {
                    "label": label,
                    "count": counter.get(label, 0),
                    "percentage": round(counter.get(label, 0) / total * 100, 1) if total > 0 else 0,
                }
                for label in option_labels
            ]

        elif q.type == "yes_no":
            counter = Counter(v.lower() for v in values)
            total = sum(counter.values())
            stat["options"] = [
                {"label": "Yes", "count": counter.get("yes", 0), "percentage": round(counter.get("yes", 0) / total * 100, 1) if total > 0 else 0},
                {"label": "No", "count": counter.get("no", 0), "percentage": round(counter.get("no", 0) / total * 100, 1) if total > 0 else 0},
            ]

        elif q.type in ("rating", "number"):
            numeric_values = []
            for v in values:
                try:
                    numeric_values.append(float(v))
                except ValueError:
                    pass

            if numeric_values:
                stat["average"] = round(sum(numeric_values) / len(numeric_values), 2)
                stat["min"] = min(numeric_values)
                stat["max"] = max(numeric_values)

                # Distribution buckets
                if q.type == "rating":
                    max_rating = 5
                    if q.settings_json:
                        settings = json.loads(q.settings_json)
                        max_rating = settings.get("maxRating", 5)
                    stat["distribution"] = [
                        {"value": i, "count": numeric_values.count(float(i))}
                        for i in range(1, max_rating + 1)
                    ]
                else:
                    # For number type, create 5 buckets
                    min_val, max_val = min(numeric_values), max(numeric_values)
                    if min_val == max_val:
                        stat["distribution"] = [{"range": f"{min_val}", "count": len(numeric_values)}]
                    else:
                        bucket_size = (max_val - min_val) / 5
                        stat["distribution"] = []
                        for i in range(5):
                            low = min_val + i * bucket_size
                            high = min_val + (i + 1) * bucket_size
                            count = sum(1 for v in numeric_values if low <= v < high or (i == 4 and v == high))
                            stat["distribution"].append({
                                "range": f"{low:.0f}-{high:.0f}",
                                "count": count,
                            })
            else:
                stat["average"] = None
                stat["min"] = None
                stat["max"] = None
                stat["distribution"] = []

        else:
            # short_text, long_text, email
            stat["sample_answers"] = values[:5]

        question_stats.append(stat)

    return {
        "form_id": form_id,
        "total_responses": total_responses,
        "total_sessions": total_sessions,
        "completion_rate": round(total_responses / total_sessions * 100, 1) if total_sessions > 0 else 0,
        "questions": question_stats,
    }


def export_csv(db: Session, form_id: int) -> str:
    """
    Generate CSV export of all complete responses for a form.
    Returns the CSV content as a string.
    """
    form = (
        db.query(Form)
        .options(joinedload(Form.questions))
        .filter(Form.id == form_id)
        .first()
    )
    if not form:
        return ""

    questions = sorted(form.questions, key=lambda q: q.order_index)
    
    responses = (
        db.query(Response)
        .options(joinedload(Response.answers))
        .filter(Response.form_id == form_id, Response.is_complete == True)
        .order_by(Response.submitted_at.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)

    # Header row
    headers = ["Response ID", "Submitted At"] + [q.title for q in questions]
    writer.writerow(headers)

    # Data rows
    for resp in responses:
        answer_map = {a.question_id: a.value_text for a in resp.answers}
        row = [resp.id, resp.submitted_at.isoformat() if resp.submitted_at else ""]
        for q in questions:
            row.append(answer_map.get(q.id, ""))
        writer.writerow(row)

    return output.getvalue()
