'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Edit2,
  Eye,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createAdminHtmlGameQuestion,
  createCustomizationQuestion,
  deleteAdminHtmlGameQuestion,
  deleteCustomizationQuestion,
  getAdminHtmlGameQuestions,
  getHtmlGameCustomization,
  reorderAdminHtmlGameQuestions,
  reorderCustomizationQuestions,
  updateAdminHtmlGameQuestion,
  updateCustomizationQuestion,
  type HtmlGameQuestion,
  type HtmlGameQuestionPayload,
  type HtmlGameQuestionType,
} from '@/services/html-game-service'

type EditorTarget = {
  mode: 'ADMIN' | 'TEACHER'
  id: string
  title: string
}

type Draft = {
  question: string
  type: HtmlGameQuestionType
  options: string[]
  correctSingle: string
  correctMultiple: string[]
  correctBoolean: boolean
  correctShort: string
  explanation: string
}

const EMPTY_DRAFT: Draft = {
  question: '',
  type: 'SINGLE_CHOICE',
  options: ['', ''],
  correctSingle: '',
  correctMultiple: [],
  correctBoolean: true,
  correctShort: '',
  explanation: '',
}

const TYPE_LABELS: Record<HtmlGameQuestionType, string> = {
  SINGLE_CHOICE: 'Một đáp án',
  MULTIPLE_CHOICE: 'Nhiều đáp án',
  TRUE_FALSE: 'Đúng / Sai',
  SHORT_ANSWER: 'Trả lời ngắn',
}

function toDraft(question: HtmlGameQuestion): Draft {
  const options = Array.isArray(question.options) ? question.options.map(String) : ['', '']
  return {
    question: question.question,
    type: question.type,
    options,
    correctSingle: typeof question.correctAnswer === 'string' ? question.correctAnswer : '',
    correctMultiple: Array.isArray(question.correctAnswer) ? question.correctAnswer.map(String) : [],
    correctBoolean: typeof question.correctAnswer === 'boolean' ? question.correctAnswer : true,
    correctShort: typeof question.correctAnswer === 'string' ? question.correctAnswer : '',
    explanation: question.explanation || '',
  }
}

function toPayload(draft: Draft, order: number): HtmlGameQuestionPayload {
  const options = draft.options.map((option) => option.trim()).filter(Boolean)
  let correctAnswer: string | string[] | boolean
  if (draft.type === 'SINGLE_CHOICE') correctAnswer = draft.correctSingle
  else if (draft.type === 'MULTIPLE_CHOICE') correctAnswer = draft.correctMultiple
  else if (draft.type === 'TRUE_FALSE') correctAnswer = draft.correctBoolean
  else correctAnswer = draft.correctShort.trim()
  return {
    order,
    question: draft.question.trim(),
    type: draft.type,
    options: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(draft.type) ? options : null,
    correctAnswer,
    explanation: draft.explanation.trim() || null,
    metadata: null,
  }
}

