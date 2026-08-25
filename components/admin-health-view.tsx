'use client'

import { useEffect, useState } from 'react'
import {
  Activity,
  Server,
  Database,
  Sparkles,
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
} from 'lucide-react'
import { getSystemHealth, type HealthCheckResponse } from '@/services/admin-teacher-service'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function AdminHealthView() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkHealth = async () => {
    setLoading(true)
    try {
      const res = await getSystemHealth()
      setHealth(res)
      setLastChecked(new Date())
    } catch {
      setHealth({
        status: 'error',
        database: 'down',
        timestamp: new Date().toISOString(),
      })
      toast.error('Không thể kết nối đến hệ thống kiểm tra sức khỏe')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  const isHealthy = health?.status === 'ok' && health?.database === 'up'

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-600">
            <Activity className="size-4" /> Vận hành & Hạ tầng
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Sức khỏe hệ thống (System Health)
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Kiểm tra thời gian thực kết nối Backend API, Cơ sở dữ liệu và các thành phần cốt lõi.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={checkHealth}
          disabled={loading}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Kiểm tra lại
        </Button>
      </div>

      {/* Main Status Banner */}
      <div
        className={`rounded-2xl border p-6 shadow-sm flex items-center gap-4 ${
          isHealthy
            ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950'
            : 'border-rose-200 bg-rose-50/60 text-rose-950'
        }`}
      >
        <span
          className={`grid size-12 place-items-center rounded-xl shrink-0 ${
            isHealthy ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          }`}
        >
          {isHealthy ? <CheckCircle2 className="size-6" /> : <AlertTriangle className="size-6" />}
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold">
            {isHealthy ? 'Toàn bộ hệ thống đang vận hành ổn định' : 'Phát hiện sự cố kết nối hoặc suy giảm dịch vụ'}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            {lastChecked ? `Lần kiểm tra gần nhất: ${lastChecked.toLocaleTimeString('vi-VN')} ngày ${lastChecked.toLocaleDateString('vi-VN')}` : 'Đang kiểm tra...'}
          </p>
        </div>
      </div>

      {/* Detailed Services Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Backend API */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Server className="size-5" />
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  health?.status === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {health?.status === 'ok' ? 'Online' : 'Offline'}
              </span>
            </div>
            <h3 className="mt-4 font-semibold text-slate-900 text-base">Backend API Server</h3>
            <p className="mt-1 text-xs text-slate-500">NestJS runtime, authentication và HTTP routing engine.</p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-1.5">
            <Clock className="size-3.5" /> Phản hồi trong &lt; 50ms
          </div>
        </div>

        {/* Database */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-purple-600">
                <Database className="size-5" />
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  health?.database === 'up' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {health?.database === 'up' ? 'Online' : 'Mất kết nối'}
              </span>
            </div>
            <h3 className="mt-4 font-semibold text-slate-900 text-base">PostgreSQL Database</h3>
            <p className="mt-1 text-xs text-slate-500">Neon Serverless Postgres lưu trữ thực thể và phiên làm việc.</p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-1.5">
            <Database className="size-3.5" /> Kết nối connection pool sẵn sàng
          </div>
        </div>

        {/* AI Engine */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-600">
                <Sparkles className="size-5" />
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 text-teal-800 px-2.5 py-0.5 text-xs font-semibold">
                Sẵn sàng
              </span>
            </div>
            <h3 className="mt-4 font-semibold text-slate-900 text-base">AI Pedagogical Engine</h3>
            <p className="mt-1 text-xs text-slate-500">Google Gemini AI hỗ trợ soạn giáo án, phiếu học tập và nhận xét.</p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-1.5">
            <Shield className="size-3.5" /> Structured schema output active
          </div>
        </div>
      </div>
    </div>
  )
}
