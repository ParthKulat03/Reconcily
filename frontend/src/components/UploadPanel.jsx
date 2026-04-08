import { useCallback, useState } from 'react'
import { Upload } from 'lucide-react'

function UploadPanel({ title, description, file, onFileChange, icon, requiredColumns }) {
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.name.endsWith('.csv')) {
        onFileChange(droppedFile)
      }
    }
  }, [onFileChange])

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileChange(e.target.files[0])
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col items-center text-center">
        {icon}
        <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
        <p className="text-slate-600 text-sm mb-6">{description}</p>

        <div
          className={`w-full border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer relative ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : file
                ? 'border-green-400 bg-green-50'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />

          {file ? (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-medium text-slate-900 mb-1">{file.name}</p>
              <p className="text-sm text-slate-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-3">
                <Upload className="w-6 h-6 text-slate-500" />
              </div>
              <p className="font-medium text-slate-700 mb-1">Drop your CSV file here</p>
              <p className="text-sm text-slate-500 mb-3">or click to browse</p>
            </div>
          )}
        </div>

        {/* Required columns hint */}
        <div className="mt-4 w-full">
          <p className="text-xs font-medium text-slate-500 mb-2">Required columns:</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {requiredColumns.map(col => (
              <span key={col} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md font-mono">
                {col}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadPanel
