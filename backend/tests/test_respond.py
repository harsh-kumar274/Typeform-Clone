"""Tests for public respondent endpoints (Module 4)."""
import json


def _publish_form(client, form_id):
    """Helper: publish a form and return the slug."""
    resp = client.post(f"/api/v1/forms/{form_id}/publish")
    return resp.json()["public_slug"]


def _start_response(client, slug):
    """Helper: start a response and return the token."""
    resp = client.post(f"/api/v1/public/forms/{slug}/responses")
    return resp.json()["response_token"]


def test_get_public_form(client, seeded_form):
    """Public form endpoint returns the form when published."""
    slug = _publish_form(client, seeded_form.id)
    resp = client.get(f"/api/v1/public/forms/{slug}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Test Form"


def test_get_public_form_not_published(client, seeded_form):
    """404 for draft forms (not published)."""
    resp = client.get("/api/v1/public/forms/nonexistent-slug")
    assert resp.status_code == 404


def test_start_response_returns_token(client, seeded_form):
    """Starting a response returns a public_token, not an integer ID."""
    slug = _publish_form(client, seeded_form.id)
    resp = client.post(f"/api/v1/public/forms/{slug}/responses")
    assert resp.status_code == 201
    data = resp.json()
    assert "response_token" in data
    assert isinstance(data["response_token"], str)
    assert len(data["response_token"]) > 10  # nanoid


def test_save_answer_text(client, seeded_form):
    """Saving a short_text answer works."""
    slug = _publish_form(client, seeded_form.id)
    token = _start_response(client, slug)
    q_id = seeded_form.questions[0].id  # short_text

    resp = client.patch(
        f"/api/v1/public/responses/{token}/answers",
        json={"question_id": q_id, "value_text": "Alice"},
    )
    assert resp.status_code == 200
    assert resp.json()["value_text"] == "Alice"


def test_save_answer_upsert(client, seeded_form):
    """Re-answering a question updates the existing answer, doesn't create a duplicate."""
    slug = _publish_form(client, seeded_form.id)
    token = _start_response(client, slug)
    q_id = seeded_form.questions[0].id

    # First answer
    client.patch(f"/api/v1/public/responses/{token}/answers", json={"question_id": q_id, "value_text": "Alice"})
    # Update
    resp = client.patch(f"/api/v1/public/responses/{token}/answers", json={"question_id": q_id, "value_text": "Bob"})
    assert resp.status_code == 200
    assert resp.json()["value_text"] == "Bob"


def test_save_answer_invalid_email(client, seeded_form):
    """Email validation rejects invalid email addresses."""
    slug = _publish_form(client, seeded_form.id)
    token = _start_response(client, slug)
    email_q = [q for q in seeded_form.questions if q.type == "email"][0]

    resp = client.patch(
        f"/api/v1/public/responses/{token}/answers",
        json={"question_id": email_q.id, "value_text": "not-an-email"},
    )
    assert resp.status_code == 400
    assert "email" in resp.json()["detail"].lower()


def test_save_answer_invalid_choice(client, seeded_form):
    """Choice validation rejects values not in the option list."""
    slug = _publish_form(client, seeded_form.id)
    token = _start_response(client, slug)
    mc_q = [q for q in seeded_form.questions if q.type == "multiple_choice"][0]

    resp = client.patch(
        f"/api/v1/public/responses/{token}/answers",
        json={"question_id": mc_q.id, "value_text": "Invalid Option"},
    )
    assert resp.status_code == 400
    assert "not a valid option" in resp.json()["detail"].lower()


def test_submit_response_success(client, seeded_form):
    """Submitting with all required questions answered succeeds."""
    slug = _publish_form(client, seeded_form.id)
    token = _start_response(client, slug)

    # Answer all required questions
    for q in seeded_form.questions:
        if q.is_required:
            if q.type == "short_text":
                value = "Alice"
            elif q.type == "multiple_choice":
                value = q.options[0].label
            else:
                value = "test@test.com"
            client.patch(f"/api/v1/public/responses/{token}/answers", json={"question_id": q.id, "value_text": value})

    resp = client.post(f"/api/v1/public/responses/{token}/submit")
    assert resp.status_code == 200


def test_submit_missing_required(client, seeded_form):
    """Submitting with missing required answers fails with 400."""
    slug = _publish_form(client, seeded_form.id)
    token = _start_response(client, slug)

    # Don't answer any questions
    resp = client.post(f"/api/v1/public/responses/{token}/submit")
    assert resp.status_code == 400
    assert "required" in resp.json()["detail"].lower()


def test_resume_response(client, seeded_form):
    """Module 1.5 item 3: Resume endpoint returns saved answers."""
    slug = _publish_form(client, seeded_form.id)
    token = _start_response(client, slug)
    q_id = seeded_form.questions[0].id

    # Save an answer
    client.patch(f"/api/v1/public/responses/{token}/answers", json={"question_id": q_id, "value_text": "Alice"})

    # Resume
    resp = client.get(f"/api/v1/public/responses/{token}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_complete"] == False
    assert len(data["answers"]) == 1
    assert data["answers"][0]["value_text"] == "Alice"


def test_cannot_answer_after_submit(client, seeded_form):
    """Cannot save answers after response is submitted."""
    slug = _publish_form(client, seeded_form.id)
    token = _start_response(client, slug)

    # Answer required and submit
    for q in seeded_form.questions:
        if q.is_required:
            if q.type == "short_text":
                value = "Alice"
            elif q.type == "multiple_choice":
                value = q.options[0].label
            else:
                value = "test@test.com"
            client.patch(f"/api/v1/public/responses/{token}/answers", json={"question_id": q.id, "value_text": value})
    client.post(f"/api/v1/public/responses/{token}/submit")

    # Try to answer again
    resp = client.patch(
        f"/api/v1/public/responses/{token}/answers",
        json={"question_id": seeded_form.questions[0].id, "value_text": "Bob"},
    )
    assert resp.status_code == 400
