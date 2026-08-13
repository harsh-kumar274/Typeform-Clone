"""
Results & Stats router — creator-facing endpoints for viewing responses and analytics.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud import results as results_crud

router = APIRouter()


@router.get("/forms/{form_id}/responses")
def list_responses(
    form_id: int,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Paginated list of responses for a form with answer preview."""
    return results_crud.get_responses_list(db, form_id, page, per_page)


@router.get("/responses/{response_id}")
def get_response_detail(response_id: int, db: Session = Depends(get_db)):
    """Full single response with all answers and question metadata."""
    detail = results_crud.get_response_detail(db, response_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Response not found")
    return detail


@router.get("/forms/{form_id}/stats")
def get_form_stats(form_id: int, db: Session = Depends(get_db)):
    """Per-question aggregated statistics for a form."""
    return results_crud.get_form_stats(db, form_id)


@router.get("/forms/{form_id}/responses/export")
def export_responses(form_id: int, db: Session = Depends(get_db)):
    """Download all complete responses as a CSV file."""
    csv_content = results_crud.export_csv(db, form_id)
    if not csv_content:
        raise HTTPException(status_code=404, detail="Form not found or no responses")

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=form_{form_id}_responses.csv"},
    )
