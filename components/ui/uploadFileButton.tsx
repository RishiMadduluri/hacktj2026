"use client"

import { useState, useRef, type ChangeEvent } from "react"
import { Upload } from "lucide-react"

export default function UploadFileButton() {
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0]
    if (!chosen) return
    setSelectedName(chosen.name)
    console.log("Selected file:", chosen)
  }

  return (
    <div className="relative z-10">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center justify-center w-64 px-4 py-3 text-black bg-white rounded-md shadow-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
      >
        {selectedName ? (
          <span className="truncate">{selectedName}</span>
        ) : (
          <>
            <Upload className="mr-2 h-5 w-5" />
            Upload Video
          </>
        )}
      </button>
      <input
        type="file"
        ref={inputRef}
        onChange={onFileChange}
        accept="video/*"
        className="hidden"
      />
    </div>
  )
}
