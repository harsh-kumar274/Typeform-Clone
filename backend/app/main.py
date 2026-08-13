"""
FastAPI application factory for the Typeform Clone backend.

CORS is configured from the FRONTEND_URL environment variable so that
deploying to a different origin (e.g., Vercel) doesn't require code changes.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.database import engine, Base
from app.models import Creator, Form, Question, QuestionOption, Response, Answer  # noqa: F401 — registers all tables with Base.metadata
from app.routers import health, forms, questions, respond, results

load_dotenv()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Typeform Clone API",
        description="Backend API for a Typeform-style form builder",
        version="1.0.0",
    )

    # --- CORS ---
    # Read from env so deployed frontends aren't CORS-blocked.
    # Falls back to localhost:3000 for local dev.
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    origins = [frontend_url]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Create tables ---
    # Fine for SQLite dev; use Alembic migrations for production.
    Base.metadata.create_all(bind=engine)

    # --- Mount routers ---
    app.include_router(health.router, prefix="/api/v1", tags=["health"])
    app.include_router(forms.router, prefix="/api/v1", tags=["forms"])
    app.include_router(questions.router, prefix="/api/v1", tags=["questions"])
    app.include_router(respond.router, prefix="/api/v1", tags=["public"])
    app.include_router(results.router, prefix="/api/v1", tags=["results"])

    return app


app = create_app()
