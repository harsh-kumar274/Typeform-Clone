"""
Idempotent seed script — creates sample data for development and demo.

Run: `python -m app.seed` from the backend/ directory.

Idempotency: checks if data exists before inserting. Safe to run multiple times.
Creates:
  - 1 default creator
  - 2 published forms with all 8 question types covered
  - 5–8 sample responses per form with realistic, varied answers
"""
import json
from datetime import datetime, timedelta
import random

from app.database import engine, SessionLocal, Base
from app.models import Creator, Form, Question, QuestionOption, Response, Answer


def seed():
    # Create all tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # --- Creator ---
        creator = db.query(Creator).filter(Creator.email == "harsh@example.com").first()
        if not creator:
            creator = Creator(name="Harsh", email="harsh@example.com")
            db.add(creator)
            db.flush()
            print(f"✓ Created creator: {creator}")
        else:
            print(f"• Creator already exists: {creator}")

        # --- Form 1: Customer Feedback Survey ---
        form1 = db.query(Form).filter(Form.title == "Customer Feedback Survey").first()
        if not form1:
            form1 = Form(
                creator_id=creator.id,
                title="Customer Feedback Survey",
                description="Help us improve our product by sharing your experience.",
                status="published",
                public_slug="customer-feedback-xk9m",
                theme_color="#191919",
                thank_you_message="Thank you for your feedback! We truly appreciate your time and insights. 🙏",
            )
            db.add(form1)
            db.flush()
            print(f"✓ Created form: {form1}")

            # Questions for Form 1 (covers: short_text, email, rating, multiple_choice, long_text, yes_no, number, dropdown)
            q1_1 = Question(form_id=form1.id, type="short_text", title="What's your name?", description="We'd love to know who you are.", is_required=True, order_index=0)
            q1_2 = Question(form_id=form1.id, type="email", title="What's your email address?", description="We'll only use this to follow up if needed.", is_required=True, order_index=1)
            q1_3 = Question(form_id=form1.id, type="rating", title="How would you rate your overall experience?", description="1 = Poor, 5 = Excellent", is_required=True, order_index=2, settings_json=json.dumps({"maxRating": 5}))
            q1_4 = Question(form_id=form1.id, type="multiple_choice", title="Which features do you use the most?", description="Select the one you use most frequently.", is_required=True, order_index=3)
            q1_5 = Question(form_id=form1.id, type="long_text", title="What could we do better?", description="Be honest — we can take it!", is_required=False, order_index=4)
            q1_6 = Question(form_id=form1.id, type="yes_no", title="Would you recommend us to a friend?", is_required=True, order_index=5)
            q1_7 = Question(form_id=form1.id, type="number", title="How many months have you been using our product?", description="Approximate is fine.", is_required=False, order_index=6, settings_json=json.dumps({"min": 0, "max": 120}))
            q1_8 = Question(form_id=form1.id, type="dropdown", title="How did you hear about us?", is_required=True, order_index=7)

            db.add_all([q1_1, q1_2, q1_3, q1_4, q1_5, q1_6, q1_7, q1_8])
            db.flush()

            # Options for multiple_choice (q1_4)
            mc_options = [
                QuestionOption(question_id=q1_4.id, label="Dashboard & Analytics", order_index=0),
                QuestionOption(question_id=q1_4.id, label="Form Builder", order_index=1),
                QuestionOption(question_id=q1_4.id, label="Integrations", order_index=2),
                QuestionOption(question_id=q1_4.id, label="Reporting", order_index=3),
            ]

            # Options for dropdown (q1_8)
            dd_options = [
                QuestionOption(question_id=q1_8.id, label="Google Search", order_index=0),
                QuestionOption(question_id=q1_8.id, label="Social Media", order_index=1),
                QuestionOption(question_id=q1_8.id, label="Friend Referral", order_index=2),
                QuestionOption(question_id=q1_8.id, label="Blog / Article", order_index=3),
                QuestionOption(question_id=q1_8.id, label="Other", order_index=4),
            ]

            db.add_all(mc_options + dd_options)
            db.flush()

            # Sample responses for Form 1
            _seed_form1_responses(db, form1, q1_1, q1_2, q1_3, q1_4, q1_5, q1_6, q1_7, q1_8, mc_options, dd_options)
            print(f"  ✓ Seeded {len(db.query(Response).filter(Response.form_id == form1.id).all())} responses for Form 1")
        else:
            print(f"• Form 1 already exists: {form1}")

        # --- Form 2: Event Registration ---
        form2 = db.query(Form).filter(Form.title == "Tech Meetup Registration").first()
        if not form2:
            form2 = Form(
                creator_id=creator.id,
                title="Tech Meetup Registration",
                description="Register for our upcoming tech meetup — limited spots available!",
                status="published",
                public_slug="tech-meetup-reg-p3qw",
                theme_color="#2d31fa",
                thank_you_message="You're registered! 🎉 Check your email for confirmation details.",
            )
            db.add(form2)
            db.flush()
            print(f"✓ Created form: {form2}")

            q2_1 = Question(form_id=form2.id, type="short_text", title="Full Name", is_required=True, order_index=0)
            q2_2 = Question(form_id=form2.id, type="email", title="Email Address", description="We'll send your ticket here.", is_required=True, order_index=1)
            q2_3 = Question(form_id=form2.id, type="dropdown", title="Which session are you most interested in?", is_required=True, order_index=2)
            q2_4 = Question(form_id=form2.id, type="multiple_choice", title="What's your experience level?", is_required=True, order_index=3)
            q2_5 = Question(form_id=form2.id, type="yes_no", title="Do you have any dietary restrictions?", is_required=True, order_index=4)
            q2_6 = Question(form_id=form2.id, type="long_text", title="Anything else you'd like us to know?", description="Special requests, accessibility needs, etc.", is_required=False, order_index=5)
            q2_7 = Question(form_id=form2.id, type="number", title="How many events have you attended before?", is_required=False, order_index=6, settings_json=json.dumps({"min": 0, "max": 50}))
            q2_8 = Question(form_id=form2.id, type="rating", title="How excited are you for this event?", description="1 = Meh, 5 = Can't wait!", is_required=False, order_index=7, settings_json=json.dumps({"maxRating": 5}))

            db.add_all([q2_1, q2_2, q2_3, q2_4, q2_5, q2_6, q2_7, q2_8])
            db.flush()

            # Options for Form 2
            dd2_options = [
                QuestionOption(question_id=q2_3.id, label="AI & Machine Learning", order_index=0),
                QuestionOption(question_id=q2_3.id, label="Web Development", order_index=1),
                QuestionOption(question_id=q2_3.id, label="Cloud & DevOps", order_index=2),
                QuestionOption(question_id=q2_3.id, label="Mobile Development", order_index=3),
            ]
            mc2_options = [
                QuestionOption(question_id=q2_4.id, label="Beginner", order_index=0),
                QuestionOption(question_id=q2_4.id, label="Intermediate", order_index=1),
                QuestionOption(question_id=q2_4.id, label="Advanced", order_index=2),
            ]

            db.add_all(dd2_options + mc2_options)
            db.flush()

            _seed_form2_responses(db, form2, q2_1, q2_2, q2_3, q2_4, q2_5, q2_6, q2_7, q2_8, dd2_options, mc2_options)
            print(f"  ✓ Seeded {len(db.query(Response).filter(Response.form_id == form2.id).all())} responses for Form 2")
        else:
            print(f"• Form 2 already exists: {form2}")

        db.commit()
        print("\n✅ Seed complete!")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Seed failed: {e}")
        raise
    finally:
        db.close()


