"""
Form management router — CRUD endpoints for the creator dashboard and builder.

All endpoints assume a single default creator (creator_id=1).
No authentication is needed for this project scope.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud import forms as forms_crud
from app.schemas.form import FormCreate, FormUpdate, FormRead, FormListItem

router = APIRouter()


@router.get("/forms", response_model=list[FormListItem])
def list_forms(db: Session = Depends(get_db)):
    """List all forms with response counts for the dashboard."""
    return forms_crud.get_forms(db)


@router.post("/forms", response_model=FormRead, status_code=201)
def create_form(data: FormCreate, db: Session = Depends(get_db)):
    """Create a new draft form. Only title is required."""
    return forms_crud.create_form(db, data)


@router.get("/forms/{form_id}", response_model=FormRead)
def get_form(form_id: int, db: Session = Depends(get_db)):
    """Get a form with all its questions and options (for the builder)."""
    form = forms_crud.get_form(db, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return form


@router.patch("/forms/{form_id}", response_model=FormRead)
def update_form(form_id: int, data: FormUpdate, db: Session = Depends(get_db)):
    """Partial update: title, description, theme_color, thank_you_message."""
    form = forms_crud.update_form(db, form_id, data)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    # Re-fetch with eager loading for the response schema
    return forms_crud.get_form(db, form.id)


@router.delete("/forms/{form_id}", status_code=204)
def delete_form(form_id: int, db: Session = Depends(get_db)):
    """Delete a form and all its questions, responses, and answers (cascade)."""
    if not forms_crud.delete_form(db, form_id):
        raise HTTPException(status_code=404, detail="Form not found")
    return None


@router.post("/forms/{form_id}/publish", response_model=FormRead)
def publish_form(form_id: int, db: Session = Depends(get_db)):
    """
    Publish a form — generates a public slug and sets status to 'published'.
    
    Fails with 400 if:
    - The form has no questions.
    - Any multiple_choice/dropdown question has fewer than 2 options.
    """
    form, error = forms_crud.publish_form(db, form_id)
    if error:
        if "not found" in error.lower():
            raise HTTPException(status_code=404, detail=error)
        raise HTTPException(status_code=400, detail=error)
    return forms_crud.get_form(db, form.id)


@router.post("/forms/{form_id}/unpublish", response_model=FormRead)
def unpublish_form(form_id: int, db: Session = Depends(get_db)):
    """Set form status back to draft. Keeps the existing slug."""
    form = forms_crud.unpublish_form(db, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return forms_crud.get_form(db, form.id)


@router.post("/forms/{form_id}/duplicate", response_model=FormRead, status_code=201)
def duplicate_form(form_id: int, db: Session = Depends(get_db)):
    """
    Deep-copy a form with its questions and options.
    Does NOT copy responses — the duplicate starts fresh.
    """
    form = forms_crud.duplicate_form(db, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return forms_crud.get_form(db, form.id)
