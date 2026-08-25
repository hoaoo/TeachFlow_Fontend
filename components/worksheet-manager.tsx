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
  Sparkles,
  X,
  Eye,
  Send,
  Printer,
  Image as ImageIcon,
  ArrowLeft,
} from 'lucide-react'
import {
  getWorksheets,
  getWorksheet,
  getWorksheetAssignments,
  createWorksheet,
  updateWorksheet,
  deleteWorksheet,
  duplicateWorksheet,
  type WorksheetItem,
  type WorksheetAssignment,
  type WorksheetQuestion,
  type WorksheetQuestionInput,
} from '@/services/worksheet-service'
import { exportService } from '@/services/export-service'
import { generateWorksheet, generateImage } from '@/services/ai-service'
import { WorksheetAssignmentDialog } from '@/components/worksheet-assignment-dialog'
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

const QUESTION_TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: 'Trắc nghiệm',
  TRUE_FALSE: 'Đúng / Sai',
  FILL_BLANK: 'Điền khuyết',
  MATCHING: 'Nối cột',
  ESSAY: 'Tự luận',
}

type DraftQuestion = {
  id: string
  questionType: WorksheetQuestion['questionType']
  content: string
  options: string[]
  correctAnswer: string
  explanation: string
}

function emptyQuestion(index: number): DraftQuestion {
  return {
    id: `q-${Date.now()}-${index}`,
    questionType: 'MULTIPLE_CHOICE',
    content: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    explanation: '',
  }
}

function fromApiQuestions(questions?: WorksheetQuestion[]): DraftQuestion[] {
  if (!questions || questions.length === 0) return [emptyQuestion(0)]
  return questions.map((q, i) => ({
    id: q.id || `q-${i}`,
    questionType: q.questionType,
    content: q.content,
    options: Array.isArray(q.optionsJson)
      ? q.optionsJson.map(String)
      : Array.isArray((q as any).options)
        ? (q as any).options.map(String)
        : ['', '', '', ''],
    correctAnswer: typeof q.correctAnswerJson === 'string' ? q.correctAnswerJson : JSON.stringify(q.correctAnswerJson || ''),
    explanation: q.explanation || '',
  }))
}

