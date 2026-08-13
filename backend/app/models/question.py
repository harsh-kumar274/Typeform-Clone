"""
Question model — represents a single question within a form.

Design decisions:
- `type` is constrained at the DB level to the 8 supported question types.
- `order_index` drives drag-and-drop ordering; renormalized on delete (Module 1.5 item 5).
- `settings_json` is a TEXT column storing JSON — keeps the schema stable as
  type-specific config evolves (e.g., {"maxRating": 5}, {"min": 0, "max": 100})
  without new columns or migrations.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship

from app.database import Base


QUESTION_TYPES = (
    "short_text", "long_text", "multiple_choice", "dropdown",
    "email", "number", "yes_no", "rating"
)

QUESTION_TYPE_CHECK = "type IN ('short_text','long_text','multiple_choice','dropdown','email','number','yes_no','rating')"


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (
        CheckConstraint(QUESTION_TYPE_CHECK, name="ck_question_type"),
    )

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_required = Column(Boolean, default=False)
    order_index = Column(Integer, nullable=False)
    settings_json = Column(Text, nullable=True)  # JSON string for type-specific config
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    form = relationship("Form", back_populates="questions")
    options = relationship(
        "QuestionOption",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="QuestionOption.order_index",
    )
    answers = relationship("Answer", back_populates="question")

    def __repr__(self):
        return f"<Question(id={self.id}, type='{self.type}', title='{self.title}')>"