def _seed_form1_responses(db, form, q_name, q_email, q_rating, q_feature, q_improve, q_recommend, q_months, q_source, mc_opts, dd_opts):
    """Create 6 realistic responses for the Customer Feedback Survey."""
    respondents = [
        {"name": "Alice Chen", "email": "alice.chen@gmail.com", "rating": "5", "feature": mc_opts[0].label, "improve": "The mobile app could use some work. Loading times are a bit slow.", "recommend": "yes", "months": "14", "source": dd_opts[0].label},
        {"name": "Bob Martinez", "email": "bob.m@outlook.com", "rating": "4", "feature": mc_opts[1].label, "improve": "More templates would be great!", "recommend": "yes", "months": "6", "source": dd_opts[2].label},
        {"name": "Carol Williams", "email": "cwilliams@company.org", "rating": "3", "feature": mc_opts[2].label, "improve": "Integration setup is confusing. Documentation could be clearer.", "recommend": "no", "months": "2", "source": dd_opts[1].label},
        {"name": "David Park", "email": "dpark@techcorp.io", "rating": "5", "feature": mc_opts[3].label, "improve": "", "recommend": "yes", "months": "24", "source": dd_opts[0].label},
        {"name": "Elena Rossi", "email": "elena.r@startup.co", "rating": "4", "feature": mc_opts[0].label, "improve": "Would love dark mode support!", "recommend": "yes", "months": "8", "source": dd_opts[3].label},
        {"name": "Frank Nguyen", "email": "fnguyen@university.edu", "rating": "2", "feature": mc_opts[1].label, "improve": "The pricing tiers are confusing. Hard to know which plan fits.", "recommend": "no", "months": "1", "source": dd_opts[4].label},
    ]

    for i, r in enumerate(respondents):
        resp = Response(
            form_id=form.id,
            is_complete=True,
            started_at=datetime.utcnow() - timedelta(days=random.randint(1, 30), hours=random.randint(0, 23)),
            submitted_at=datetime.utcnow() - timedelta(days=random.randint(0, 29), hours=random.randint(0, 23)),
        )
        db.add(resp)
        db.flush()

        answers = [
            Answer(response_id=resp.id, question_id=q_name.id, value_text=r["name"]),
            Answer(response_id=resp.id, question_id=q_email.id, value_text=r["email"]),
            Answer(response_id=resp.id, question_id=q_rating.id, value_text=r["rating"]),
            Answer(response_id=resp.id, question_id=q_feature.id, value_text=r["feature"]),
            Answer(response_id=resp.id, question_id=q_recommend.id, value_text=r["recommend"]),
            Answer(response_id=resp.id, question_id=q_source.id, value_text=r["source"]),
        ]
        # Optional fields
        if r["improve"]:
            answers.append(Answer(response_id=resp.id, question_id=q_improve.id, value_text=r["improve"]))
        if r["months"]:
            answers.append(Answer(response_id=resp.id, question_id=q_months.id, value_text=r["months"]))

        db.add_all(answers)
        db.flush()


