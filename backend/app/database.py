"""
Database configuration for the Typeform Clone backend.

Uses SQLAlchemy with SQLite for simplicity — in production, swap the
DATABASE_URL for a PostgreSQL connection string without changing any
application code, since all queries go through the ORM.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./typeform.db")

# SQLite-specific: check_same_thread=False is required for FastAPI's
# async request handling to work with SQLite's single-writer model.
# connect_args is ignored by other DB backends.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency that yields a DB session per request.
    The session is committed/rolled-back and closed automatically.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
