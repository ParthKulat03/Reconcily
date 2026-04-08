function SummaryCards({ summary, totalDiscrepancy }) {
  const anomalyTypes = [
    { key: 'DUPLICATE', label: 'Duplicates', color: 'bg-red-50 border-red-200 text-red-700', iconColor: 'text-red-500', icon: '🔗' },
    { key: 'TIMING_GAP', label: 'Timing Gaps', color: 'bg-amber-50 border-amber-200 text-amber-700', iconColor: 'text-amber-500', icon: '📅' },
    { key: 'ROUNDING_DIFF', label: 'Rounding Issues', color: 'bg-orange-50 border-orange-200 text-orange-700', iconColor: 'text-orange-500', icon: '💰' },
    { key: 'MISSING_ORIGINAL', label: 'Missing Originals', color: 'bg-purple-50 border-purple-200 text-purple-700', iconColor: 'text-purple-500', icon: '❓' },
  ]

  const totalAnomalies = Object.values(summary).reduce((sum, count) => sum + count, 0)

  return (
    <div className="space-y-6">
      {/* Main stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-2">Total Anomalies</p>
          <p className="text-3xl font-bold text-slate-900">{totalAnomalies}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-2">Discrepancy Amount</p>
          <p className="text-3xl font-bold text-slate-900">
            {totalDiscrepancy >= 0 ? '+' : ''}${totalDiscrepancy.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-2">Anomaly Types Found</p>
          <p className="text-3xl font-bold text-slate-900">
            {Object.values(summary).filter(c => c > 0).length}/4
          </p>
        </div>
      </div>

      {/* Anomaly breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {anomalyTypes.map(({ key, label, color, iconColor, icon }) => {
          const count = summary[key] || 0
          return (
            <div
              key={key}
              className={`rounded-xl border p-4 ${color}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xl ${iconColor}`}>{icon}</span>
                <span className="font-semibold">{label}</span>
              </div>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm opacity-75 mt-1">
                {count === 1 ? 'item' : 'items'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SummaryCards
