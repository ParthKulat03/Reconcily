import { useState, useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel
} from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'

const anomalyColors = {
  DUPLICATE: { bg: 'bg-red-50', border: 'border-l-4 border-red-500', text: 'text-red-700', badge: 'bg-red-100 text-red-800' },
  TIMING_GAP: { bg: 'bg-amber-50', border: 'border-l-4 border-amber-500', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  ROUNDING_DIFF: { bg: 'bg-orange-50', border: 'border-l-4 border-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
  MISSING_ORIGINAL: { bg: 'bg-purple-50', border: 'border-l-4 border-purple-500', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
}

function ResultsTable({ data }) {
  const [sorting, setSorting] = useState([])

  const columns = useMemo(() => {
    const baseColumns = [
      {
        accessorKey: 'anomaly_type',
        header: 'Anomaly',
        cell: (info) => {
          const type = info.getValue()
          const colors = anomalyColors[type] || anomalyColors.TIMING_GAP
          return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
              {type.replace('_', ' ')}
            </span>
          )
        },
      },
      {
        accessorKey: 'transaction_id',
        header: 'Transaction ID',
        cell: (info) => info.getValue() || '-',
      },
      {
        accessorKey: 'date',
        header: 'Date',
        cell: (info) => {
          const val = info.getValue()
          return val ? (typeof val === 'string' ? val : new Date(val).toLocaleDateString()) : '-'
        },
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: (info) => {
          const val = info.getValue()
          return val !== undefined && val !== null ? `$${Number(val).toFixed(2)}` : '-'
        },
      },
      {
        accessorKey: 'currency',
        header: 'Currency',
        cell: (info) => info.getValue() || '-',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => info.getValue() || '-',
      },
      {
        accessorKey: 'customer_id',
        header: 'Customer ID',
        cell: (info) => info.getValue() || '-',
      },
      {
        accessorKey: 'settlement_id',
        header: 'Settlement ID',
        cell: (info) => info.getValue() || '-',
      },
      {
        accessorKey: 'settlement_date',
        header: 'Settlement Date',
        cell: (info) => {
          const val = info.getValue()
          return val ? (typeof val === 'string' ? val : new Date(val).toLocaleDateString()) : '-'
        },
      },
      {
        accessorKey: 'settled_amount',
        header: 'Settled Amount',
        cell: (info) => {
          const val = info.getValue()
          return val !== undefined && val !== null ? `$${Number(val).toFixed(2)}` : '-'
        },
      },
    ]

    // Only include settlement columns if they have data
    const hasSettlementData = data.some(row => row.settlement_id || row.settlement_date || row.settled_amount)
    if (!hasSettlementData) {
      return baseColumns.slice(0, 6) // Return only transaction columns
    }

    return baseColumns
  }, [data])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    <ArrowUpDown className="w-4 h-4 opacity-50" />
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-200">
          {table.getRowModel().rows.map(row => {
            const anomalyType = row.original.anomaly_type
            const colors = anomalyColors[anomalyType] || anomalyColors.TIMING_GAP

            return (
              <tr
                key={row.id}
                className={`${colors.bg} ${colors.border} hover:bg-opacity-80 transition-colors`}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default ResultsTable
