"""
Response model — represents one respondent's submission session.

Design decisions (Module 1.5 item 2):
- `id` (integer PK) is used for internal joins/FKs and creator-facing endpoints.
- `public_token` (nanoid, 21 chars) is used in ALL public-facing URLs to prevent
  sequential ID enumeration attacks. Without auth on public endpoints, an integer
  ID would let anyone increment the URL and read/overwrite another user's response.
- `is_complete` tracks partial vs. submitted responses for the partial-response bonus.
"""
from datetime import datetime
import nanoid
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


def _generate_token():
    """Generate a cryptographically random 21-char token for public URLs."""
    return nanoid.generate(size=21)


class Response(Base):
    __tablename__ = "responses"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id", ondelete="CASCADE"), nullable=False)
    public_token = Column(String, unique=True, nullable=False, default=_generate_token)
    is_complete = Column(Boolean, default=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)

    # Relationships
    form = relationship("Form", back_populates="responses")
    answers = relationship(
        "Answer",
        back_populates="response",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Response(id={self.id}, form_id={self.form_id}, complete={self.is_complete})>"
