Build a full-stack financial reconciliation tool. No explanations needed — just write the code. Every file must be complete and copy-paste ready. No placeholders, no abbreviations.
What it does:
A user uploads two CSVs — platform transaction records and bank settlement records. The app reconciles them, flags mismatches, and displays results in a clean UI.
Test Data (use exactly this schema):
transactions.csv columns:
transaction_id, date, amount, currency, status, customer_id
settlements.csv columns:
settlement_id, transaction_id, settlement_date, settled_amount
The reconciliation logic must detect and label these 4 anomaly types:

TIMING_GAP — transaction date and settlement date are in different months
ROUNDING_DIFF — individual amounts match but summed totals differ by a small float
DUPLICATE — same transaction ID appears more than once in either dataset
MISSING_ORIGINAL — a refund (negative amount) has no matching original transaction ID

Tech Stack:

Backend: FastAPI + Pandas
Frontend: React + Vite + Tailwind CSS + TanStack Table
Deployment: Backend on Render, Frontend on Vercel

Project structure:
/backend
  main.py
  reconciler.py
  requirements.txt
  Dockerfile
/frontend
  src/
    App.jsx
    components/
      UploadPanel.jsx
      ResultsTable.jsx
      SummaryCards.jsx
  index.html
  package.json
  tailwind.config.js
  vite.config.js
README.md
Backend requirements:

POST /reconcile — accepts two CSV file uploads, returns JSON with: matched rows, flagged rows (each with anomaly_type label), total_discrepancy, summary (count per anomaly type)
GET /health — returns {"status": "ok"}
CORS enabled for all origins
Dockerfile included for Render deployment

Frontend requirements:

Upload UI for both CSVs with drag and drop
On submit, call POST /reconcile on the backend
Display results in a TanStack Table with color-coded rows per anomaly type (red = DUPLICATE, yellow = TIMING_GAP, orange = ROUNDING_DIFF, purple = MISSING_ORIGINAL)
Summary cards showing: total transactions, total discrepancy amount, count per anomaly type
Download Report button that exports flagged rows as CSV
Professional UI using Tailwind — not a default template look
API base URL read from VITE_API_URL environment variable

README must include:

How to run locally (backend + frontend)
How to deploy backend on Render step by step
How to deploy frontend on Vercel step by step
How to set the VITE_API_URL env variable on Vercel

Write all files in order: backend first, then frontend, then README. Start immediately.