"""Tests for results & stats endpoints (Module 5)."""


def _setup_completed_responses(client, seeded_form):
    """Helper: publish form and create completed responses."""
    slug = client.post(f"/api/v1/forms/{seeded_form.id}/publish").json()["public_slug"]

    tokens = []
    for i, name in enumerate(["Alice", "Bob", "Carol"]):
        token = client.post(f"/api/v1/public/forms/{slug}/responses").json()["response_token"]
        tokens.append(token)

        for q in seeded_form.questions:
            if q.type == "short_text":
                value = name
            elif q.type == "multiple_choice":
                value = q.options[i % len(q.options)].label
            elif q.type == "email":
                value = f"{name.lower()}@test.com"
            else:
                value = name
            client.patch(f"/api/v1/public/responses/{token}/answers", json={"question_id": q.id, "value_text": value})

        client.post(f"/api/v1/public/responses/{token}/submit")

    return tokens


def test_list_responses(client, seeded_form):
    """List responses returns paginated results with previews."""
    _setup_completed_responses(client, seeded_form)

    resp = client.get(f"/api/v1/forms/{seeded_form.id}/responses")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert len(data["items"]) == 3
    assert data["items"][0]["is_complete"] is True


def test_response_detail(client, seeded_form, db_session):
    """Response detail includes all answers with question metadata."""
    _setup_completed_responses(client, seeded_form)

    from app.models.response import Response
    first_resp = db_session.query(Response).filter(Response.form_id == seeded_form.id).first()

    resp = client.get(f"/api/v1/responses/{first_resp.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["answers"]) >= 2
    assert data["answers"][0]["question_title"] is not None


def test_stats_aggregation(client, seeded_form):
    """Stats endpoint returns per-question aggregation."""
    _setup_completed_responses(client, seeded_form)

    resp = client.get(f"/api/v1/forms/{seeded_form.id}/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_responses"] == 3
    assert data["completion_rate"] == 100.0
    assert len(data["questions"]) == 3

    # Multiple choice question should have option counts
    mc_stat = [q for q in data["questions"] if q["type"] == "multiple_choice"][0]
    assert "options" in mc_stat
    total_count = sum(o["count"] for o in mc_stat["options"])
    assert total_count == 3


def test_csv_export(client, seeded_form):
    """CSV export returns valid CSV with headers and data rows."""
    _setup_completed_responses(client, seeded_form)

    resp = client.get(f"/api/v1/forms/{seeded_form.id}/responses/export")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]

    lines = resp.text.strip().split("\n")
    assert len(lines) >= 4  # header + 3 data rows


def test_response_detail_not_found(client, seeded_creator):
    """404 for non-existent response."""
    resp = client.get("/api/v1/responses/99999")
    assert resp.status_code == 404