def _seed_form2_responses(db, form, q_name, q_email, q_session, q_level, q_diet, q_notes, q_events, q_excitement, dd_opts, mc_opts):
    """Create 8 realistic responses for the Tech Meetup Registration."""
    respondents = [
        {"name": "Grace Liu", "email": "grace.liu@dev.io", "session": dd_opts[0].label, "level": mc_opts[2].label, "diet": "no", "notes": "", "events": "12", "excitement": "5"},
        {"name": "Henry Adams", "email": "hadams@gmail.com", "session": dd_opts[1].label, "level": mc_opts[0].label, "diet": "yes", "notes": "I'm vegetarian.", "events": "0", "excitement": "4"},
        {"name": "Iris Johnson", "email": "iris.j@startup.com", "session": dd_opts[2].label, "level": mc_opts[1].label, "diet": "no", "notes": "Need wheelchair accessibility.", "events": "5", "excitement": "5"},
        {"name": "Jake Wilson", "email": "jwilson@bigtech.com", "session": dd_opts[0].label, "level": mc_opts[2].label, "diet": "no", "notes": "", "events": "20", "excitement": "3"},
        {"name": "Karen Brown", "email": "kbrown@agency.co", "session": dd_opts[3].label, "level": mc_opts[1].label, "diet": "yes", "notes": "Gluten-free please.", "events": "3", "excitement": "4"},
        {"name": "Leo Thompson", "email": "leo.t@freelance.dev", "session": dd_opts[1].label, "level": mc_opts[0].label, "diet": "no", "notes": "", "events": "1", "excitement": "5"},
        {"name": "Maria Garcia", "email": "mgarcia@university.edu", "session": dd_opts[2].label, "level": mc_opts[0].label, "diet": "no", "notes": "First tech event — excited!", "events": "0", "excitement": "5"},
        {"name": "Nathan Kim", "email": "nkim@enterprise.org", "session": dd_opts[0].label, "level": mc_opts[2].label, "diet": "no", "notes": "", "events": "15", "excitement": "4"},
    ]

    for r in respondents:
        resp = Response(
            form_id=form.id,
            is_complete=True,
            started_at=datetime.utcnow() - timedelta(days=random.randint(1, 14), hours=random.randint(0, 23)),
            submitted_at=datetime.utcnow() - timedelta(days=random.randint(0, 13), hours=random.randint(0, 23)),
        )
        db.add(resp)
        db.flush()

        answers = [
            Answer(response_id=resp.id, question_id=q_name.id, value_text=r["name"]),
            Answer(response_id=resp.id, question_id=q_email.id, value_text=r["email"]),
            Answer(response_id=resp.id, question_id=q_session.id, value_text=r["session"]),
            Answer(response_id=resp.id, question_id=q_level.id, value_text=r["level"]),
            Answer(response_id=resp.id, question_id=q_diet.id, value_text=r["diet"]),
        ]
        if r["notes"]:
            answers.append(Answer(response_id=resp.id, question_id=q_notes.id, value_text=r["notes"]))
        if r["events"]:
            answers.append(Answer(response_id=resp.id, question_id=q_events.id, value_text=r["events"]))
        if r["excitement"]:
            answers.append(Answer(response_id=resp.id, question_id=q_excitement.id, value_text=r["excitement"]))

        db.add_all(answers)
        db.flush()


if __name__ == "__main__":
    seed()
