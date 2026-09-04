'use client'

import React, { useState, useEffect } from 'react'
import {
  ClipboardList,
  FileCheck,
  Plus,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  FileText,
  Upload,
  BookOpen,
  Sparkles,
  Award,
  Filter,
  Trash2,
  Edit2,
  MoreVertical,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getClasses, type ClassRecord } from '@/services/classroom-service'
import { getCapabilities } from '@/lib/capabilities'
import { toast } from 'sonner'

export interface AssignmentItem {
  id: string
  title: string
  description?: string
  classroomId: string
  className?: string
  dueDate: string
  maxScore: number
  submissionsCount: number
  totalStudents: number
  type: 'HOMEWORK' | 'PROJECT' | 'ESSAY' | 'QUIZ'
  status: 'PUBLISHED' | 'DRAFT' | 'CLOSED'
  createdAt: string
}

export interface QuestionBankItem {
  id: string
  content: string
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'ESSAY' | 'SHORT_ANSWER'
  options?: string[]
  correctAnswer?: string
  subject: string
  grade: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
}

const STORAGE_ASSIGNMENTS_KEY = 'teachflow_assignments_v1'
const STORAGE_QUESTIONS_KEY = 'teachflow_question_bank_v1'

export function AssignmentsQuizzesView() {
  const capabilities = getCapabilities()
  const [activeTab, setActiveTab] = useState<'assignments' | 'question_bank'>('assignments')
  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)

  // Assignments State
  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL')

  // Create Assignment Modal
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newClassId, setNewClassId] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newMaxScore, setNewMaxScore] = useState(10)
  const [newType, setNewType] = useState<AssignmentItem['type']>('HOMEWORK')

  // Question Bank State
  const [questions, setQuestions] = useState<QuestionBankItem[]>([])
  const [questionSearch, setQuestionSearch] = useState('')
  const [questionModalOpen, setQuestionModalOpen] = useState(false)
  const [qContent, setQContent] = useState('')
  const [qType, setQType] = useState<QuestionBankItem['type']>('MULTIPLE_CHOICE')
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', ''])
  const [qCorrect, setQCorrect] = useState('0')
  const [qSubject, setQSubject] = useState('Chung')
  const [qDifficulty, setQDifficulty] = useState<QuestionBankItem['difficulty']>('MEDIUM')

  // Load Classes
  useEffect(() => {
    getClasses()
      .then((cls) => {
        setClasses(cls)
        if (cls.length > 0) setNewClassId(cls[0].id)
      })
      .catch(() => setClasses([]))
      .finally(() => setLoadingClasses(false))
  }, [])

  // Load Assignments from Local Persistence
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_ASSIGNMENTS_KEY)
      if (stored) {
        setAssignments(JSON.parse(stored))
      } else {
        // Initial sample items
        const initial: AssignmentItem[] = [
          {
            id: 'asg-1',
            title: 'Phiếu ôn tập tuần 12 - Giải bài toán',
            description: 'Học sinh hoàn thành các câu hỏi trong phiếu và nộp bài chụp hoặc file đính kèm.',
            classroomId: '',
            className: 'Lớp 4A1',
            dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
            maxScore: 10,
            submissionsCount: 28,
            totalStudents: 32,
            type: 'HOMEWORK',
            status: 'PUBLISHED',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'asg-2',
            title: 'Dự án nhỏ: Tìm hiểu lịch sử địa phương',
            description: 'Bài tập nhóm 4 thành viên, nộp báo cáo slide hoặc tài liệu tóm tắt.',
            classroomId: '',
            className: 'Lớp 4A1',
            dueDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
            maxScore: 10,
            submissionsCount: 6,
            totalStudents: 32,
            type: 'PROJECT',
            status: 'PUBLISHED',
            createdAt: new Date().toISOString(),
          },
        ]
        setAssignments(initial)
        localStorage.setItem(STORAGE_ASSIGNMENTS_KEY, JSON.stringify(initial))
      }
    } catch {
      // Ignore storage error
    }
  }, [])

  // Load Questions from Local Persistence
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_QUESTIONS_KEY)
      if (stored) {
        setQuestions(JSON.parse(stored))
      } else {
        const initialQ: QuestionBankItem[] = [
          {
            id: 'q-1',
            content: 'Muốn tính diện tích hình chữ nhật, ta làm thế nào?',
            type: 'MULTIPLE_CHOICE',
            options: [
              'Lấy chiều dài nhân với chiều rộng (cùng một đơn vị đo)',
              'Lấy chiều dài cộng với chiều rộng rồi nhân 2',
              'Lấy độ dài một cạnh nhân với chính nó',
              'Lấy tổng độ dài 4 cạnh',
            ],
            correctAnswer: '0',
            subject: 'Toán',
            grade: 'Khối 4',
            difficulty: 'EASY',
          },
          {
            id: 'q-2',
            content: 'Từ nào dưới đây là từ láy?',
            type: 'MULTIPLE_CHOICE',
            options: ['Xanh xao', 'Xanh ngắt', 'Cây cỏ', 'Xe đạp'],
            correctAnswer: '0',
            subject: 'Tiếng Việt',
            grade: 'Khối 4',
            difficulty: 'MEDIUM',
          },
        ]
        setQuestions(initialQ)
        localStorage.setItem(STORAGE_QUESTIONS_KEY, JSON.stringify(initialQ))
      }
    } catch {
      // Ignore storage error
    }
  }, [])

  const saveAssignments = (items: AssignmentItem[]) => {
    setAssignments(items)
    try {
      localStorage.setItem(STORAGE_ASSIGNMENTS_KEY, JSON.stringify(items))
    } catch {}
  }

  const saveQuestions = (items: QuestionBankItem[]) => {
    setQuestions(items)
    try {
      localStorage.setItem(STORAGE_QUESTIONS_KEY, JSON.stringify(items))
    } catch {}
  }

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      toast.error('Vui lòng nhập tiêu đề bài tập')
      return
    }

    const cls = classes.find((c) => c.id === newClassId)
    const newAsg: AssignmentItem = {
      id: `asg-${Date.now()}`,
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      classroomId: newClassId,
      className: cls?.name || 'Tất cả các lớp',
      dueDate: newDueDate || new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      maxScore: Number(newMaxScore) || 10,
      submissionsCount: 0,
      totalStudents: cls?.studentCount || 30,
      type: newType,
      status: 'PUBLISHED',
      createdAt: new Date().toISOString(),
    }

    const updated = [newAsg, ...assignments]
    saveAssignments(updated)
    setCreateModalOpen(false)
    setNewTitle('')
    setNewDesc('')
    toast.success('Đã tạo và giao bài tập mới thành công')
  }

  const handleDeleteAssignment = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa bài tập này?')) {
      const updated = assignments.filter((a) => a.id !== id)
      saveAssignments(updated)
      toast.success('Đã xóa bài tập')
    }
  }

  const handleCreateQuestion = (e: React.FormEvent) => {
    e.preventDefault()
    if (!qContent.trim()) {
      toast.error('Vui lòng nhập nội dung câu hỏi')
      return
    }

    const newQ: QuestionBankItem = {
      id: `q-${Date.now()}`,
      content: qContent.trim(),
      type: qType,
      options: qType === 'MULTIPLE_CHOICE' ? qOptions.filter((o) => o.trim().length > 0) : undefined,
      correctAnswer: qType === 'MULTIPLE_CHOICE' ? qCorrect : undefined,
      subject: qSubject.trim() || 'Chung',
      grade: 'Chung',
      difficulty: qDifficulty,
    }

    const updated = [newQ, ...questions]
    saveQuestions(updated)
    setQuestionModalOpen(false)
    setQContent('')
    toast.success('Đã thêm câu hỏi vào ngân hàng')
  }

  const handleDeleteQuestion = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
      const updated = questions.filter((q) => q.id !== id)
      saveQuestions(updated)
      toast.success('Đã xóa câu hỏi')
    }
  }

  const filteredAssignments = assignments.filter((item) => {
    const matchQuery =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchClass = selectedClassFilter === 'ALL' || item.classroomId === selectedClassFilter
    return matchQuery && matchClass
  })

  const filteredQuestions = questions.filter((q) => {
    return (
      q.content.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.subject.toLowerCase().includes(questionSearch.toLowerCase())
    )
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Bài tập & Kiểm tra
            </h1>
            <Badge variant="outline" className="text-teal-700 bg-teal-50 border-teal-200 text-xs">
              Đa cấp học
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Giao bài tập, thu bài nộp trực tuyến, quản lý câu hỏi ôn luyện và đề kiểm tra định kỳ.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'assignments'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="size-3.5" />
              <span>Bài tập & Dự án</span>
            </button>
            <button
              onClick={() => setActiveTab('question_bank')}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'question_bank'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCheck className="size-3.5" />
              <span>Ngân hàng câu hỏi</span>
            </button>
          </div>

          {activeTab === 'assignments' ? (
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 text-xs"
            >
              <Plus className="size-4" /> Tạo bài tập mới
            </Button>
          ) : (
            <Button
              onClick={() => setQuestionModalOpen(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 text-xs"
            >
              <Plus className="size-4" /> Thêm câu hỏi
            </Button>
          )}
        </div>
      </div>

      {/* TAB 1: ASSIGNMENTS & PROJECTS */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm bài tập, dự án..."
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Label className="text-xs text-slate-500 whitespace-nowrap">Lọc theo lớp:</Label>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700"
              >
                <option value="ALL">Tất cả các lớp</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignments Grid */}
          {filteredAssignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <ClipboardList className="mx-auto size-10 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700 text-sm">Chưa có bài tập nào</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Bấm "Tạo bài tập mới" để giao bài tập về nhà, bài tập nhóm hoặc phiếu ôn luyện cho người học.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssignments.map((item) => {
                const submissionPercent = item.totalStudents > 0
                  ? Math.round((item.submissionsCount / item.totalStudents) * 100)
                  : 0

                return (
                  <Card key={item.id} className="hover:border-teal-300 hover:shadow-sm transition flex flex-col justify-between">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="outline" className="text-[10px] mb-1.5 border-slate-200 text-slate-600">
                            {item.className || 'Lớp học'}
                          </Badge>
                          <CardTitle className="text-base font-bold text-slate-900 leading-snug">
                            {item.title}
                          </CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAssignment(item.id)}
                          className="size-7 text-slate-400 hover:text-rose-600"
                          title="Xóa bài tập"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      {item.description && (
                        <CardDescription className="text-xs text-slate-500 line-clamp-2 mt-1">
                          {item.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="pt-0 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-slate-400" />
                          <span>Hạn nộp: <b>{item.dueDate}</b></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Award className="size-3.5 text-amber-500" />
                          <span>Thang: <b>{item.maxScore}đ</b></span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500">Đã nộp bài:</span>
                          <span className="font-semibold text-slate-800">
                            {item.submissionsCount} / {item.totalStudents} ({submissionPercent}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-600 rounded-full"
                            style={{ width: `${Math.min(100, submissionPercent)}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QUESTION BANK */}
      {activeTab === 'question_bank' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={questionSearch}
                onChange={(e) => setQuestionSearch(e.target.value)}
                placeholder="Tìm kiếm câu hỏi trong ngân hàng..."
                className="pl-9 h-9 text-xs"
              />
            </div>
            <span className="text-xs text-slate-500">
              Tổng số: <b>{filteredQuestions.length}</b> câu hỏi
            </span>
          </div>

          {filteredQuestions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <FileCheck className="mx-auto size-10 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700 text-sm">Chưa có câu hỏi trong ngân hàng</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Lưu trữ các câu hỏi trắc nghiệm, tự luận để tạo nhanh đề kiểm tra và phiếu học tập.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-teal-200 transition flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded bg-teal-50 text-xs font-bold text-teal-700">
                        {idx + 1}
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600">
                        {q.subject}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          q.difficulty === 'EASY'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : q.difficulty === 'MEDIUM'
                            ? 'text-blue-700 bg-blue-50 border-blue-200'
                            : 'text-amber-700 bg-amber-50 border-amber-200'
                        }`}
                      >
                        {q.difficulty === 'EASY' ? 'Dễ' : q.difficulty === 'MEDIUM' ? 'Vừa' : 'Khó'}
                      </Badge>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="size-7 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>

                  <p className="text-sm font-medium text-slate-900 mt-1">{q.content}</p>

                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = String(oIdx) === q.correctAnswer
                        return (
                          <div
                            key={oIdx}
                            className={`rounded-lg px-3 py-1.5 text-xs flex items-center gap-2 ${
                              isCorrect
                                ? 'bg-teal-50 text-teal-800 font-semibold border border-teal-200'
                                : 'bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span className="font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                            <span>{opt}</span>
                            {isCorrect && <CheckCircle2 className="size-3.5 ml-auto text-teal-600 shrink-0" />}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE ASSIGNMENT */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleCreateAssignment}>
            <DialogHeader>
              <DialogTitle>Tạo bài tập mới</DialogTitle>
              <DialogDescription>
                Giao bài tập hoặc dự án học tập cho người học trong lớp.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="asg-title" className="text-xs font-semibold">
                  Tiêu đề bài tập <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="asg-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Ôn tập chương 2 - Phân số"
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div>
                <Label htmlFor="asg-desc" className="text-xs font-semibold">
                  Mô tả / Yêu cầu bài tập
                </Label>
                <Textarea
                  id="asg-desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Hướng dẫn chi tiết cách làm bài, tiêu chí đánh giá..."
                  className="mt-1 text-xs"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="asg-class" className="text-xs font-semibold">
                    Lớp nhận bài
                  </Label>
                  <select
                    id="asg-class"
                    value={newClassId}
                    onChange={(e) => setNewClassId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="asg-due" className="text-xs font-semibold">
                    Hạn nộp bài
                  </Label>
                  <Input
                    id="asg-due"
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="asg-score" className="text-xs font-semibold">
                    Thang điểm tối đa
                  </Label>
                  <Input
                    id="asg-score"
                    type="number"
                    min={1}
                    max={100}
                    value={newMaxScore}
                    onChange={(e) => setNewMaxScore(Number(e.target.value))}
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <Label htmlFor="asg-type" className="text-xs font-semibold">
                    Hình thức
                  </Label>
                  <select
                    id="asg-type"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs"
                  >
                    <option value="HOMEWORK">Bài tập về nhà</option>
                    <option value="PROJECT">Dự án nhỏ</option>
                    <option value="ESSAY">Bài tự luận / Báo cáo</option>
                    <option value="QUIZ">Trắc nghiệm</option>
                  </select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
                Giao bài tập
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: ADD QUESTION */}
      <Dialog open={questionModalOpen} onOpenChange={setQuestionModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleCreateQuestion}>
            <DialogHeader>
              <DialogTitle>Thêm câu hỏi mới</DialogTitle>
              <DialogDescription>
                Thêm câu hỏi vào kho ngân hàng đề thi & trắc nghiệm.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-3">
              <div>
                <Label htmlFor="q-content" className="text-xs font-semibold">
                  Nội dung câu hỏi <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  id="q-content"
                  value={qContent}
                  onChange={(e) => setQContent(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi..."
                  className="mt-1 text-xs"
                  rows={2}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Môn học</Label>
                  <Input
                    value={qSubject}
                    onChange={(e) => setQSubject(e.target.value)}
                    placeholder="Ví dụ: Toán, Tiếng Việt..."
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Mức độ</Label>
                  <select
                    value={qDifficulty}
                    onChange={(e) => setQDifficulty(e.target.value as any)}
                    className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs"
                  >
                    <option value="EASY">Dễ / Nhận biết</option>
                    <option value="MEDIUM">Vừa / Thông hiểu</option>
                    <option value="HARD">Khó / Vận dụng</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <Label className="text-xs font-semibold">Đáp án lựa chọn</Label>
                {qOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct-answer"
                      checked={qCorrect === String(idx)}
                      onChange={() => setQCorrect(String(idx))}
                      className="text-teal-600"
                    />
                    <span className="text-xs font-bold text-slate-500 w-4">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const copy = [...qOptions]
                        copy[idx] = e.target.value
                        setQOptions(copy)
                      }}
                      placeholder={`Đáp án ${String.fromCharCode(65 + idx)}`}
                      className="text-xs h-8"
                    />
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setQuestionModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
                Lưu vào ngân hàng
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
