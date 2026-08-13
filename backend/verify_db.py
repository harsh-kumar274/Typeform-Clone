"""Quick verification script for Module 1 + 1.5 patches."""
from app.database import SessionLocal, engine
from app.models import Creator, Form, Question, QuestionOption, Response, Answer
from sqlalchemy import text, inspect

db = SessionLocal()

# 1. Check tables exist
inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"Tables: {tables}")

# 2. Check data counts
print(f"Creators: {db.query(Creator).count()}")
print(f"Forms: {db.query(Form).count()}")
print(f"Questions: {db.query(Question).count()}")
print(f"Options: {db.query(QuestionOption).count()}")
print(f"Responses: {db.query(Response).count()}")
print(f"Answers: {db.query(Answer).count()}")

# 3. Module 1.5 item 2: Check public_token on responses
responses = db.query(Response).all()
print(f"\nResponse tokens (Module 1.5 item 2):")
for r in responses[:3]:
    print(f"  Response {r.id}: token={r.public_token}")
print(f"  ... ({len(responses)} total)")

# 4. Module 1.5 item 1: Check unique constraint exists
result = db.execute(text("SELECT sql FROM sqlite_master WHERE type='table' AND name='answers'")).first()
schema = result[0] if result else "NOT FOUND"
has_constraint = "uq_answer_response_question" in schema.lower() if result else False
print(f"\nAnswer table schema contains unique constraint: {has_constraint}")

# 5. Check no duplicate (response_id, question_id) pairs
dup_check = db.execute(text(
    "SELECT response_id, question_id, COUNT(*) as cnt FROM answers GROUP BY response_id, question_id HAVING cnt > 1"
)).fetchall()
print(f"Duplicate answer pairs: {len(dup_check)} (should be 0)")

db.close()
print("\nVerification complete!")
