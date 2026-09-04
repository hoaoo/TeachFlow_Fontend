'use client'

import React, { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[TeachFlow Global Error]', error)
  }, [error])

  return (
    <html lang="vi">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 text-2xl font-bold">
          !
        </div>
        <h1 className="text-xl font-bold mb-2">Đã xảy ra sự cố hệ thống</h1>
        <p className="text-sm text-slate-600 max-w-md mb-6">
          TeachFlow gặp sự cố ngoài dự kiến khi khởi động. Thầy cô vui lòng tải lại ứng dụng.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-xl hover:bg-teal-700 transition cursor-pointer"
          >
            Thử lại
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') window.location.href = '/'
            }}
            className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            Tải lại trang
          </button>
        </div>
      </body>
    </html>
  )
}
