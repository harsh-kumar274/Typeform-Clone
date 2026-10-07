# Deployment Guide

Deploying this monorepo is completely possible and surprisingly easy! We'll deploy the **Frontend to Vercel** and the **Backend to Render**.

Because these are separate services, the most important thing is ensuring they know how to communicate via Environment Variables.

---

## 1. Deploy the Backend (Render)

Render is great for Python/FastAPI applications.

### Setup Steps
1. Push your latest code to GitHub (which you just did!).
2. Create an account at [Render.com](https://render.com/).
3. Click **New +** and select **Web Service**.
4. Connect your GitHub account and select your `Typeform-Clone` repository.
5. In the configuration page, use the following settings:
   - **Name**: `typeform-backend` (or similar)
   - **Root Directory**: `backend` *(Crucial: This tells Render to look in the backend folder)*
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free

### Environment Variables (Crucial for Build)
Render might default to a very new version of Python (like 3.14) which doesn't have pre-built binaries for some libraries (like `pydantic-core`), causing the build to fail. You need to explicitly set the Python version.

In your Web Service configuration, go to the **Environment** tab and add:
- **Key**: `PYTHON_VERSION`
- **Value**: `3.12.0`

### Database Configuration (Crucial)
By default, the app uses **SQLite**. Render's Free Tier uses ephemeral storage, meaning your SQLite database will be wiped every time the server restarts (which happens during inactivity). 

**To make data permanent:**
1. While on the Render dashboard, click **New +** -> **PostgreSQL**.
2. Create a Free PostgreSQL database.
3. Once created, copy the **Internal Database URL** (or External if required).
4. Go back to your `typeform-backend` Web Service -> **Environment** tab.
5. Add a new Environment Variable:
   - **Key**: `DATABASE_URL`
   - **Value**: *(Paste the PostgreSQL URL here, but change `postgres://` to `postgresql://`)*

*(I have proactively added `psycopg2-binary` to your `requirements.txt` so PostgreSQL will work out of the box!)*

6. **Deploy!** Once the deployment succeeds, copy the live URL (e.g., `https://typeform-backend-xyz.onrender.com`).

---

## 2. Deploy the Frontend (Vercel)

Vercel is optimized for Next.js and makes this incredibly simple.

### Setup Steps
1. Create an account at [Vercel.com](https://vercel.com/).
2. Click **Add New** -> **Project**.
3. Import your `Typeform-Clone` GitHub repository.
4. In the configuration page, under **Root Directory**, click "Edit" and select the `frontend` folder. *(Crucial)*
5. Expand the **Environment Variables** section and add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: *(Paste your Render backend URL here, e.g., `https://typeform-backend-xyz.onrender.com`)*
6. Click **Deploy**.

---

## 3. Connect Backend to Frontend (CORS)

For security, the FastAPI backend has CORS enabled and needs to know your Vercel URL to allow requests.

1. Once Vercel finishes deploying, copy your live frontend URL (e.g., `https://typeform-clone.vercel.app`).
2. Go back to **Render** -> your Web Service -> **Environment** tab.
3. Add a new Environment Variable:
   - **Key**: `FRONTEND_URL`
   - **Value**: *(Paste your Vercel URL here)*
4. Save and trigger a manual redeploy in Render for the change to take effect.

---

### 🎉 You're Done!
Your Typeform clone is now fully live on the internet with a robust Next.js + FastAPI + PostgreSQL stack!
