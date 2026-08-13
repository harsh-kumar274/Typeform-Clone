"""Tests for form management endpoints (Module 2)."""


def test_list_forms_empty(client, seeded_creator):
    """Dashboard shows empty list when no forms exist."""
    resp = client.get("/api/v1/forms")
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_form(client, seeded_creator):
    """Creating a form returns a draft with the given title."""
    resp = client.post("/api/v1/forms", json={"title": "My Survey"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "My Survey"
    assert data["status"] == "draft"
    assert data["public_slug"] is None


def test_get_form_with_questions(client, seeded_form):
    """Getting a form returns nested questions and options."""
    resp = client.get(f"/api/v1/forms/{seeded_form.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Test Form"
    assert len(data["questions"]) == 3
    # The multiple_choice question should have options
    mc_question = [q for q in data["questions"] if q["type"] == "multiple_choice"][0]
    assert len(mc_question["options"]) == 3


def test_get_form_not_found(client, seeded_creator):
    """404 for non-existent form."""
    resp = client.get("/api/v1/forms/9999")
    assert resp.status_code == 404


def test_update_form(client, seeded_form):
    """Partial update changes only specified fields."""
    resp = client.patch(f"/api/v1/forms/{seeded_form.id}", json={"title": "Updated Title"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Title"
    assert resp.json()["description"] == "A test form"  # unchanged


def test_delete_form(client, seeded_form):
    """Deleting a form cascades to questions."""
    resp = client.delete(f"/api/v1/forms/{seeded_form.id}")
    assert resp.status_code == 204
    # Confirm gone
    resp2 = client.get(f"/api/v1/forms/{seeded_form.id}")
    assert resp2.status_code == 404


def test_publish_form_success(client, seeded_form):
    """Publishing a form with questions generates a slug."""
    resp = client.post(f"/api/v1/forms/{seeded_form.id}/publish")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "published"
    assert data["public_slug"] is not None
    assert len(data["public_slug"]) > 0


def test_publish_form_no_questions(client, seeded_creator):
    """Cannot publish a form with no questions."""
    create_resp = client.post("/api/v1/forms", json={"title": "Empty Form"})
    form_id = create_resp.json()["id"]
    resp = client.post(f"/api/v1/forms/{form_id}/publish")
    assert resp.status_code == 400
    assert "no questions" in resp.json()["detail"].lower()


def test_unpublish_keeps_slug(client, seeded_form):
    """Unpublishing sets status to draft but preserves the slug."""
    # Publish first
    client.post(f"/api/v1/forms/{seeded_form.id}/publish")
    pub_data = client.get(f"/api/v1/forms/{seeded_form.id}").json()
    slug = pub_data["public_slug"]

    # Unpublish
    resp = client.post(f"/api/v1/forms/{seeded_form.id}/unpublish")
    assert resp.status_code == 200
    assert resp.json()["status"] == "draft"
    assert resp.json()["public_slug"] == slug  # slug preserved


def test_duplicate_form(client, seeded_form):
    """Duplicate creates a copy with fresh questions, no responses."""
    resp = client.post(f"/api/v1/forms/{seeded_form.id}/duplicate")
    assert resp.status_code == 201
    data = resp.json()
    assert "(Copy)" in data["title"]
    assert data["status"] == "draft"
    assert data["public_slug"] is None
    assert len(data["questions"]) == 3  # questions copied
    # IDs should be different from original
    assert data["id"] != seeded_form.id


def test_duplicate_does_not_copy_responses(client, seeded_form, db_session):
    """Module 1.5 item 4: Duplicate must not copy responses."""
    from app.models.response import Response
    from app.models.answer import Answer

    # Add a response to the original
    resp_obj = Response(form_id=seeded_form.id, is_complete=True)
    db_session.add(resp_obj)
    db_session.flush()
    db_session.add(Answer(response_id=resp_obj.id, question_id=seeded_form.questions[0].id, value_text="test"))
    db_session.commit()

    # Duplicate
    resp = client.post(f"/api/v1/forms/{seeded_form.id}/duplicate")
    dup_id = resp.json()["id"]

    # Verify duplicate has 0 responses
    list_resp = client.get("/api/v1/forms")
    dup_form = [f for f in list_resp.json() if f["id"] == dup_id][0]
    assert dup_form["response_count"] == 0


def test_list_forms_with_response_count(client, seeded_form, db_session):
    """Dashboard listing includes accurate response counts."""
    from app.models.response import Response

    db_session.add(Response(form_id=seeded_form.id))
    db_session.add(Response(form_id=seeded_form.id))
    db_session.commit()

    resp = client.get("/api/v1/forms")
    assert resp.status_code == 200
    form = resp.json()[0]
    assert form["response_count"] == 2
