'use client'

import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[TeachFlow Root Error]', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="size-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
        <AlertTriangle className="size-8" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-2">Đã xảy ra sự cố</h1>
      <p className="text-sm text-slate-600 max-w-md mb-6">
        Hệ thống gặp lỗi trong quá trình hiển thị giao diện. Vui lòng thử tải lại trang hoặc thử lại thao tác vừa rồi.
      </p>
      <div className="flex items-center gap-3">
        <Button
          onClick={() => reset()}
          className="bg-teal-600 hover:bg-teal-700 text-white text-xs gap-2 cursor-pointer"
        >
          <RefreshCw className="size-3.5" /> Thử lại
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (typeof window !== 'undefined') window.location.href = '/'
          }}
          className="text-xs gap-2 cursor-pointer border-slate-300"
        >
          <Home className="size-3.5" /> Tải lại trang
        </Button>
      </div>
      {process.env.NODE_ENV !== 'production' && (
        <pre className="mt-6 p-4 max-w-2xl bg-slate-900 text-rose-300 text-left text-xs rounded-xl overflow-x-auto whitespace-pre-wrap">
          {error.message}
          {'\n'}
          {error.stack}
        </pre>
      )}
    </div>
  )
}
