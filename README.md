<div align="center">
  <img src="https://via.placeholder.com/120x120/8b5cf6/ffffff?text=T" alt="Logo" width="80" height="80" style="border-radius: 20px;">
  <h1 align="center">Typeform Clone</h1>
  <p align="center">
    A pixel-perfect, feature-rich clone of Typeform built with Next.js and FastAPI.
    <br />
    <a href="#features"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="#installation">View Demo</a>
    ·
    <a href="https://github.com/harsh-kumar274/Typeform-Clone/issues">Report Bug</a>
    ·
    <a href="https://github.com/harsh-kumar274/Typeform-Clone/issues">Request Feature</a>
  </p>
</div>

---

## 📖 About The Project

This project is a high-fidelity clone of [Typeform](https://www.typeform.com/), an interactive, conversational form builder. The goal of this project was to replicate Typeform's signature "one-question-at-a-time" user experience, its complex nested database relationships, and its fluid, modern creator dashboard.

The application is split into two distinct decoupled services:
1. **Frontend**: A Next.js (TypeScript) application providing the Creator Dashboard, the 3-pane Drag-and-Drop Form Builder, and the Public Respondent Flow.
2. **Backend**: A FastAPI (Python) server utilizing SQLAlchemy and SQLite to provide robust, transactional APIs with strict schema validation.

### 🌟 Features

#### Creator Experience (Dashboard & Builder)
* **Modern Dashboard**: Manage all your forms, view aggregated completion stats, and duplicate/publish forms in a UI that meticulously mirrors the real Typeform dashboard.
* **AI Setup Screen Flow**: Beautiful, immersive empty-states mimicking Typeform's AI prompt flow and element picker.
* **Drag-and-Drop Editor**: Reorder questions instantly using `@dnd-kit/core`.
* **Live Preview**: See exactly what the respondent will see, in real-time, side-by-side with the editor.
* **Rich Analytics**: Aggregated response data including percentages for multiple-choice, averages/min/max for ratings, and CSV data export.

#### Respondent Experience (The Form)
* **Conversational UI**: Fluid, Framer Motion-powered transitions between slides.
* **Keyboard-First Navigation**: Press `A`, `B`, `C` to select options, or `Enter` to advance, ensuring a seamless user experience.
* **Idempotent Saves**: Answers are auto-saved on every interaction (debounced).
* **Resume Capability**: Accidental refresh? Forms utilize local session tokens to resume exactly where the user left off.

### 🛠 Built With

**Frontend:**
* [Next.js (App Router)](https://nextjs.org/)
* [TypeScript](https://www.typescriptlang.org/)
* [Tailwind CSS](https://tailwindcss.com/)
* [Framer Motion](https://www.framer.com/motion/)
* [dnd-kit](https://dndkit.com/)
* [Lucide React](https://lucide.dev/)

**Backend:**
* [FastAPI](https://fastapi.tiangolo.com/)
* [SQLAlchemy](https://www.sqlalchemy.org/)
* [Pydantic](https://docs.pydantic.dev/latest/)
* [SQLite](https://www.sqlite.org/index.html)
* [Pytest](https://docs.pytest.org/)

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

* Node.js (v18+)
* Python (3.10+)
* npm or yarn

### Installation

1. **Clone the repo**
   ```sh
   git clone https://github.com/harsh-kumar274/Typeform-Clone.git
   cd "Typeform Clone"
   ```

2. **Setup the Backend (FastAPI)**
   ```sh
   cd backend
   python -m venv venv
   
   # Activate virtual environment
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   
   pip install -r requirements.txt
   
   # Generate database tables and seed mock data
   python app/seed.py
   
   # Start the API server
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Setup the Frontend (Next.js)**
   Open a new terminal window:
   ```sh
   cd frontend
   npm install
   
   # Start the development server
   npm run dev
   ```

4. **Access the application**
   * Creator Dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
   * API Swagger Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📐 Architecture & Schema

The database utilizes highly normalized relational tables to ensure data integrity, especially during complex operations like deep duplication of a form.

* **Forms**: Contains status (`draft`/`published`), unique public slugs (`nanoid`), and creator relations.
* **Questions**: Stores `type`, `order_index`, and a polymorphic `settings_json` for type-specific configurations (e.g. `{ "maxRating": 5 }`).
* **QuestionOptions**: One-to-many relationship for Choice and Dropdown types.
* **Responses**: Created instantly when a user visits a public form. Generates an opaque `public_token` (to prevent ID enumeration).
* **Answers**: Belongs to a unique `(response_id, question_id)` composite index. Validated extensively on the backend to match the associated Question's type.

---

## 🧪 Testing

The backend is fully covered by a Pytest suite utilizing an in-memory SQLite database for maximum speed and isolation.

```sh
cd backend
pytest tests/ -v
```

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---
<div align="center">
  <i>Built with ❤️ by Harsh Kumar Thakur</i>
</div>
