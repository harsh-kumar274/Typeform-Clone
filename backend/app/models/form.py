"""
Form model — the central entity that owns questions, responses, and publishing state.

Design decisions:
- `status` is constrained to 'draft'/'published' at the DB level for data integrity.
- `public_slug` is nullable until publish — enforces "must publish to get a link" at the data level.
- `theme_color` and `thank_you_message` are stored here (not in a separate settings table)
  because they're 1:1 with the form and don't warrant their own entity at this scope.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class Form(Base):
    __tablename__ = "forms"
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'published')", name="ck_form_status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("creators.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="draft")
    public_slug = Column(String, unique=True, nullable=True)
    theme_color = Column(String, default="#191919")
    thank_you_message = Column(Text, default="Thanks for completing this form!")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("Creator", back_populates="forms")
    questions = relationship(
        "Question",
        back_populates="form",
        cascade="all, delete-orphan",
        order_by="Question.order_index",
    )
    responses = relationship(
        "Response",
        back_populates="form",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Form(id={self.id}, title='{self.title}', status='{self.status}')>"
