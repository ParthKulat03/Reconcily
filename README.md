# Reconcily

A full-stack financial reconciliation tool that matches transaction records with settlement records, flags anomalies, and provides a clean UI for reviewing discrepancies.

## Features

- Upload two CSV files: transactions and settlements
- Automatic reconciliation with anomaly detection:
  - **Timing Gaps** - transaction and settlement dates in different months
  - **Rounding Differences** - summed totals differ by a small amount
  - **Duplicates** - same transaction ID appears more than once
  - **Missing Original** - refund without matching original transaction
- Color-coded results table
- Downloadable CSV reports
- Professional Tailwind CSS UI

---

## Local Development

### Backend (FastAPI)

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Create and activate virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\\Scripts\\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

5. Verify the health endpoint:
   ```bash
   curl http://localhost:8000/health
   # Should return: {"status":"ok"}
   ```

### Frontend (React + Vite)

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open <http://localhost:5173> in your browser.

**Note:** By default, the frontend API URL points to `http://localhost:8000`. You can override this by setting the `VITE_API_URL` environment variable (see below).

---

## Test Data Format

### transactions.csv
```csv
transaction_id,date,amount,currency,status,customer_id
T001,2024-01-15,100.00,USD,completed,CUST001
T002,2024-01-20,-50.00,USD,refunded,CUST002
T003,2024-01-25,200.50,EUR,completed,CUST003
```

### settlements.csv
```csv
settlement_id,transaction_id,settlement_date,settled_amount
S001,T001,2024-01-16,100.00
S002,T002,2024-01-25,50.00
```

---

## Deployment

### Backend on Render

1. **Push code to Git** (GitHub, GitLab, or Bitbucket):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```

2. **Create a new Web Service on Render:**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New" → "Web Service"
   - Connect your repository

3. **Configure the service:**
   - Name: `reconcily-backend` (or your preferred name)
   - Environment: `Docker`
   - Build Command: Leave empty (Dockerfile will be used)
   - Start Command: Leave empty (Dockerfile CMD will be used)

4. **Set environment variables:**
   Render automatically sets the `PORT` environment variable. No additional env vars required.

5. **Deploy:**
   - Click "Create Web Service"
   - Render will build and deploy. Once complete, you'll get a URL like `https://reconcily-backend.onrender.com`

6. **Verify:**
   ```bash
   curl https://YOUR_SERVICE_URL.onrender.com/health
   ```

---

### Frontend on Vercel

1. **Push code to Git** (if not already):
   - Ensure `frontend/` directory is in your repository.

2. **Import project on Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your repository
   - Set **Root Directory** to `frontend` (important!)

3. **Configure environment variables:**
   - In the Vercel project settings → "Environment Variables"
   - Add variable: `VITE_API_URL` with value: `https://YOUR_BACKEND_URL.onrender.com`
   Example:
   ```
   Key: VITE_API_URL
   Value: https://reconcily-backend.onrender.com
   ```

4. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy automatically

5. **Get your frontend URL:**
   - Once deployed, Vercel provides a URL like `https://reconcily.vercel.app`
   - Your app will communicate with the backend using the `VITE_API_URL`

---

## Setting VITE_API_URL on Vercel

The frontend uses Vite's environment variable `VITE_API_URL` to determine the backend API endpoint.

**Step by step:**
1. Go to your project dashboard on Vercel
2. Select your frontend project
3. Go to **Settings** → **Environment Variables**
4. Click "Add Variable"
5. Enter:
   - Key: `VITE_API_URL`
   - Value: `https://reconcily-backend.onrender.com` (your backend URL)
6. Click "Save"
7. **Redeploy** your project for the change to take effect

**Development override:**
To test with a different API URL locally, create a `.env` file in the `frontend/` directory:
```
VITE_API_URL=http://localhost:8000
```

---

## Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI application with endpoints
│   ├── reconciler.py        # Core reconciliation logic
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile           # Render deployment
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       └── components/
│           ├── UploadPanel.jsx
│           ├── SummaryCards.jsx
│           └── ResultsTable.jsx
└── README.md
```

---

## API Reference

### `GET /health`
Health check endpoint.
**Response:** `{"status": "ok"}`

### `POST /reconcile`
Reconcile two CSV files.

**Form Data:**
- `transactions` (file): CSV with transaction records
- `settlements` (file): CSV with settlement records

**Response:**
```json
{
  "summary": {
    "DUPLICATE": 2,
    "TIMING_GAP": 1,
    "ROUNDING_DIFF": 0,
    "MISSING_ORIGINAL": 1
  },
  "total_discrepancy": 150.25,
  "matched_rows": [],
  "flagged_rows": [
    {
      "transaction_id": "T001",
      "date": "2024-01-15",
      "amount": 100.00,
      "currency": "USD",
      "status": "completed",
      "customer_id": "CUST001",
      "settlement_id": "S001",
      "settlement_date": "2024-01-16",
      "settled_amount": 100.00,
      "anomaly_type": "TIMING_GAP"
    }
  ]
}
```

---

## License

MIT
