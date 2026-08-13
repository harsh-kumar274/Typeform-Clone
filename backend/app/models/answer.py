"""
Answer model — stores one answer per question per response.

Design decisions:
- `value_text` is a single polymorphic TEXT column. Numbers, booleans, and option
  labels are all stored as strings and cast on read. This is a deliberate
  simplification for this project scope — in production, you'd normalize into
  typed columns or use a validated JSON column.
- UniqueConstraint on (response_id, question_id) prevents duplicate answers
  from client retries or re-answering (Module 1.5 item 1). The CRUD layer
  must do SELECT-then-upsert, not blind INSERT.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class Answer(Base):
    __tablename__ = "answers"
    __table_args__ = (
        UniqueConstraint("response_id", "question_id", name="uq_answer_response_question"),
    )

    id = Column(Integer, primary_key=True, index=True)
    response_id = Column(Integer, ForeignKey("responses.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    value_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    response = relationship("Response", back_populates="answers")
    question = relationship("Question", back_populates="answers")

    def __repr__(self):
        return f"<Answer(id={self.id}, question_id={self.question_id}, value='{self.value_text}')>"
