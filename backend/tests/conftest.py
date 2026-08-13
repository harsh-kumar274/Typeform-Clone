"""
Shared test fixtures for the backend test suite.

Uses an in-memory SQLite database so tests are isolated and fast.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import create_app


# In-memory SQLite for test isolation
TEST_DATABASE_URL = "sqlite://"


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh in-memory DB for each test."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Create a TestClient that uses the in-memory DB."""
    app = create_app()

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c


@pytest.fixture
def seeded_creator(db_session):
    """Create a default creator for tests."""
    from app.models.creator import Creator
    creator = Creator(name="Test Creator", email="test@example.com")
    db_session.add(creator)
    db_session.commit()
    return creator


@pytest.fixture
def seeded_form(db_session, seeded_creator):
    """Create a draft form with questions for testing."""
    from app.models.form import Form
    from app.models.question import Question
    from app.models.question_option import QuestionOption

    form = Form(creator_id=seeded_creator.id, title="Test Form", description="A test form")
    db_session.add(form)
    db_session.flush()

    q1 = Question(form_id=form.id, type="short_text", title="Your name?", is_required=True, order_index=0)
    q2 = Question(form_id=form.id, type="multiple_choice", title="Favorite color?", is_required=True, order_index=1)
    q3 = Question(form_id=form.id, type="email", title="Your email?", is_required=False, order_index=2)
    db_session.add_all([q1, q2, q3])
    db_session.flush()

    opt1 = QuestionOption(question_id=q2.id, label="Red", order_index=0)
    opt2 = QuestionOption(question_id=q2.id, label="Blue", order_index=1)
    opt3 = QuestionOption(question_id=q2.id, label="Green", order_index=2)
    db_session.add_all([opt1, opt2, opt3])
    db_session.commit()

    return form
