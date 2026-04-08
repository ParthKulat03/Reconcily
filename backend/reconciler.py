"""
Reconciliation logic for matching transactions with settlements.
"""

import pandas as pd
from datetime import datetime
from typing import Dict, List, Tuple, Any
import numpy as np


class ReconciliationEngine:
    """
    Engine for reconciling transaction records with settlement records.

    Detects:
    - TIMING_GAP: transaction and settlement dates in different months
    - ROUNDING_DIFF: amounts match individually but summed totals differ slightly
    - DUPLICATE: duplicate transaction IDs in either dataset
    - MISSING_ORIGINAL: refund (negative amount) with no matching original transaction
    """

    def __init__(self, transactions_df: pd.DataFrame, settlements_df: pd.DataFrame):
        """
        Initialize engine with transaction and settlement DataFrames.

        Args:
            transactions_df: DataFrame with columns: transaction_id, date, amount, currency, status, customer_id
            settlements_df: DataFrame with columns: settlement_id, transaction_id, settlement_date, settled_amount
        """
        self.transactions = transactions_df.copy()
        self.settlements = settlements_df.copy()

        # Ensure correct data types
        self._preprocess_data()

    def _preprocess_data(self):
        """Preprocess dataframes: parse dates, ensure numeric amounts."""
        # Parse dates
        self.transactions['date'] = pd.to_datetime(self.transactions['date'], errors='coerce')
        self.settlements['settlement_date'] = pd.to_datetime(self.settlements['settlement_date'], errors='coerce')

        # Ensure amounts are numeric
        self.transactions['amount'] = pd.to_numeric(self.transactions['amount'], errors='coerce')
        self.settlements['settled_amount'] = pd.to_numeric(self.settlements['settled_amount'], errors='coerce')

    def reconcile(self) -> Dict[str, Any]:
        """
        Execute full reconciliation process.

        Returns:
            Dictionary with summary metrics, matched rows, and flagged rows with anomaly types.
        """
        # Detect duplicates
        duplicate_txn_ids = self._find_duplicates(self.transactions, 'transaction_id')
        duplicate_settlement_ids = self._find_duplicates(self.settlements, 'transaction_id')
        duplicate_ids = duplicate_txn_ids + duplicate_settlement_ids

        # Flag duplicate rows
        flagged_rows = self._flag_duplicates(duplicate_txn_ids, duplicate_settlement_ids)

        # Remove duplicate transaction IDs from consideration (keep first occurrence)
        transactions_clean = self.transactions[~self.transactions['transaction_id'].isin(duplicate_txn_ids)].copy()
        settlements_clean = self.settlements[~self.settlements['transaction_id'].isin(duplicate_settlement_ids)].copy()

        # Build transaction ID to row mapping using records (ensures transaction_id is in dict)
        txn_map = {}
        for row in transactions_clean.to_dict('records'):
            txn_id = row.get('transaction_id')
            if txn_id is not None and not pd.isna(txn_id):
                txn_map[txn_id] = row

        settlement_map = {}
        for row in settlements_clean.to_dict('records'):
            txn_id = row.get('transaction_id')
            if txn_id is not None and not pd.isna(txn_id):
                settlement_map[txn_id] = row

        # Track matches
        matched_transaction_ids = set()
        matched_settlement_ids = set()
        current_flagged_rows = [] if flagged_rows is None else flagged_rows.copy()

        # Find direct matches (amount within 0.01 tolerance)
        for txn_id, settlement_id in self._find_direct_matches(transactions_clean, settlements_clean):
            matched_transaction_ids.add(txn_id)
            matched_settlement_ids.add(settlement_id)

        # Detect timing gaps
        timing_gap_rows = self._detect_timing_gaps(
            transactions_clean[~transactions_clean['transaction_id'].isin(matched_transaction_ids)],
            settlements_clean[~settlements_clean['transaction_id'].isin(matched_settlement_ids)],
            txn_map,
            settlement_map
        )
        current_flagged_rows.extend(timing_gap_rows)
        matched_transaction_ids.update([row['transaction_id'] for row in timing_gap_rows if row.get('anomaly_type') == 'TIMING_GAP'])
        matched_settlement_ids.update([row['transaction_id'] for row in timing_gap_rows if row.get('anomaly_type') == 'TIMING_GAP'])

        # Detect missing originals (refunds)
        missing_original_rows = self._detect_missing_originals(
            transactions_clean[~transactions_clean['transaction_id'].isin(matched_transaction_ids)],
            txn_map,
            settlement_map
        )
        current_flagged_rows.extend(missing_original_rows)

        # Calculate rounding discrepancies
        rounding_diff_rows, total_discrepancy = self._detect_rounding_discrepancies(
            transactions_clean,
            settlements_clean,
            matched_transaction_ids,
            matched_settlement_ids
        )
        current_flagged_rows.extend(rounding_diff_rows)

        # Build summary
        summary = {
            "DUPLICATE": len([r for r in current_flagged_rows if r.get('anomaly_type') == 'DUPLICATE']),
            "TIMING_GAP": len([r for r in current_flagged_rows if r.get('anomaly_type') == 'TIMING_GAP']),
            "ROUNDING_DIFF": len([r for r in current_flagged_rows if r.get('anomaly_type') == 'ROUNDING_DIFF']),
            "MISSING_ORIGINAL": len([r for r in current_flagged_rows if r.get('anomaly_type') == 'MISSING_ORIGINAL']),
        }

        # Convert flagged rows to DataFrame for output
        if current_flagged_rows:
            flagged_df = pd.DataFrame(current_flagged_rows)
        else:
            flagged_df = pd.DataFrame(columns=[
                'transaction_id', 'date', 'amount', 'currency', 'status', 'customer_id',
                'settlement_id', 'settlement_date', 'settled_amount', 'anomaly_type'
            ])

        return {
            "summary": summary,
            "total_discrepancy": total_discrepancy,
            "flagged_rows": flagged_df,
            "matched_rows": pd.DataFrame()  # Matched rows are implicit; we only return flagged ones
        }

    def _find_duplicates(self, df: pd.DataFrame, column: str) -> List[Any]:
        """Find all IDs that appear more than once."""
        duplicates = df[df.duplicated(subset=column, keep=False)][column].unique()
        return duplicates.tolist()

    def _flag_duplicates(self, duplicate_txn: List[Any], duplicate_settlement: List[Any]) -> List[Dict]:
        """
        Create flagged rows for duplicate transaction IDs in transactions or settlements.
        """
        flagged = []
        all_duplicate_ids = set(duplicate_txn + duplicate_settlement)

        for txn_id in all_duplicate_ids:
            # Check if in transactions
            if txn_id in duplicate_txn:
                rows = self.transactions[self.transactions['transaction_id'] == txn_id]
                for _, row in rows.iterrows():
                    row_dict = row.to_dict()
                    # Convert date to string if valid
                    date_val = row_dict.get('date')
                    if pd.notna(date_val):
                        row_dict['date'] = date_val.strftime('%Y-%m-%d')
                    flagged.append({
                        **row_dict,
                        'anomaly_type': 'DUPLICATE'
                    })

            # Check if in settlements
            if txn_id in duplicate_settlement:
                rows = self.settlements[self.settlements['transaction_id'] == txn_id]
                for _, row in rows.iterrows():
                    row_dict = {
                        'settlement_id': row['settlement_id'],
                        'transaction_id': row['transaction_id'],
                        'settlement_date': row['settlement_date'],
                        'settled_amount': row['settled_amount'],
                        'anomaly_type': 'DUPLICATE'
                    }
                    # Convert date to string if valid
                    s_date = row_dict.get('settlement_date')
                    if pd.notna(s_date):
                        row_dict['settlement_date'] = s_date.strftime('%Y-%m-%d')
                    flagged.append(row_dict)

        return flagged

    def _find_direct_matches(self, transactions: pd.DataFrame, settlements: pd.DataFrame) -> List[Tuple[Any, Any]]:
        """Find transaction-settlement pairs with matching amounts (within tolerance)."""
        matches = []
        txn_to_settlements = settlements.groupby('transaction_id')

        for _, txn_row in transactions.iterrows():
            txn_id_val = txn_row['transaction_id']
            # Skip if transaction_id is NaN
            if pd.isna(txn_id_val):
                continue
            if txn_id_val in txn_to_settlements.groups:
                settlement_rows = settlements[settlements['transaction_id'] == txn_id_val]
                for _, s_row in settlement_rows.iterrows():
                    # Skip if amounts are NaN
                    if pd.isna(txn_row['amount']) or pd.isna(s_row['settled_amount']):
                        continue
                    # Match if amounts are approximately equal (within 0.01)
                    if abs(txn_row['amount'] - s_row['settled_amount']) <= 0.01:
                        matches.append((txn_id_val, s_row['settlement_id']))

        return matches

    def _detect_timing_gaps(
        self,
        transactions: pd.DataFrame,
        settlements: pd.DataFrame,
        txn_map: Dict,
        settlement_map: Dict
    ) -> List[Dict]:
        """
        Detect timing gaps where transaction and settlement dates are in different months.
        """
        flagged = []

        for txn_id, txn_data in txn_map.items():
            if pd.isna(txn_id):
                continue
            if txn_id in settlement_map:
                s_data = settlement_map[txn_id]
                txn_date = txn_data.get('date')
                s_date = s_data.get('settlement_date')

                # Skip if dates are missing
                if pd.isna(txn_date) or pd.isna(s_date):
                    continue

                txn_month = txn_date.month
                s_month = s_date.month

                if txn_month != s_month:
                    # Combine transaction and settlement data
                    combined = {
                        **txn_data,
                        'settlement_id': s_data.get('settlement_id'),
                        'settlement_date': s_date,
                        'settled_amount': s_data.get('settled_amount'),
                        'anomaly_type': 'TIMING_GAP'
                    }
                    # Convert dates to string for JSON
                    combined['date'] = txn_date.strftime('%Y-%m-%d')
                    combined['settlement_date'] = s_date.strftime('%Y-%m-%d')
                    flagged.append(combined)

        return flagged

    def _detect_missing_originals(
        self,
        transactions: pd.DataFrame,
        txn_map: Dict,
        settlement_map: Dict
    ) -> List[Dict]:
        """
        Detect refunds (negative amounts) that have no matching original transaction.
        """
        flagged = []

        for txn_id, txn_data in txn_map.items():
            amount = txn_data.get('amount')
            # Skip if amount is NaN or not negative
            if pd.isna(amount) or amount >= 0:
                continue

            # This is a refund (negative amount)
            # Check if there's a matching positive transaction (same abs amount, same customer)
            is_orphan_refund = True
            customer_id = txn_data.get('customer_id')

            if pd.isna(customer_id):
                # If customer_id missing, we can't match; treat as orphan
                is_orphan_refund = True
            else:
                for other_id, other_data in txn_map.items():
                    if other_id == txn_id:
                        continue
                    other_amount = other_data.get('amount')
                    other_customer = other_data.get('customer_id')
                    if (not pd.isna(other_amount) and not pd.isna(other_customer) and
                        other_amount == abs(amount) and
                        other_customer == customer_id):
                        is_orphan_refund = False
                        break

            if is_orphan_refund:
                combined = {
                    **txn_data,
                    'anomaly_type': 'MISSING_ORIGINAL'
                }
                date_val = combined.get('date')
                if pd.notna(date_val):
                    combined['date'] = date_val.strftime('%Y-%m-%d')
                flagged.append(combined)

        return flagged

    def _detect_rounding_discrepancies(
        self,
        all_transactions: pd.DataFrame,
        all_settlements: pd.DataFrame,
        matched_txn_ids: set,
        matched_settlement_ids: set
    ) -> Tuple[List[Dict], float]:
        """
        Detect rounding discrepancies by comparing aggregated amounts per group.
        Groups can be by currency, or by customer - for now use overall totals.
        """
        # Filter out already matched rows and duplicates
        remaining_txns = all_transactions[~all_transactions['transaction_id'].isin(matched_txn_ids)].copy()
        remaining_settlements = all_settlements[~all_settlements['transaction_id'].isin(matched_settlement_ids)].copy()

        flagged = []
        total_discrepancy = 0.0

        # Drop rows with NaN amounts to avoid sum issues
        remaining_txns = remaining_txns.dropna(subset=['amount'])
        remaining_settlements = remaining_settlements.dropna(subset=['settled_amount'])

        # Group by currency to detect rounding issues per currency
        if not remaining_txns.empty and not remaining_settlements.empty:
            for currency in remaining_txns['currency'].unique():
                if pd.isna(currency):
                    continue
                txn_currency = remaining_txns[remaining_txns['currency'] == currency]
                # Settlements don't have currency column, so we use all settlements
                settlement_currency = remaining_settlements

                txn_sum = txn_currency['amount'].sum()
                settlement_sum = settlement_currency['settled_amount'].sum()

                discrepancy = abs(txn_sum - settlement_sum)
                total_discrepancy += float(discrepancy) if pd.notna(discrepancy) else 0.0

                # Flag as rounding discrepancy if > 0 but < threshold (like $0.05 or 0.5% of total)
                if pd.notna(txn_sum) and txn_sum != 0:
                    threshold = max(0.05, abs(txn_sum) * 0.005)  # 0.5% or 5 cents, whichever higher
                else:
                    threshold = 0.05

                if 0 < discrepancy <= threshold:
                    # Add representative rows to flag
                    for _, row in txn_currency.head(1).iterrows():
                        flagged_row = {
                            **row.to_dict(),
                            'anomaly_type': 'ROUNDING_DIFF'
                        }
                        date_val = flagged_row.get('date')
                        if pd.notna(date_val):
                            flagged_row['date'] = date_val.strftime('%Y-%m-%d')
                        flagged.append(flagged_row)

                    for _, row in settlement_currency.head(1).iterrows():
                        flagged_row = {
                            'settlement_id': row['settlement_id'],
                            'transaction_id': row['transaction_id'],
                            'settlement_date': row['settlement_date'].strftime('%Y-%m-%d') if pd.notna(row['settlement_date']) else None,
                            'settled_amount': row['settled_amount'],
                            'anomaly_type': 'ROUNDING_DIFF'
                        }
                        flagged.append(flagged_row)

        return flagged, total_discrepancy
