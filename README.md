# AI Risk Manager

**AI Risk Manager** is an enterprise-grade merchant-loss reduction platform focused on **chargeback prevention, transaction risk assessment, and intelligent dispute defense**.

It combines two purpose-built ML models with an evidence-grounded LLM response generator and a human-in-the-loop review workflow, so merchants can catch high-risk transactions early and fight winnable chargebacks with well-supported dispute responses.

---

## Table of Contents

- [Overview](#overview)
- [Core Capabilities](#core-capabilities)
- [Machine Learning Models](#machine-learning-models)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [User Roles](#user-roles)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Frontend Pages](#frontend-pages)
- [Testing](#testing)
- [Security Note](#security-note)
- [License](#license)

---

## Overview

Chargebacks are costly for merchants, both in lost revenue and operational overhead. AI Risk Manager addresses this in two phases:

1. **Pre-chargeback**: Score incoming transactions in real time to flag high-risk activity and estimate expected financial loss before a dispute even happens.
2. **Post-chargeback**: When a dispute is filed, evaluate the strength of available evidence, predict the odds of a successful defense, and generate an evidence-grounded rebuttal letter for a human reviewer to approve, edit, or reject before submission.

All model outputs, evidence, and reviewer decisions are logged in a full audit trail for compliance.

## Core Capabilities

- Real-time transaction risk scoring and expected-loss estimation
- Post-chargeback defense-success prediction
- Structured evidence management for dispute re-presentments
- Verifiable, evidence-grounded chargeback response drafts powered by an external LLM
- Enforced human-in-the-loop review before any formal submission
- Real-time and aggregate merchant loss analytics
- Full audit trails and compliance logging
- Role-based access control (Admin, Merchant, Risk Analyst, Reviewer)

## Machine Learning Models

### Model A — Transaction Chargeback Risk Prediction
Runs at transaction ingestion time to forecast chargeback likelihood.

- **Inputs**: amount, currency, card type, channel, IP/country geolocation, AVS/CVV results, customer velocity and historical behavior
- **Outputs**:
  - `chargeback_probability` — float `[0.0, 1.0]`
  - `risk_score` — integer `[0, 100]`
  - `risk_level` — `LOW` / `MEDIUM` / `HIGH` / `CRITICAL`
  - `expected_loss` — `chargeback_probability × transaction_amount`

### Model B — Chargeback Defense Success Prediction
Runs when preparing a dispute re-presentment.

- **Inputs**: dispute reason code, transaction characteristics, evidence types present (proof of delivery, invoice, terms acknowledgement, communication logs, customer ID match score), merchant dispute history
- **Outputs**:
  - `defense_success_probability` — float `[0.0, 1.0]`
  - `defense_score` — integer `[0, 100]`
  - `recommendation` — `DEFEND` / `ACCEPT_LOSS` / `COLLECT_MORE_EVIDENCE`

Both models are trained on real, held-out evaluation datasets (see `dataset/` and `training/`), with evaluation reports and metadata available in `models/`.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18 (Vite), React Router 6, Tailwind CSS, Lucide React, Recharts, Axios |
| Backend Gateway | Node.js, Express.js, MongoDB + Mongoose, JWT auth, bcrypt |
| ML Service | Python 3.10+, FastAPI, Uvicorn, scikit-learn, XGBoost, pandas, Pydantic v2 |
| LLM Integration | Configurable external LLM provider, accessed only through the backend |

## Architecture

<img width="1408" height="768" alt="AI-Manager-Architecture" src="https://github.com/user-attachments/assets/b5a0ec2b-d520-479d-9aee-df3dda3b71a7" />

**Architectural rules:**
- The React client talks **only** to the Express gateway — it never calls the FastAPI or LLM services directly.
- Express owns authentication, persistence, orchestration, role enforcement, and proxying to internal services.
- Model metrics are derived strictly from real held-out evaluation data — no synthetic fabrication or feature leakage.

## User Roles

External parties (customers, issuing banks, card schemes, payment processors) are not application users. The platform supports four internal roles:

| Role | Access |
| --- | --- |
| `ADMIN` | Full platform control, user/role management, audit logs, global analytics, system config |
| `MERCHANT` | Merchant-specific transactions, chargeback alerts, evidence upload, loss reports |
| `RISK_ANALYST` | Transaction risk analysis, risk parameter tuning, model monitoring, loss pattern discovery |
| `REVIEWER` | Evidence inspection, LLM draft review, rebuttal edits, human-in-the-loop approval/rejection |

## Project Structure

```
AI-Risk-Manager/
├── Architecture/        # Architecture diagram
├── backend/              # Node.js + Express API gateway
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── scripts/          # DB seed scripts
│   └── tests/
├── frontend/             # React + Vite client
│   └── src/
├── ml-service/           # FastAPI service for Model A & B inference
│   ├── app/
│   └── tests/
├── training/             # Model training scripts (train_model_a.py, train_model_b.py)
├── models/               # Model metadata & evaluation reports
├── dataset/              # Training/evaluation datasets
└── docs/                 # Project spec and contributor docs
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB (local instance or connection URI)

### 1. Backend Gateway

```bash
cd backend
npm install
cp .env.example .env   # fill in your own values — see Environment Variables below
npm run seed            # optional: seed the database
npm run dev              # starts on http://localhost:5000
```

### 2. ML Service

```bash
cd ml-service
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev   # starts on http://localhost:5173
```

Once all three services are running, open the frontend URL and sign in.

## Environment Variables

Each service ships an `.env.example` template — copy it to `.env` and fill in real values. **Never commit your `.env` file or real credentials.**

**backend/.env**

| Variable | Description |
| --- | --- |
| `PORT` | Port for the Express server (default `5000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign JWTs |
| `ML_SERVICE_URL` | Base URL of the FastAPI ML service |
| `LLM_API_KEY` | API key for the external LLM provider (backend-only) |
| `CORS_ORIGINS` | Allowed origin(s) for the frontend |
| `NODE_ENV` | `development` / `test` / `production` |

**frontend/.env** and **ml-service/.env** — see the respective `.env.example` files for required values.

## API Overview

All endpoints are served under `/api/v1` by the Express gateway.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/login`, `POST /auth/register`, `GET /auth/me` |
| Transactions | `POST /transactions`, `GET /transactions`, `GET /transactions/:id` |
| Chargebacks | `GET /chargebacks`, `GET /chargebacks/:id`, `POST /chargebacks/:id/evidence`, `POST /chargebacks/:id/predict-defense`, `POST /chargebacks/:id/generate-response`, `PATCH /chargebacks/:id/review`, `POST /chargebacks/:id/submit` |
| Analytics | `GET /analytics/loss-summary`, `GET /analytics/recovery-rate` |
| Audit Logs | `GET /audit-logs` (Admin only) |

See `docs/PROJECT_SPEC.md` for the full data flow, including a sequence diagram of the transaction-ingestion and dispute-resolution lifecycle.

## Frontend Pages

| Route | Description |
| --- | --- |
| `/login` | Role-aware sign-in |
| `/dashboard` | Key metrics: expected vs. actual loss, open disputes, high-risk transactions, pending reviews |
| `/transactions` | Transaction table with risk filters and detail views |
| `/disputes` | Dispute management with deadline tracking and status tags |
| `/disputes/:id` | Dispute Resolution Studio — evidence uploader, Model B score card, LLM response editor, reviewer controls |
| `/analytics` | Loss-reduction analytics and model evaluation metrics |
| `/audit-logs` | Activity timeline with role and action filters |

## Testing

```bash
# Backend unit/e2e tests
cd backend
npm test
./run-e2e-tests.sh

# ML service tests
cd ml-service
pytest
```

## Security Note

This repository currently includes a `loginDetails.txt` file with plaintext credentials at the project root. **Remove this file and rotate any exposed credentials before deploying or making the repository public** — secrets should live only in local `.env` files (already covered by `.gitignore`) and never be committed to version control.
