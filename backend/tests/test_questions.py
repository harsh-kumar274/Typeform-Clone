"""Tests for question & option endpoints (Module 3)."""


def test_add_question(client, seeded_form):
    """Adding a question auto-assigns order_index."""
    resp = client.post(
        f"/api/v1/forms/{seeded_form.id}/questions",
        json={"type": "rating", "title": "Rate us", "is_required": True, "settings_json": {"maxRating": 5}},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["type"] == "rating"
    assert data["order_index"] == 3  # 0,1,2 already exist


def test_update_question(client, seeded_form):
    """Partial update changes only specified fields."""
    q_id = seeded_form.questions[0].id
    resp = client.patch(f"/api/v1/questions/{q_id}", json={"title": "New Title"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "New Title"
    assert resp.json()["type"] == "short_text"  # unchanged


def test_delete_question_renormalizes_order(client, seeded_form):
    """Module 1.5 item 5: Deleting renormalizes sibling order_index to 0,1,2,..."""
    # Delete the middle question (order_index=1)
    q_ids = [q.id for q in seeded_form.questions]
    client.delete(f"/api/v1/questions/{q_ids[1]}")

    # Check remaining questions have contiguous order
    form_resp = client.get(f"/api/v1/forms/{seeded_form.id}")
    questions = form_resp.json()["questions"]
    assert len(questions) == 2
    assert questions[0]["order_index"] == 0
    assert questions[1]["order_index"] == 1


def test_reorder_questions(client, seeded_form):
    """Bulk reorder updates order_index for all submitted questions."""
    q_ids = [q.id for q in seeded_form.questions]
    # Reverse the order
    order_data = [
        {"id": q_ids[2], "order_index": 0},
        {"id": q_ids[1], "order_index": 1},
        {"id": q_ids[0], "order_index": 2},
    ]
    resp = client.post(f"/api/v1/forms/{seeded_form.id}/questions/reorder", json=order_data)
    assert resp.status_code == 200

    # Verify new order
    form_resp = client.get(f"/api/v1/forms/{seeded_form.id}")
    questions = form_resp.json()["questions"]
    assert questions[0]["id"] == q_ids[2]
    assert questions[1]["id"] == q_ids[1]
    assert questions[2]["id"] == q_ids[0]


def test_reorder_invalid_ids(client, seeded_form):
    """Reorder rejects IDs that don't belong to the target form."""
    resp = client.post(
        f"/api/v1/forms/{seeded_form.id}/questions/reorder",
        json=[{"id": 99999, "order_index": 0}],
    )
    assert resp.status_code == 400
    assert "do not belong" in resp.json()["detail"]


def test_add_option_to_choice(client, seeded_form):
    """Adding an option to a multiple_choice question works."""
    mc_q = [q for q in seeded_form.questions if q.type == "multiple_choice"][0]
    resp = client.post(f"/api/v1/questions/{mc_q.id}/options", json={"label": "Yellow"})
    assert resp.status_code == 201
    assert resp.json()["label"] == "Yellow"


def test_add_option_to_non_choice_fails(client, seeded_form):
    """Cannot add options to non-choice question types."""
    text_q = [q for q in seeded_form.questions if q.type == "short_text"][0]
    resp = client.post(f"/api/v1/questions/{text_q.id}/options", json={"label": "Nope"})
    assert resp.status_code == 400


def test_publish_with_insufficient_options(client, seeded_creator, db_session):
    """Cannot publish if a choice question has fewer than 2 options."""
    from app.models.form import Form
    from app.models.question import Question
    from app.models.question_option import QuestionOption

    form = Form(creator_id=seeded_creator.id, title="Bad Form")
    db_session.add(form)
    db_session.flush()
    q = Question(form_id=form.id, type="multiple_choice", title="Pick one", order_index=0)
    db_session.add(q)
    db_session.flush()
    db_session.add(QuestionOption(question_id=q.id, label="Only One", order_index=0))
    db_session.commit()

    resp = client.post(f"/api/v1/forms/{form.id}/publish")
    assert resp.status_code == 400
    assert "at least 2 options" in resp.json()["detail"]
