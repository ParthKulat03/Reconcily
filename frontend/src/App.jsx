import { useState } from 'react'
import { Upload, FileText, AlertTriangle, CheckCircle, Download } from 'lucide-react'
import UploadPanel from './components/UploadPanel'
import SummaryCards from './components/SummaryCards'
import ResultsTable from './components/ResultsTable'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)
  const [txnFile, setTxnFile] = useState(null)
  const [settlementFile, setSettlementFile] = useState(null)

  const handleSubmit = async () => {
    if (!txnFile || !settlementFile) {
      setError('Please upload both transaction and settlement CSV files')
      return
    }

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('transactions', txnFile)
    formData.append('settlements', settlementFile)

    try {
      const response = await axios.post(`${API_URL}/reconcile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      setResults(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to reconcile files')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setResults(null)
    setTxnFile(null)
    setSettlementFile(null)
    setError(null)
  }

  const handleDownloadReport = () => {
    if (!results?.flagged_rows?.length) return

    const csv = convertToCSV(results.flagged_rows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'reconciliation_report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const convertToCSV = (data) => {
    if (!data.length) return ''
    const headers = Object.keys(data[0])
    const csvRows = []
    csvRows.push(headers.join(','))

    for (const row of data) {
      const values = headers.map(header => {
        const escaped = ('' + row[header]).replace(/"/g, '\\"')
        return `"${escaped}"`
      })
      csvRows.push(values.join(','))
    }

    return csvRows.join('\n')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Reconcily</h1>
              <span className="text-sm text-slate-500 hidden sm:inline">Financial Reconciliation Tool</span>
            </div>
            {results && (
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Download className="w-4 h-4" />
                Download Report
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!results ? (
          <>
            {/* Upload Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <UploadPanel
                title="Transactions"
                description="Upload your transaction records (CSV)"
                file={txnFile}
                onFileChange={setTxnFile}
                icon={<Upload className="w-12 h-12 text-blue-600 mb-4" />}
                requiredColumns={['transaction_id', 'date', 'amount', 'currency', 'status', 'customer_id']}
              />
              <UploadPanel
                title="Settlements"
                description="Upload your settlement records (CSV)"
                file={settlementFile}
                onFileChange={setSettlementFile}
                icon={<Upload className="w-12 h-12 text-indigo-600 mb-4" />}
                requiredColumns={['settlement_id', 'transaction_id', 'settlement_date', 'settled_amount']}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-center mb-8">
              <button
                onClick={handleSubmit}
                disabled={!txnFile || !settlementFile || loading}
                className={`px-8 py-3 rounded-lg font-semibold text-white transition-all ${
                  txnFile && settlementFile && !loading
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Run Reconciliation'
                )}
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="max-w-2xl mx-auto mb-8 bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-800">Error</h3>
                    <p className="text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Summary Cards */}
            {results && (
              <div className="mb-8">
                <SummaryCards summary={results.summary} totalDiscrepancy={results.total_discrepancy} />
              </div>
            )}

            {/* Results Table */}
            {results && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-lg font-semibold text-slate-900">Flagged Rows</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {results.flagged_rows?.length || 0} anomalies detected
                  </p>
                </div>
                {results.flagged_rows?.length > 0 ? (
                  <ResultsTable data={results.flagged_rows} />
                ) : (
                  <div className="p-12 text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No anomalies found!</h3>
                    <p className="text-slate-600">All transactions matched successfully with settlements.</p>
                  </div>
                )}
              </div>
            )}

            {/* Reset Button */}
            <div className="mt-8 text-center">
              <button
                onClick={handleReset}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Start Over
              </button>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-slate-500 text-sm">
            Reconcily v1.0.0 • Built with FastAPI + React
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
