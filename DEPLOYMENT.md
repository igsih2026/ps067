# TRITON Ocean Platform — Deployment Guide

This guide provides instructions for deploying the TRITON 3D Ocean Data Explorer application on **Vercel**.

---

## Architecture Overview

- **Frontend**: Vite + React 19 + CesiumJS (3D Globe visualization).
- **Backend**: FastAPI (Python 3.11+) + `xarray`, `netCDF4`, `numpy`, `scipy` (Oceanographic dataset processing & REST APIs).

---

## Deploying on Vercel

The repository is pre-configured with `vercel.json`, `api/index.py`, and `requirements.txt` for one-click deployment on Vercel.

### Method 1: Vercel Web Dashboard (Recommended)

1. **Push your code to GitHub / GitLab / Bitbucket**.
2. Go to [Vercel Dashboard](https://vercel.com/new) and click **"Add New Project"**.
3. Import your project repository.
4. Vercel will automatically read `vercel.json` and detect the framework settings:
   - **Framework Preset**: Vite
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`
5. **Set Environment Variables**:
   In the Vercel project settings, add the following environment variable:
   - `VITE_CESIUM_ION_TOKEN`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` *(Your Cesium Ion token)*
6. Click **Deploy**.

---

### Method 2: Vercel CLI

You can also deploy directly from your local terminal using the Vercel CLI:

1. Log in to Vercel CLI:
   ```bash
   npx vercel login
   ```
2. Deploy a preview build:
   ```bash
   npx vercel
   ```
3. Deploy to production:
   ```bash
   npx vercel --prod
   ```

---

## Environment Variables

| Variable | Description | Default / Example |
|---|---|---|
| `VITE_CESIUM_ION_TOKEN` | Cesium Ion access token for 3D terrain and satellite imagery | Found in `.env` |
| `VITE_API_BASE` | Base URL for REST API calls | `/api` |

---

## Alternative: Hybrid Setup (Vercel Frontend + Render Backend)

If you prefer running the Python FastAPI server as a continuous long-running daemon (e.g. for background FTP automated data acquisition):

1. **Backend on Render / Railway / Fly.io**:
   - Deploy `backend/` using Docker or start command:
     ```bash
     cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
2. **Frontend on Vercel**:
   - Deploy `frontend/` on Vercel and add environment variable:
     - `VITE_API_BASE`: `https://your-backend-domain.onrender.com/api`

---

## Local Verification

To test the production build locally before deploying:

1. **Build and Preview Frontend**:
   ```bash
   cd frontend
   npm run build
   npm run preview
   ```

2. **Run Backend API Server**:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```
