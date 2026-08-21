'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FileText,
  Plus,
  Search,
  Loader2,
  Trash2,
  Edit2,
  Copy,
  Download,
  FileDown,
  Sparkles,
  MoreHorizontal,
  X,
  BookOpen,
} from 'lucide-react'
import {
  getWorksheets,
  createWorksheet,
  updateWorksheet,
  deleteWorksheet,
  duplicateWorksheet,
  type WorksheetItem,
} from '@/services/worksheet-service'
import { exportService } from '@/services/export-service'
import { generateWorksheet } from '@/services/ai-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bản nháp',
  'Bản nháp': 'Bản nháp',
  PUBLISHED: 'Đã xuất bản',
  'Đã xuất bản': 'Đã xuất bản',
  COMPLETED: 'Hoàn thành',
  'Đang sử dụng': 'Đang sử dụng',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  'Bản nháp': 'bg-slate-100 text-slate-700',
  PUBLISHED: 'bg-teal-100 text-teal-700',
  'Đã xuất bản': 'bg-teal-100 text-teal-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  'Đang sử dụng': 'bg-orange-100 text-orange-700',
}

export function WorksheetManager() {
  const [worksheets, setWorksheets] = useState<WorksheetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')

  // Modals
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<WorksheetItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WorksheetItem | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exportingId, setExportingId] = useState<string | null>(null)

  // Form states
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSubject, setFormSubject] = useState('Toán')
  const [formGrade, setFormGrade] = useState('Lớp 4')
  const [formStatus, setFormStatus] = useState('Bản nháp')

  // AI Generator state
  const [aiTopic, setAiTopic] = useState('')
  const [aiGrade, setAiGrade] = useState(4)
  const [aiSubject, setAiSubject] = useState('Toán')
  const [aiCount, setAiCount] = useState(5)
  const [aiGenerating, setAiGenerating] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getWorksheets()
      setWorksheets(data)
    } catch {
      setWorksheets([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = useMemo(() => {
    return worksheets.filter((item) => {
      const matchQ = !query || `${item.title} ${item.subtitle || ''} ${item.description || ''}`.toLowerCase().includes(query.toLowerCase())
      const matchStatus = filterStatus === 'ALL' || item.status === filterStatus
      return matchQ && matchStatus
    })
  }, [worksheets, query, filterStatus])

  const openCreate = () => {
    setEditTarget(null)
    setFormTitle('')
    setFormDescription('')
    setFormSubject('Toán')
    setFormGrade('Lớp 4')
    setFormStatus('Bản nháp')
    setFormOpen(true)
  }

  const openEdit = (item: WorksheetItem) => {
    setEditTarget(item)
    setFormTitle(item.title)
    setFormDescription(item.description || '')
    setFormStatus(item.status || 'Bản nháp')
    setFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      toast.error('Vui lòng nhập tên phiếu học tập')
      return
    }

    setSubmitting(true)
    try {
      if (editTarget) {
        const updated = await updateWorksheet(editTarget.id, {
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          status: formStatus,
        })
        setWorksheets((prev) => prev.map((w) => (w.id === editTarget.id ? { ...w, ...updated } : w)))
        toast.success('Đã cập nhật phiếu học tập')
      } else {
        const created = await createWorksheet({
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          subtitle: `${formSubject} · ${formGrade}`,
          status: formStatus,
        })
        setWorksheets((prev) => [created, ...prev])
        toast.success('Đã tạo phiếu học tập mới')
      }
      setFormOpen(false)
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi lưu phiếu học tập')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDuplicate = async (item: WorksheetItem) => {
    try {
      const copy = await duplicateWorksheet(item.id)
      setWorksheets((prev) => [copy, ...prev])
      toast.success(`Đã nhân bản "${item.title}"`)
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi nhân bản phiếu học tập')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteWorksheet(deleteTarget.id)
      setWorksheets((prev) => prev.filter((w) => w.id !== deleteTarget.id))
      toast.success('Đã xóa phiếu học tập')
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi xóa phiếu học tập')
    } finally {
      setDeleting(false)
    }
  }

  const handleExportDocx = async (item: WorksheetItem, withAnswers: boolean) => {
    setExportingId(item.id)
    try {
      await exportService.exportWorksheetDocx(item.id, withAnswers, item.title.replace(/\s+/g, '_'))
      toast.success('Đã tải xuống file DOCX')
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi xuất DOCX')
    } finally {
      setExportingId(null)
    }
  }

  const handleExportPdf = async (item: WorksheetItem, withAnswers: boolean) => {
    setExportingId(item.id)
    try {
      await exportService.exportWorksheetPdf(item.id, withAnswers, item.title.replace(/\s+/g, '_'))
      toast.success('Đã tải xuống file PDF')
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi xuất PDF')
    } finally {
      setExportingId(null)
    }
  }

  const handleGenerateAiWorksheet = async () => {
    if (!aiTopic.trim()) {
      toast.error('Vui lòng nhập chủ đề / nội dung bài học')
      return
    }
    setAiGenerating(true)
    try {
      const generated = await generateWorksheet({
        grade: aiGrade,
        subject: aiSubject,
        topic: aiTopic.trim(),
        questionCount: aiCount,
      })

      const title = generated.title || `Phiếu học tập: ${aiTopic.trim()}`
      const created = await createWorksheet({
        title,
        description: generated.description || `Phiếu bài tập ${aiSubject} Lớp ${aiGrade} gồm ${aiCount} câu hỏi`,
        subtitle: `${aiSubject} · Lớp ${aiGrade}`,
        status: 'Bản nháp',
      })
      setWorksheets((prev) => [created, ...prev])
      toast.success('AI đã soạn thảo phiếu học tập thành công!')
      setAiOpen(false)
      setAiTopic('')
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi tạo phiếu bằng AI')
    } finally {
      setAiGenerating(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-teal-600">
            <FileText className="size-4" /> TeachFlow Workspace
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Phiếu học tập</h1>
          <p className="mt-2 text-sm text-slate-500">Tạo, quản lý và xuất bản phiếu bài tập, câu hỏi ôn luyện cho học sinh.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setAiOpen(true)} className="gap-2 text-teal-700 border-teal-200 hover:bg-teal-50">
            <Sparkles className="size-4" /> AI Tạo nhanh
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="size-4" /> Tạo phiếu mới
          </Button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên phiếu, môn, chủ đề..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-teal-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="size-4" />
            </button>
          )}
        </div>
        <select
          aria-label="Lọc theo trạng thái"
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="Bản nháp">Bản nháp</option>
          <option value="Đã xuất bản">Đã xuất bản</option>
          <option value="Đang sử dụng">Đang sử dụng</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tổng số phiếu', value: filtered.length, color: 'text-slate-900' },
          { label: 'Đã xuất bản', value: filtered.filter((w) => w.status === 'Đã xuất bản' || w.status === 'PUBLISHED').length, color: 'text-teal-600' },
          { label: 'Bản nháp', value: filtered.filter((w) => w.status === 'Bản nháp' || w.status === 'DRAFT').length, color: 'text-slate-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
          <FileText className="size-12 text-slate-300" />
          <div className="text-center">
            <p className="font-medium text-slate-600">Chưa có phiếu học tập nào</p>
            <p className="text-sm mt-1">Bắt đầu bằng việc tự tạo phiếu mới hoặc dùng trợ lý AI.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setAiOpen(true)}>
              <Sparkles className="size-4" /> AI Tạo nhanh
            </Button>
            <Button onClick={openCreate}>
              <Plus className="size-4" /> Tạo phiếu mới
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900 text-base">{item.title}</h3>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-700'}`}>
                    {STATUS_LABELS[item.status] || item.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {item.subtitle || 'Phiếu bài tập'} {item.meta ? `· ${item.meta}` : ''}
                </p>
                {item.description && (
                  <p className="mt-2 text-xs text-slate-600 line-clamp-2">{item.description}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {/* Export menu */}
                <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    disabled={exportingId === item.id}
                    onClick={() => handleExportDocx(item, false)}
                  >
                    {exportingId === item.id ? <Loader2 className="size-3 animate-spin" /> : <FileDown className="size-3.5 text-blue-600" />}
                    Word
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    disabled={exportingId === item.id}
                    onClick={() => handleExportPdf(item, false)}
                  >
                    {exportingId === item.id ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3.5 text-red-600" />}
                    PDF
                  </Button>
                </div>

                <Button size="sm" variant="ghost" className="h-8 px-2 text-slate-600" onClick={() => handleDuplicate(item)} title="Nhân bản">
                  <Copy className="size-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2 text-slate-600" onClick={() => openEdit(item)} title="Sửa thông tin">
                  <Edit2 className="size-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeleteTarget(item)} title="Xóa">
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => !o && setFormOpen(false)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Sửa phiếu học tập' : 'Tạo phiếu học tập mới'}</DialogTitle>
            <DialogDescription>
              {editTarget ? 'Cập nhật thông tin phiếu học tập.' : 'Nhập thông tin ban đầu cho phiếu học tập.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4 py-2">
            <div>
              <Label htmlFor="ws-title" className="text-xs font-semibold">Tên phiếu học tập *</Label>
              <Input
                id="ws-title"
                className="mt-1"
                placeholder="VD: Phiếu luyện tập: Phân số và phép chia"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="ws-desc" className="text-xs font-semibold">Mô tả / Hướng dẫn làm bài</Label>
              <textarea
                id="ws-desc"
                rows={3}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                placeholder="Hướng dẫn học sinh làm bài..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            {!editTarget && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ws-subject" className="text-xs font-semibold">Môn học</Label>
                  <select
                    id="ws-subject"
                    className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                  >
                    <option value="Toán">Toán</option>
                    <option value="Tiếng Việt">Tiếng Việt</option>
                    <option value="Khoa học">Khoa học</option>
                    <option value="Lịch sử & Địa lý">Lịch sử & Địa lý</option>
                    <option value="Tin học">Tin học</option>
                    <option value="Đạo đức">Đạo đức</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="ws-grade" className="text-xs font-semibold">Khối lớp</Label>
                  <select
                    id="ws-grade"
                    className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                  >
                    <option value="Lớp 1">Khối 1</option>
                    <option value="Lớp 2">Khối 2</option>
                    <option value="Lớp 3">Khối 3</option>
                    <option value="Lớp 4">Khối 4</option>
                    <option value="Lớp 5">Khối 5</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="ws-status" className="text-xs font-semibold">Trạng thái</Label>
              <select
                id="ws-status"
                className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              >
                <option value="Bản nháp">Bản nháp</option>
                <option value="Đã xuất bản">Đã xuất bản</option>
                <option value="Đang sử dụng">Đang sử dụng</option>
              </select>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>Hủy</Button>
            <Button onClick={handleSubmit as any} disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {editTarget ? 'Lưu thay đổi' : 'Tạo phiếu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Worksheet Generator Dialog */}
      <Dialog open={aiOpen} onOpenChange={(o) => !o && setAiOpen(false)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-teal-600" /> AI Tạo nhanh phiếu học tập
            </DialogTitle>
            <DialogDescription>
              Trợ lý AI sẽ tự động biên soạn câu hỏi và hướng dẫn phù hợp với chương trình học.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div>
              <Label htmlFor="ai-topic" className="text-xs font-semibold">Chủ đề / Tên bài học *</Label>
              <Input
                id="ai-topic"
                className="mt-1"
                placeholder="VD: Phân số và phép chia số tự nhiên"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ai-subject" className="text-xs font-semibold">Môn học</Label>
                <select
                  id="ai-subject"
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={aiSubject}
                  onChange={(e) => setAiSubject(e.target.value)}
                >
                  <option value="Toán">Toán</option>
                  <option value="Tiếng Việt">Tiếng Việt</option>
                  <option value="Khoa học">Khoa học</option>
                  <option value="Lịch sử & Địa lý">Lịch sử & Địa lý</option>
                </select>
              </div>

              <div>
                <Label htmlFor="ai-grade" className="text-xs font-semibold">Khối lớp</Label>
                <select
                  id="ai-grade"
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={aiGrade}
                  onChange={(e) => setAiGrade(Number(e.target.value))}
                >
                  <option value={1}>Khối 1</option>
                  <option value={2}>Khối 2</option>
                  <option value={3}>Khối 3</option>
                  <option value={4}>Khối 4</option>
                  <option value={5}>Khối 5</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="ai-count" className="text-xs font-semibold">Số lượng câu hỏi: {aiCount}</Label>
              <input
                id="ai-count"
                type="range"
                min={3}
                max={15}
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value))}
                className="mt-2 w-full accent-teal-600"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAiOpen(false)} disabled={aiGenerating}>Hủy</Button>
            <Button onClick={handleGenerateAiWorksheet} disabled={aiGenerating || !aiTopic.trim()}>
              {aiGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Bắt đầu tạo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Xóa phiếu học tập</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa "{deleteTarget?.title}"? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Hủy</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="size-4 animate-spin" />} Xóa phiếu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
