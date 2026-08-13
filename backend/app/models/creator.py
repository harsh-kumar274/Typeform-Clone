"""
Creator model — simplified single-user model.

Design decision: modeled as a proper table (not hardcoded) so the schema
is future-proof for multi-user auth. For this project scope, a single
default creator is seeded and all forms are assigned to creator_id=1.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship

from app.database import Base


class Creator(Base):
    __tablename__ = "creators"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # One creator has many forms
    forms = relationship("Form", back_populates="creator")

    def __repr__(self):
        return f"<Creator(id={self.id}, name='{self.name}', email='{self.email}')>"