export function HtmlGameQuestionEditor({
  target,
  open,
  onOpenChange,
  onPreview,
}: {
  target: EditorTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPreview: () => void
}) {
  const [questions, setQuestions] = useState<HtmlGameQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const selected = useMemo(() => questions.find((question) => question.id === selectedId) || null, [questions, selectedId])

  const load = async () => {
    if (!target) return
    setLoading(true)
    try {
      const data = target.mode === 'ADMIN'
        ? await getAdminHtmlGameQuestions(target.id)
        : (await getHtmlGameCustomization(target.id)).questions
      setQuestions(data)
      setSelectedId(data[0]?.id || null)
      setDraft(data[0] ? toDraft(data[0]) : EMPTY_DRAFT)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải bộ câu hỏi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && target) void load()
  }, [open, target?.id, target?.mode])

  const select = (question: HtmlGameQuestion) => {
    setSelectedId(question.id)
    setDraft(toDraft(question))
  }

  const add = () => {
    setSelectedId(null)
    setDraft(EMPTY_DRAFT)
  }

  const save = async () => {
    if (!target || !draft.question.trim()) {
      toast.error('Vui lòng nhập nội dung câu hỏi')
      return
    }
    setSaving(true)
    try {
      const payload = toPayload(draft, selected?.order ?? questions.length)
      if (selected) {
        if (target.mode === 'ADMIN') await updateAdminHtmlGameQuestion(target.id, selected.id, payload)
        else await updateCustomizationQuestion(target.id, selected.id, payload)
      } else if (target.mode === 'ADMIN') {
        await createAdminHtmlGameQuestion(target.id, payload)
      } else {
        await createCustomizationQuestion(target.id, payload)
      }
      toast.success(selected ? 'Đã cập nhật câu hỏi' : 'Đã thêm câu hỏi')
      await load()
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu câu hỏi')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (question: HtmlGameQuestion) => {
    if (!target || !window.confirm('Xóa câu hỏi này?')) return
    try {
      if (target.mode === 'ADMIN') await deleteAdminHtmlGameQuestion(target.id, question.id)
      else await deleteCustomizationQuestion(target.id, question.id)
      await load()
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xóa câu hỏi')
    }
  }

  const duplicate = async (question: HtmlGameQuestion) => {
    if (!target) return
    try {
      const payload: HtmlGameQuestionPayload = {
        order: questions.length,
        question: `${question.question} (bản sao)`,
        type: question.type,
        options: question.options || null,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || null,
        metadata: question.metadata || null,
      }
      if (target.mode === 'ADMIN') await createAdminHtmlGameQuestion(target.id, payload)
      else await createCustomizationQuestion(target.id, payload)
      await load()
    } catch (err: any) {
      toast.error(err?.message || 'Không thể nhân bản câu hỏi')
    }
  }

  const move = async (index: number, direction: -1 | 1) => {
    if (!target) return
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= questions.length) return
    const next = [...questions]
    ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
    setQuestions(next)
    try {
      if (target.mode === 'ADMIN') await reorderAdminHtmlGameQuestions(target.id, next.map((item) => item.id))
      else await reorderCustomizationQuestions(target.id, next.map((item) => item.id))
    } catch (err: any) {
      toast.error(err?.message || 'Không thể sắp xếp câu hỏi')
      await load()
    }
  }

  const updateOption = (index: number, value: string) => {
    const options = [...draft.options]
    const oldValue = options[index]
    options[index] = value
    setDraft({
      ...draft,
      options,
      correctSingle: draft.correctSingle === oldValue ? value : draft.correctSingle,
      correctMultiple: draft.correctMultiple.map((answer) => answer === oldValue ? value : answer),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="h-[90dvh]">
        <DialogHeader>
          <DialogTitle>Cấu hình câu hỏi · {target?.title}</DialogTitle>
          <DialogDescription>{target?.mode === 'ADMIN' ? 'Bộ câu hỏi master dùng khi giáo viên tạo bản tùy chỉnh lần đầu.' : 'Bản riêng của bạn; thay đổi master sau này không ghi đè bộ này.'}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="grid flex-1 place-items-center"><Loader2 className="size-7 animate-spin text-teal-600" /></div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[340px_1fr]">
            <aside className="flex min-h-0 flex-col rounded-xl border border-slate-200">
              <div className="flex items-center justify-between border-b p-3"><b className="text-sm">{questions.length} câu hỏi</b><Button size="sm" onClick={add} className="gap-1.5"><Plus className="size-3.5" /> Thêm</Button></div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                {questions.map((question, index) => (
                  <div key={question.id} className={`w-full rounded-xl border p-3 ${selectedId === question.id ? 'border-teal-400 bg-teal-50' : 'border-slate-200 bg-white'}`}>
                    <button type="button" onClick={() => select(question)} className="flex w-full items-start gap-2 text-left">
                      <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-semibold">{index + 1}</span>
                      <span className="line-clamp-2 flex-1 text-sm font-medium">{question.question}</span>
                    </button>
                    <div className="mt-2 flex items-center justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp className="size-3.5" /></Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => move(index, 1)} disabled={index === questions.length - 1}><ArrowDown className="size-3.5" /></Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => duplicate(question)}><Copy className="size-3.5" /></Button>
                      <Button size="icon-sm" variant="ghost" className="text-rose-600" onClick={() => remove(question)}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
            <section className="min-h-0 space-y-4 overflow-y-auto rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between"><h3 className="font-semibold">{selected ? 'Sửa câu hỏi' : 'Câu hỏi mới'}</h3>{selected && <Edit2 className="size-4 text-slate-400" />}</div>
              <div className="space-y-2"><Label>Nội dung câu hỏi</Label><textarea rows={3} value={draft.question} onChange={(event) => setDraft({ ...draft, question: event.target.value })} className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-teal-500" /></div>
              <div className="space-y-2"><Label>Loại câu hỏi</Label><select value={draft.type} onChange={(event) => setDraft({ ...EMPTY_DRAFT, question: draft.question, explanation: draft.explanation, type: event.target.value as HtmlGameQuestionType })} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">{Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              {['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(draft.type) && (
                <div className="space-y-2"><div className="flex items-center justify-between"><Label>Lựa chọn</Label><Button size="sm" variant="outline" onClick={() => setDraft({ ...draft, options: [...draft.options, ''] })} disabled={draft.options.length >= 12}><Plus className="size-3.5" /> Thêm đáp án</Button></div>
                  {draft.options.map((option, index) => <div key={index} className="flex items-center gap-2">{draft.type === 'SINGLE_CHOICE' ? <input type="radio" name="correct-single" checked={draft.correctSingle === option && Boolean(option)} onChange={() => setDraft({ ...draft, correctSingle: option })} /> : <input type="checkbox" checked={draft.correctMultiple.includes(option) && Boolean(option)} onChange={(event) => setDraft({ ...draft, correctMultiple: event.target.checked ? [...draft.correctMultiple, option] : draft.correctMultiple.filter((item) => item !== option) })} />}<Input value={option} onChange={(event) => updateOption(index, event.target.value)} placeholder={`Đáp án ${index + 1}`} /><Button size="icon-sm" variant="ghost" disabled={draft.options.length <= 2} onClick={() => setDraft({ ...draft, options: draft.options.filter((_, itemIndex) => itemIndex !== index), correctMultiple: draft.correctMultiple.filter((item) => item !== option), correctSingle: draft.correctSingle === option ? '' : draft.correctSingle })}><Trash2 className="size-3.5" /></Button></div>)}
                </div>
              )}
              {draft.type === 'TRUE_FALSE' && <div className="space-y-2"><Label>Đáp án đúng</Label><select value={String(draft.correctBoolean)} onChange={(event) => setDraft({ ...draft, correctBoolean: event.target.value === 'true' })} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="true">Đúng</option><option value="false">Sai</option></select></div>}
              {draft.type === 'SHORT_ANSWER' && <div className="space-y-2"><Label>Đáp án đúng</Label><Input value={draft.correctShort} onChange={(event) => setDraft({ ...draft, correctShort: event.target.value })} /></div>}
              <div className="space-y-2"><Label>Giải thích</Label><textarea rows={2} value={draft.explanation} onChange={(event) => setDraft({ ...draft, explanation: event.target.value })} className="w-full rounded-lg border border-slate-200 p-3 text-sm" /></div>
              <Button onClick={save} disabled={saving} className="gap-2">{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Lưu câu hỏi</Button>
            </section>
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button><Button variant="outline" onClick={onPreview} className="gap-2"><Eye className="size-4" /> Preview với bộ câu hỏi</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
