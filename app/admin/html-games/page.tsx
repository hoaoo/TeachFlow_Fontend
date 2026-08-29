'use client'

import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'
import { HtmlGameLibraryView } from '@/components/html-game-library-view'
import { useAuth } from '@/context/auth-context'

export default function AdminHtmlGamesPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Đang kiểm tra quyền truy cập...</p>
      </div>
    )
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <Shield className="mx-auto mb-3 size-12 text-rose-500" />
          <h1 className="text-xl font-bold text-slate-900">403 - Truy cập bị từ chối</h1>
          <p className="mt-2 text-sm text-slate-600">Trang quản trị trò chơi HTML chỉ dành cho tài khoản ADMIN.</p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            <ArrowLeft className="size-4" /> Quay lại trang chủ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-10">
      <div className="mb-6">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:underline">
          <ArrowLeft className="size-3.5" /> Quay về tổng quan quản trị
        </Link>
      </div>
      <HtmlGameLibraryView />
    </div>
  )
}
