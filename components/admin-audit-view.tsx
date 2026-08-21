'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  History,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Eye,
  X,
  FileJson,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react'
import { getAuditLogs, type AuditLogRecord } from '@/services/audit-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

export function AdminAuditView() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null)

  const loadData = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const res = await getAuditLogs({
        page: p,
        pageSize,
        keyword: keyword.trim() || undefined,
        action: actionFilter || undefined,
        status: statusFilter || undefined,
      })
      setLogs(res.items || [])
      setTotalItems(res.totalItems || 0)
      setTotalPages(res.totalPages || 1)
      setPage(res.page || 1)
    } catch {
      toast.error('Lỗi khi tải nhật ký hoạt động hệ thống')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, keyword, actionFilter, statusFilter])

  useEffect(() => {
    loadData(1)
  }, [actionFilter, statusFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadData(1)
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-600">
            <History className="size-4" /> Bảo mật & Giám sát
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Nhật ký hệ thống (Audit Logs)
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Theo dõi tất cả các thay đổi tài khoản, thao tác quản trị và sự kiện an ninh.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadData(page)}
          disabled={loading}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo email actor, chi tiết thao tác..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-teal-500"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">Tất cả hành động</option>
            <option value="TEACHER_CREATE">Tạo giáo viên</option>
            <option value="TEACHER_UPDATE">Cập nhật giáo viên</option>
            <option value="ENABLE_TEACHER">Mở khóa tài khoản</option>
            <option value="DISABLE_TEACHER">Khóa tài khoản</option>
            <option value="RESET_TEACHER_PASSWORD">Đặt lại mật khẩu</option>
            <option value="LOGIN_SUCCESS">Đăng nhập thành công</option>
            <option value="LOGIN_FAILED">Đăng nhập thất bại</option>
          </select>

          <select
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả kết quả</option>
            <option value="SUCCESS">Thành công (SUCCESS)</option>
            <option value="FAILURE">Thất bại (FAILURE)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-teal-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400 text-sm">
            <History className="size-10 text-slate-300 mb-1" />
            <p className="font-medium text-slate-600">Không tìm thấy nhật ký phù hợp bộ lọc</p>
            <p className="text-xs">Thử thay đổi từ khóa hoặc điều kiện tìm kiếm.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Thời gian</th>
                  <th className="px-5 py-3.5">Người thực hiện</th>
                  <th className="px-5 py-3.5">Hành động</th>
                  <th className="px-5 py-3.5">Đối tượng</th>
                  <th className="px-5 py-3.5">Trạng thái</th>
                  <th className="px-5 py-3.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isSuccess = !log.status || log.status === 'SUCCESS'
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/75 transition">
                      <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-500 font-mono">
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-900 text-xs">
                        {log.actorEmail || log.actorUserId || 'Hệ thống'}
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {log.resourceType ? `${log.resourceType}${log.resourceId ? ` (#${log.resourceId.slice(0, 8)})` : ''}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            isSuccess ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isSuccess ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                          {log.status || 'SUCCESS'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="h-8 px-2 text-slate-600 hover:text-teal-700"
                        >
                          <Eye className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 text-xs text-slate-500">
            <div>
              Hiển thị trang <strong>{page}</strong> / <strong>{totalPages}</strong> (Tổng số <strong>{totalItems}</strong> sự kiện)
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const p = Math.max(1, page - 1)
                  setPage(p)
                  loadData(p)
                }}
                disabled={page <= 1 || loading}
                className="h-8 px-2.5"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const p = Math.min(totalPages, page + 1)
                  setPage(p)
                  loadData(p)
                }}
                disabled={page >= totalPages || loading}
                className="h-8 px-2.5"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileJson className="size-4 text-teal-600" /> Chi tiết sự kiện nhật ký
            </DialogTitle>
            <DialogDescription>
              Mã sự kiện: <span className="font-mono text-xs text-slate-700">{selectedLog?.id}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="grid gap-3 py-2 text-xs">
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Thời gian:</span>
                <span className="col-span-2 font-mono text-slate-800">
                  {new Date(selectedLog.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Người thực hiện:</span>
                <span className="col-span-2 text-slate-800">
                  {selectedLog.actorEmail || selectedLog.actorUserId || 'Hệ thống'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Hành động:</span>
                <span className="col-span-2 font-semibold text-teal-700">{selectedLog.action}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-medium">Trạng thái:</span>
                <span className="col-span-2 font-semibold text-slate-800">{selectedLog.status || 'SUCCESS'}</span>
              </div>
              {selectedLog.ipAddress && (
                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-medium">Địa chỉ IP:</span>
                  <span className="col-span-2 font-mono text-slate-700">{selectedLog.ipAddress}</span>
                </div>
              )}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-slate-500 font-medium">Dữ liệu chi tiết:</span>
                <pre className="rounded-xl bg-slate-900 p-3 text-[11px] text-slate-200 overflow-x-auto whitespace-pre-wrap">
                  {selectedLog.details || 'Không có chi tiết mở rộng'}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLog(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
