"""
FastAPI backend for financial reconciliation tool.
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
import traceback
from datetime import datetime
from reconciler import ReconciliationEngine
from typing import Dict, List, Any

app = FastAPI(title="Reconcily API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/reconcile")
async def reconcile(
    transactions: UploadFile = File(...),
    settlements: UploadFile = File(...)
) -> Dict[str, Any]:
    """
    Reconcile two CSV files: transactions and settlements.

    Returns matched rows, flagged rows with anomaly types, and summary statistics.
    """
    try:
        # Read transactions CSV
        if not transactions.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="transactions must be a CSV file")

        transactions_content = await transactions.read()
        transactions_df = pd.read_csv(io.StringIO(transactions_content.decode('utf-8')))

        # Read settlements CSV
        if not settlements.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="settlements must be a CSV file")

        settlements_content = await settlements.read()
        settlements_df = pd.read_csv(io.StringIO(settlements_content.decode('utf-8')))

        # Validate required columns
        required_txn_cols = {'transaction_id', 'date', 'amount', 'currency', 'status', 'customer_id'}
        required_settlement_cols = {'settlement_id', 'transaction_id', 'settlement_date', 'settled_amount'}

        if not required_txn_cols.issubset(set(transactions_df.columns)):
            missing = required_txn_cols - set(transactions_df.columns)
            raise HTTPException(status_code=400, detail=f"Missing columns in transactions CSV: {missing}")

        if not required_settlement_cols.issubset(set(settlements_df.columns)):
            missing = required_settlement_cols - set(settlements_df.columns)
            raise HTTPException(status_code=400, detail=f"Missing columns in settlements CSV: {missing}")

        # Run reconciliation
        engine = ReconciliationEngine(transactions_df, settlements_df)
        result = engine.reconcile()

        # Convert to JSON-serializable format
        output = {
            "summary": result["summary"],
            "total_discrepancy": float(result["total_discrepancy"]),
            "matched_rows": result["matched_rows"].to_dict(orient="records"),
            "flagged_rows": result["flagged_rows"].to_dict(orient="records")
        }

        return output

    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="One or both CSV files are empty")
    except pd.errors.ParserError as e:
        raise HTTPException(status_code=400, detail=f"CSV parsing error: {str(e)}")
    except Exception as e:
        # Log full traceback for debugging
        print("=" * 80)
        print("ERROR in /reconcile endpoint:")
        print(traceback.format_exc())
        print("=" * 80)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