export function WorksheetManager() {
  const [worksheets, setWorksheets] = useState<WorksheetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list')
  const [editorTab, setEditorTab] = useState<'edit' | 'preview'>('edit')

  const [editTarget, setEditTarget] = useState<WorksheetItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WorksheetItem | null>(null)
  const [assignTarget, setAssignTarget] = useState<WorksheetItem | null>(null)
  const [assignmentsByWorksheet, setAssignmentsByWorksheet] = useState<Record<string, WorksheetAssignment[]>>({})
  const [aiOpen, setAiOpen] = useState(false)
  const [imageOpen, setImageOpen] = useState(false)
  const [overwriteOpen, setOverwriteOpen] = useState(false)
  const [pendingAiQuestions, setPendingAiQuestions] = useState<DraftQuestion[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exportingId, setExportingId] = useState<string | null>(null)

  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSubject, setFormSubject] = useState('Toán')
  const [formGrade, setFormGrade] = useState('Lớp 4')
  const [formStatus, setFormStatus] = useState('Bản nháp')
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion(0)])
  const [includeAnswers, setIncludeAnswers] = useState(false)

  const [aiTopic, setAiTopic] = useState('')
  const [aiGrade, setAiGrade] = useState(4)
  const [aiSubject, setAiSubject] = useState('Toán')
  const [aiCount, setAiCount] = useState(5)
  const [aiDifficulty, setAiDifficulty] = useState('Trung bình')
  const [aiTypes, setAiTypes] = useState<string[]>(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK'])
  const [aiKnowledge, setAiKnowledge] = useState('')
  const [aiIncludeAnswers, setAiIncludeAnswers] = useState(true)
  const [aiExtra, setAiExtra] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)

  const [imgPrompt, setImgPrompt] = useState('')
  const [imgStyle, setImgStyle] = useState('minh họa sách giáo khoa')
  const [imgRatio, setImgRatio] = useState('1:1')
  const [imgGenerating, setImgGenerating] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getWorksheets()
      setWorksheets(data)
      const assignmentEntries = await Promise.all(data.map(async (item) => [item.id, await getWorksheetAssignments(item.id).catch(() => [])] as const))
      setAssignmentsByWorksheet(Object.fromEntries(assignmentEntries))
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
    setQuestions([emptyQuestion(0)])
    setEditorTab('edit')
    setViewMode('editor')
  }

  const openEdit = async (item: WorksheetItem) => {
    try {
      const full = await getWorksheet(item.id)
      setEditTarget(full)
      setFormTitle(full.title)
      setFormDescription(full.description || '')
      setFormStatus(full.status || 'Bản nháp')
      setQuestions(fromApiQuestions(full.questions))
      setEditorTab('edit')
      setViewMode('editor')
    } catch (err: any) {
      toast.error(err?.message || 'Không tải được phiếu học tập')
    }
  }

  const toQuestionPayload = (): WorksheetQuestionInput[] =>
    questions
      .filter((q) => q.content.trim())
      .map((q, index) => ({
        questionType: q.questionType,
        content: q.content.trim(),
        options: q.options.filter((o) => o.trim()),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        sortOrder: index,
      }))

  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast.error('Vui lòng nhập tên phiếu học tập')
      return
    }
    const payload = toQuestionPayload()
    if (payload.length === 0) {
      toast.error('Phiếu học tập cần ít nhất một câu hỏi')
      return
    }
    setSubmitting(true)
    try {
      if (editTarget) {
        const updated = await updateWorksheet(editTarget.id, {
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          status: formStatus,
          questions: payload,
        })
        setWorksheets((prev) => prev.map((w) => (w.id === editTarget.id ? { ...w, ...updated } : w)))
        setEditTarget(updated)
        toast.success('Đã cập nhật phiếu học tập')
      } else {
        const created = await createWorksheet({
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          subtitle: `${formSubject} · ${formGrade}`,
          status: formStatus,
          questions: payload,
        })
        setWorksheets((prev) => [created, ...prev])
        setEditTarget(created)
        toast.success('Đã lưu phiếu học tập')
      }
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

  const applyAiQuestions = (next: DraftQuestion[]) => {
    setQuestions(next)
    setViewMode('editor')
    setEditorTab('edit')
    setAiOpen(false)
    toast.success('AI đã đổ câu hỏi vào trình soạn. Hãy rà soát rồi lưu.')
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
        lesson: aiTopic.trim(),
        numberOfQuestions: aiCount,
        difficulty: aiDifficulty,
        questionTypes: aiTypes,
        knowledgeContent: aiKnowledge.trim() || undefined,
        includeAnswers: aiIncludeAnswers,
        additionalRequirements: aiExtra.trim() || undefined,
      })
      const source = generated.editorDraft?.questions || generated.questions || []
      const mapped: DraftQuestion[] = source.map((q, i) => ({
        id: `q-ai-${Date.now()}-${i}`,
        questionType: (q.questionType as any) || 'MULTIPLE_CHOICE',
        content: q.content,
        options: q.options && q.options.length > 0 ? q.options : ['', '', '', ''],
        correctAnswer: q.correctAnswer || (q as { answer?: string }).answer || '',
        explanation: q.explanation || '',
      }))
      if (!formTitle.trim()) setFormTitle(generated.title || `Phiếu học tập: ${aiTopic.trim()}`)
      if (!formDescription.trim()) setFormDescription(generated.editorDraft?.description || `Phiếu bài tập ${aiSubject} Lớp ${aiGrade}`)
      setFormSubject(aiSubject)
      setFormGrade(`Lớp ${aiGrade}`)

      const hasContent = questions.some((q) => q.content.trim())
      if (hasContent) {
        setPendingAiQuestions(mapped)
        setOverwriteOpen(true)
      } else {
        applyAiQuestions(mapped)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi tạo phiếu bằng AI')
    } finally {
      setAiGenerating(false)
    }
  }

  const handlePrint = () => {
    setEditorTab('preview')
    setTimeout(() => window.print(), 200)
  }

  if (viewMode === 'editor') {
    return (
      <div className="mx-auto max-w-5xl flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setViewMode('list')} className="gap-1.5">
              <ArrowLeft className="size-4" /> Danh sách
            </Button>
            <h1 className="text-lg font-semibold text-slate-900">{editTarget ? 'Chỉnh sửa phiếu' : 'Soạn phiếu học tập'}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => setEditorTab('edit')}
                className={`rounded-lg px-3 py-1 text-xs font-semibold ${editorTab === 'edit' ? 'bg-white shadow-2xs' : 'text-slate-500'}`}
              >
                Chỉnh sửa
              </button>
              <button
                onClick={() => setEditorTab('preview')}
                className={`rounded-lg px-3 py-1 text-xs font-semibold ${editorTab === 'preview' ? 'bg-white shadow-2xs' : 'text-slate-500'}`}
              >
                👁 Xem trước
              </button>
            </div>
            <Button size="sm" variant="outline" onClick={() => setAiOpen(true)} className="text-xs gap-1">
              <Sparkles className="size-3.5" /> Tạo bằng AI
            </Button>
            <Button size="sm" variant="outline" onClick={() => setImageOpen(true)} className="text-xs gap-1">
              <ImageIcon className="size-3.5" /> Tạo ảnh bằng AI
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint} className="text-xs gap-1">
              <Printer className="size-3.5" /> In
            </Button>
            {editTarget && (
              <Button size="sm" variant="outline" onClick={() => handleExportPdf(editTarget, includeAnswers)} className="text-xs gap-1">
                <Download className="size-3.5" /> Xuất PDF
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={submitting} className="text-xs gap-1">
              {submitting && <Loader2 className="size-3.5 animate-spin" />} Lưu phiếu
            </Button>
          </div>
        </div>

        {editorTab === 'preview' ? (
          <WorksheetPreview
            title={formTitle || 'Phiếu học tập'}
            subject={formSubject}
            grade={formGrade}
            questions={questions}
            includeAnswers={includeAnswers}
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 print:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold">Tên phiếu *</Label>
                <Input className="mt-1" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold">Môn</Label>
                <Input className="mt-1" value={formSubject} onChange={(e) => setFormSubject(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold">Lớp</Label>
                <Input className="mt-1" value={formGrade} onChange={(e) => setFormGrade(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold">Hướng dẫn</Label>
                <textarea className="mt-1 w-full rounded-md border px-3 py-2 text-sm" rows={2} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={includeAnswers} onChange={(e) => setIncludeAnswers(e.target.checked)} />
              Hiện đáp án khi xem trước / in
            </label>

            <div className="space-y-3">
              {questions.map((q, index) => (
                <div key={q.id} className="rounded-xl border border-slate-200 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-700">Câu {index + 1}</p>
                    <div className="flex items-center gap-2">
                      <select
                        className="h-8 rounded-md border px-2 text-xs"
                        value={q.questionType}
                        onChange={(e) => {
                          const next = [...questions]
                          next[index] = { ...q, questionType: e.target.value as DraftQuestion['questionType'] }
                          setQuestions(next)
                        }}
                      >
                        {Object.entries(QUESTION_TYPE_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <Button size="sm" variant="ghost" className="h-8 text-rose-600" onClick={() => setQuestions(questions.filter((_, i) => i !== index).length ? questions.filter((_, i) => i !== index) : [emptyQuestion(0)])}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <textarea
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Nội dung câu hỏi"
                    value={q.content}
                    onChange={(e) => {
                      const next = [...questions]
                      next[index] = { ...q, content: e.target.value }
                      setQuestions(next)
                    }}
                  />
                  {q.questionType !== 'ESSAY' && q.questionType !== 'FILL_BLANK' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, oi) => (
                        <Input
                          key={oi}
                          className="text-xs"
                          placeholder={`Lựa chọn ${oi + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const next = [...questions]
                            const options = [...q.options]
                            options[oi] = e.target.value
                            next[index] = { ...q, options }
                            setQuestions(next)
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {q.questionType === 'FILL_BLANK' && (
                    <p className="text-[11px] text-slate-500">Học sinh sẽ có khoảng trống để điền khi xem trước / in.</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input className="text-xs" placeholder="Đáp án (dành cho giáo viên)" value={q.correctAnswer} onChange={(e) => {
                      const next = [...questions]
                      next[index] = { ...q, correctAnswer: e.target.value }
                      setQuestions(next)
                    }} />
                    <Input className="text-xs" placeholder="Giải thích" value={q.explanation} onChange={(e) => {
                      const next = [...questions]
                      next[index] = { ...q, explanation: e.target.value }
                      setQuestions(next)
                    }} />
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setQuestions((prev) => [...prev, emptyQuestion(prev.length)])}>
                <Plus className="size-3.5" /> Thêm câu hỏi
              </Button>
            </div>
          </div>
        )}

      <AiWorksheetDialog
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          aiTopic={aiTopic} setAiTopic={setAiTopic}
          aiGrade={aiGrade} setAiGrade={setAiGrade}
          aiSubject={aiSubject} setAiSubject={setAiSubject}
          aiCount={aiCount} setAiCount={setAiCount}
          aiDifficulty={aiDifficulty} setAiDifficulty={setAiDifficulty}
          aiTypes={aiTypes} setAiTypes={setAiTypes}
          aiKnowledge={aiKnowledge} setAiKnowledge={setAiKnowledge}
          aiIncludeAnswers={aiIncludeAnswers} setAiIncludeAnswers={setAiIncludeAnswers}
          aiExtra={aiExtra} setAiExtra={setAiExtra}
          aiGenerating={aiGenerating}
          onGenerate={handleGenerateAiWorksheet}
        />

        <ImageAiDialog
          open={imageOpen}
          generating={imgGenerating}
          prompt={imgPrompt} setPrompt={setImgPrompt}
          style={imgStyle} setStyle={setImgStyle}
          ratio={imgRatio} setRatio={setImgRatio}
          onClose={() => setImageOpen(false)}
          onGenerate={async () => {
            if (!imgPrompt.trim()) { toast.error('Vui lòng nhập mô tả ảnh'); return }
            setImgGenerating(true)
            try {
              const result = await generateImage({
                prompt: imgPrompt.trim(),
                style: imgStyle,
                aspectRatio: imgRatio,
                purpose: 'worksheet',
                title: formTitle || 'Ảnh phiếu học tập',
              })
              toast.success(`Đã lưu ảnh: ${result.name || result.fileName}`)
              setQuestions((prev) => {
                if (prev.length === 0) return prev
                const next = [...prev]
                next[0] = { ...next[0], content: `${next[0].content}\n[[image:${result.resourceId}]]`.trim() }
                return next
              })
              setImageOpen(false)
            } catch (err: any) {
              toast.error(err?.message || 'Không thể tạo ảnh lúc này')
            } finally {
              setImgGenerating(false)
            }
          }}
        />

        <Dialog open={overwriteOpen} onOpenChange={(o) => !o && setOverwriteOpen(false)}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>AI sẽ thay câu hỏi đang soạn?</DialogTitle>
              <DialogDescription>Phiếu hiện tại đã có nội dung. Chọn cách áp dụng kết quả AI.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setOverwriteOpen(false); setPendingAiQuestions(null) }}>Hủy</Button>
              <Button variant="outline" onClick={() => {
                if (!pendingAiQuestions) return
                setQuestions((prev) => [...prev.filter((q) => q.content.trim()), ...pendingAiQuestions])
                setOverwriteOpen(false)
                setPendingAiQuestions(null)
                setAiOpen(false)
                toast.success('Đã thêm câu hỏi AI, giữ nguyên câu hỏi cũ.')
              }}>Thêm vào cuối</Button>
              <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => {
                if (!pendingAiQuestions) return
                applyAiQuestions(pendingAiQuestions)
                setOverwriteOpen(false)
                setPendingAiQuestions(null)
              }}>Ghi đè</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-teal-600">
            <FileText className="size-4" /> TeachFlow Workspace
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Phiếu học tập</h1>
          <p className="mt-2 text-sm text-slate-500">Tạo, quản lý và xuất bản phiếu bài tập, câu hỏi ôn luyện cho học sinh.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => { openCreate(); setAiOpen(true) }} className="gap-2 text-teal-700 border-teal-200 hover:bg-teal-50">
            <Sparkles className="size-4" /> Tạo bằng AI
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="size-4" /> Tạo thủ công
          </Button>
        </div>
      </div>

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
            <Button variant="outline" onClick={() => { openCreate(); setAiOpen(true) }}>
              <Sparkles className="size-4" /> Tạo bằng AI
            </Button>
            <Button onClick={openCreate}>
              <Plus className="size-4" /> Tạo thủ công
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900 text-base">{item.title}</h3>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-700'}`}>
                    {STATUS_LABELS[item.status] || item.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {item.subtitle || 'Phiếu bài tập'} {item.meta ? `· ${item.meta}` : ''} · {item.questionsCount || 0} câu hỏi
                </p>
              </div>
              {(assignmentsByWorksheet[item.id] || []).filter((assignment) => assignment.status !== 'CANCELLED').length > 0 && (
                <span className="text-[11px] font-semibold text-teal-700">
                  Đã giao: {(assignmentsByWorksheet[item.id] || []).filter((assignment) => assignment.status !== 'CANCELLED').map((assignment) => assignment.classroom?.name).join(', ')}
                </span>
              )}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setAssignTarget(item)}><Send className="size-3.5" /> Giao bài</Button>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => openEdit(item)}>
                  <Edit2 className="size-3.5" /> Chỉnh sửa
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => { openEdit(item).then(() => setEditorTab('preview')) }}>
                  <Eye className="size-3.5" /> Xem trước
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" disabled={exportingId === item.id} onClick={() => handleExportPdf(item, false)}>
                  {exportingId === item.id ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3.5" />} PDF
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => handleDuplicate(item)}><Copy className="size-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-8 px-2 text-red-600" onClick={() => setDeleteTarget(item)}><Trash2 className="size-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <WorksheetAssignmentDialog worksheet={assignTarget} open={!!assignTarget} onClose={() => setAssignTarget(null)} onAssigned={loadData} />

      <AiWorksheetDialog
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        aiTopic={aiTopic} setAiTopic={setAiTopic}
        aiGrade={aiGrade} setAiGrade={setAiGrade}
        aiSubject={aiSubject} setAiSubject={setAiSubject}
        aiCount={aiCount} setAiCount={setAiCount}
        aiDifficulty={aiDifficulty} setAiDifficulty={setAiDifficulty}
        aiTypes={aiTypes} setAiTypes={setAiTypes}
        aiKnowledge={aiKnowledge} setAiKnowledge={setAiKnowledge}
        aiIncludeAnswers={aiIncludeAnswers} setAiIncludeAnswers={setAiIncludeAnswers}
        aiExtra={aiExtra} setAiExtra={setAiExtra}
        aiGenerating={aiGenerating}
        onGenerate={handleGenerateAiWorksheet}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Xóa phiếu học tập</DialogTitle>
            <DialogDescription>Bạn có chắc chắn muốn xóa "{deleteTarget?.title}"?</DialogDescription>
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

function WorksheetPreview({
  title,
  subject,
  grade,
  questions,
  includeAnswers,
}: {
  title: string
  subject: string
  grade: string
  questions: DraftQuestion[]
  includeAnswers: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm text-slate-800 print:border-0 print:shadow-none">
      <div className="text-center pb-6 border-b border-slate-200">
        <h2 className="text-xl font-bold uppercase tracking-tight">PHIẾU HỌC TẬP</h2>
        <h3 className="text-lg font-bold text-teal-800 mt-1">{title}</h3>
        <p className="text-xs text-slate-500 mt-2">Môn: <strong className="text-slate-800">{subject}</strong> · {grade}</p>
      </div>
      <div className="grid grid-cols-2 gap-6 text-sm mt-6">
        <p>Họ tên: __________________</p>
        <p>Lớp: _____________________</p>
      </div>
      <div className="mt-8 space-y-6">
        {questions.filter((q) => q.content.trim()).map((q, i) => (
          <div key={q.id} className="text-sm">
            <p className="font-semibold">Câu {i + 1}. {q.content.replace(/\[\[image:[^\]]+\]\]/g, '').trim()}</p>
            {q.content.includes('[[image:') && <p className="text-xs italic text-slate-500 mt-1">[Hình minh họa đính kèm]</p>}
            {q.questionType === 'MULTIPLE_CHOICE' && (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 pl-4">
                {q.options.filter(Boolean).map((opt, oi) => <p key={oi}>{opt}</p>)}
              </div>
            )}
            {q.questionType === 'TRUE_FALSE' && <p className="mt-2 pl-4">☐ Đúng &nbsp;&nbsp; ☐ Sai</p>}
            {q.questionType === 'FILL_BLANK' && <p className="mt-3 pl-4">Đáp án: ____________________________</p>}
            {q.questionType === 'ESSAY' && <div className="mt-3 h-20 border-b border-dashed border-slate-300" />}
            {q.questionType === 'MATCHING' && (
              <div className="mt-2 pl-4 space-y-1">
                {q.options.filter(Boolean).map((opt, oi) => <p key={oi}>{opt}</p>)}
              </div>
            )}
            {includeAnswers && q.correctAnswer && (
              <p className="mt-2 text-xs text-teal-700">Đáp án: {q.correctAnswer}{q.explanation ? ` — ${q.explanation}` : ''}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function AiWorksheetDialog(props: any) {
  const {
    open, onClose, aiTopic, setAiTopic, aiGrade, setAiGrade, aiSubject, setAiSubject,
    aiCount, setAiCount, aiDifficulty, setAiDifficulty, aiTypes, setAiTypes,
    aiKnowledge, setAiKnowledge, aiIncludeAnswers, setAiIncludeAnswers, aiExtra, setAiExtra,
    aiGenerating, onGenerate,
  } = props
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-teal-600" /> Tạo bằng AI
          </DialogTitle>
          <DialogDescription>AI trả structured JSON và đổ vào editor. Không tự lưu phiếu.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2 text-xs">
          <div>
            <Label className="text-xs font-semibold">Tên bài / chủ đề *</Label>
            <Input className="mt-1" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Môn</Label>
              <select className="mt-1 h-9 w-full rounded-md border px-2" value={aiSubject} onChange={(e) => setAiSubject(e.target.value)}>
                <option>Toán</option><option>Tiếng Việt</option><option>Khoa học</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Khối</Label>
              <select className="mt-1 h-9 w-full rounded-md border px-2" value={aiGrade} onChange={(e) => setAiGrade(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((g) => <option key={g} value={g}>Khối {g}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold">Nội dung kiến thức</Label>
            <textarea className="mt-1 w-full rounded-md border px-3 py-2" rows={2} value={aiKnowledge} onChange={(e) => setAiKnowledge(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs font-semibold">Mức độ</Label>
            <select className="mt-1 h-9 w-full rounded-md border px-2" value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)}>
              <option>Dễ</option><option>Trung bình</option><option>Khó</option><option>Phân hóa</option>
            </select>
          </div>
          <div>
            <Label className="text-xs font-semibold">Số câu: {aiCount}</Label>
            <input type="range" min={3} max={15} value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))} className="mt-2 w-full accent-teal-600" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(QUESTION_TYPE_LABEL).map(([value, label]) => (
              <label key={value} className="flex items-center gap-1 text-[11px]">
                <input
                  type="checkbox"
                  checked={aiTypes.includes(value)}
                  onChange={(e) => setAiTypes(e.target.checked ? [...aiTypes, value] : aiTypes.filter((t: string) => t !== value))}
                />
                {label}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={aiIncludeAnswers} onChange={(e) => setAiIncludeAnswers(e.target.checked)} />
            Có đáp án cho giáo viên
          </label>
          <div>
            <Label className="text-xs font-semibold">Yêu cầu thêm</Label>
            <Input className="mt-1" value={aiExtra} onChange={(e) => setAiExtra(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={aiGenerating}>Hủy</Button>
          <Button onClick={onGenerate} disabled={aiGenerating || !aiTopic.trim()}>
            {aiGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {aiGenerating ? 'AI đang tạo nội dung...' : '✨ Tạo bằng AI'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ImageAiDialog({
  open, onClose, prompt, setPrompt, style, setStyle, ratio, setRatio, generating, onGenerate,
}: any) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>✨ Tạo ảnh bằng AI</DialogTitle>
          <DialogDescription>Ảnh được lưu vào kho tài nguyên, không lưu base64.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 text-xs">
          <textarea className="w-full rounded-md border px-3 py-2" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Mô tả ảnh" />
          <Input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="Phong cách" />
          <select className="h-9 rounded-md border px-2" value={ratio} onChange={(e) => setRatio(e.target.value)}>
            <option value="1:1">1:1</option>
            <option value="4:3">4:3</option>
            <option value="16:9">16:9</option>
          </select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={generating}>Hủy</Button>
          <Button onClick={onGenerate} disabled={generating}>
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {generating ? 'AI đang tạo nội dung...' : 'Tạo ảnh'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
