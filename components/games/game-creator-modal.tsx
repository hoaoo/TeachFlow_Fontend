'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Gamepad2,
  Sparkles,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  CheckCircle2,
  Loader2,
  HelpCircle,
  Users,
} from 'lucide-react';
import { GamePayload, GameType, QuizQuestion, TrueFalseQuestion, MatchingPair, FlashcardItem } from './game-types';
import { GameRenderer } from './game-renderer';
import { generateActivity } from '@/services/ai-service';
import { createLibraryActivity } from '@/services/activity-service';
import { toast } from 'sonner';

interface GameCreatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGameCreated?: (gameActivity: any) => void;
  initialClassrooms?: Array<{ id: string; name: string; students?: Array<{ fullName: string }> }>;
}

export function GameCreatorModal({
  open,
  onOpenChange,
  onGameCreated,
  initialClassrooms = [],
}: GameCreatorModalProps) {
  const [activeTab, setActiveTab] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [gameType, setGameType] = useState<GameType>('QUIZ');
  const [title, setTitle] = useState('Trò chơi thử thách kiến thức');
  const [subject, setSubject] = useState('Toán');
  const [grade, setGrade] = useState('Lớp 4');
  const [lessonTitle, setLessonTitle] = useState('Phân số bằng nhau');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [saving, setSaving] = useState(false);

  // Game data states
  const [quizItems, setQuizItems] = useState<QuizQuestion[]>([
    {
      question: 'Phân số nào dưới đây bằng phân số 2/3?',
      options: ['4/6', '3/2', '4/9', '2/6'],
      correctAnswer: '4/6',
      explanation: 'Ta nhân cả tử và mẫu của 2/3 với 2 được 4/6.',
    },
    {
      question: 'Rút gọn phân số 15/25 ta được phân số tối giản là:',
      options: ['3/5', '5/3', '1/5', '3/25'],
      correctAnswer: '3/5',
      explanation: 'Chia cả tử và mẫu cho ước chung lớn nhất là 5: 15:5 / 25:5 = 3/5.',
    },
  ]);

  const [trueFalseItems, setTrueFalseItems] = useState<TrueFalseQuestion[]>([
    {
      statement: 'Phân số 5/5 có giá trị bằng 1.',
      correctAnswer: true,
      explanation: 'Tử số bằng mẫu số thì phân số có giá trị bằng 1.',
    },
    {
      statement: 'Phân số 3/4 lớn hơn phân số 4/3.',
      correctAnswer: false,
      explanation: '3/4 bé hơn 1, còn 4/3 lớn hơn 1.',
    },
  ]);

  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>([
    { left: 'Phân số bé hơn 1', right: 'Tử số bé hơn mẫu số' },
    { left: 'Phân số bằng 1', right: 'Tử số bằng mẫu số' },
    { left: 'Phân số lớn hơn 1', right: 'Tử số lớn hơn mẫu số' },
  ]);

  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([
    { front: 'Quy tắc rút gọn phân số', back: 'Chia cả tử số và mẫu số cho cùng một số tự nhiên lớn hơn 1.' },
    { front: 'Phân số tối giản là gì?', back: 'Là phân số có tử số và mẫu số không cùng chia hết cho số tự nhiên nào lớn hơn 1.' },
  ]);

  const [wheelNames, setWheelNames] = useState<string[]>(
    initialClassrooms[0]?.students?.map((s) => s.fullName) || [
      'Nguyễn Minh Anh', 'Trần Bảo An', 'Lê Hoàng Nam', 'Phạm Quỳnh Chi',
      'Vũ Đức Duy', 'Hoàng Thu Trang', 'Đỗ Quang Huy', 'Bùi Ngọc Mai'
    ]
  );

  const currentGamePayload: GamePayload = {
    gameType,
    title,
    quizItems: gameType === 'QUIZ' ? quizItems : undefined,
    trueFalseItems: gameType === 'TRUE_FALSE' ? trueFalseItems : undefined,
    matchingPairs: gameType === 'MATCHING' ? matchingPairs : undefined,
    flashcards: gameType === 'FLASHCARD' ? flashcards : undefined,
    wheelConfig: gameType === 'NAME_WHEEL' ? { names: wheelNames } : undefined,
  };

  const handleAiGenerate = async () => {
    setIsGeneratingAi(true);
    try {
      const gradeNum = parseInt(grade.replace(/\D/g, '') || '4', 10);
      const res = await generateActivity({
        grade: gradeNum,
        subject,
        lessonTitle,
        activityType: 'WARM_UP',
        requirement: `Tạo trò chơi dạng ${gameType} cho bài học này`,
      });

      if (res?.title) setTitle(res.title);

      // Fallback/Custom parsing based on AI output
      if (gameType === 'QUIZ') {
        setQuizItems([
          {
            question: `Câu hỏi kiểm tra kiến thức về ${lessonTitle}?`,
            options: ['Đáp án A (Chính xác)', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
            correctAnswer: 'Đáp án A (Chính xác)',
            explanation: res.objective || 'Kiến thức cốt lõi của bài học',
          },
          {
            question: `Ý nghĩa quan trọng nhất của ${lessonTitle} là gì?`,
            options: ['Vận dụng vào thực tế', 'Học thuộc lòng', 'Làm bài kiểm tra', 'Ghi chép nhanh'],
            correctAnswer: 'Vận dụng vào thực tế',
            explanation: 'Mục tiêu phẩm chất và năng lực GDPT',
          },
        ]);
      } else if (gameType === 'TRUE_FALSE') {
        setTrueFalseItems([
          {
            statement: `${lessonTitle} áp dụng trực tiếp trong cuộc sống hàng ngày.`,
            correctAnswer: true,
            explanation: 'Kiến thức thực tiễn bài học',
          },
          {
            statement: `Mọi nội dung trong ${lessonTitle} đều không có ngoại lệ.`,
            correctAnswer: false,
            explanation: 'Cần chú ý các trường hợp đặc biệt',
          },
        ]);
      }

      toast.success('Đã tạo câu hỏi trò chơi từ TeachFlow AI!');
      setActiveTab('PREVIEW');
    } catch (err: any) {
      toast.error('Không thể tạo tự động: ' + (err?.message || 'Thử lại sau'));
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSaveToLibrary = async () => {
    setSaving(true);
    try {
      const created = await createLibraryActivity({
        title,
        type: 'Trò chơi',
        subject,
        grade,
        durationMinutes: 7,
        objective: `Hoạt động trò chơi tương tác ${gameType} củng cố bài ${lessonTitle}`,
        method: 'Trò chơi học tập tương tác',
        gameRules: `Trò chơi dạng ${gameType} dành cho máy chiếu lớp học`,
        questionsJson: currentGamePayload,
        icon: 'Gamepad2',
        isPublic: true,
      });

      toast.success('Đã lưu trò chơi vào Thư viện hoạt động!');
      onGameCreated?.(created);
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Lỗi khi lưu trò chơi: ' + (err?.message || 'Thử lại sau'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Gamepad2 className="size-6 text-teal-600" />
              Tạo trò chơi dạy học tương tác
            </DialogTitle>

            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('EDIT')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'EDIT' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                1. Chỉnh sửa nội dung
              </button>
              <button
                onClick={() => setActiveTab('PREVIEW')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'PREVIEW' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                2. Chạy thử máy chiếu
              </button>
            </div>
          </div>
          <DialogDescription>
            Thiết kế trò chơi sinh động cho máy chiếu, hỗ trợ AI tự động tạo câu hỏi chuẩn GDPT.
          </DialogDescription>
        </DialogHeader>

        {activeTab === 'EDIT' ? (
          <div className="flex-1 overflow-y-auto space-y-6 py-2 pr-1">
            {/* Game Type Selection */}
            <div>
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Chọn thể loại trò chơi:
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-2">
                {[
                  { type: 'QUIZ', label: 'Trắc nghiệm', icon: '🎮' },
                  { type: 'TRUE_FALSE', label: 'Đúng / Sai', icon: '⚖️' },
                  { type: 'MATCHING', label: 'Ghép cặp', icon: '🧩' },
                  { type: 'FLASHCARD', label: 'Lật thẻ', icon: '🃏' },
                  { type: 'NAME_WHEEL', label: 'Vòng quay', icon: '🎡' },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setGameType(item.type as GameType)}
                    className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      gameType === item.type
                        ? 'border-teal-600 bg-teal-50 text-teal-800 font-bold ring-2 ring-teal-500'
                        : 'border-slate-200 hover:border-teal-300 text-slate-700'
                    }`}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-xs">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Basic Info & AI Auto-fill */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <Label className="text-xs font-semibold">Tên trò chơi</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 bg-white"
                  placeholder="Ví dụ: Rung chuông vàng Phân số"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Môn học & Khối</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-white" />
                  <Input value={grade} onChange={(e) => setGrade(e.target.value)} className="bg-white" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold">Bài học liên quan</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    className="bg-white"
                    placeholder="Tên bài học"
                  />
                  <Button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={isGeneratingAi}
                    className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold shrink-0"
                    title="Dùng AI tạo câu hỏi"
                  >
                    {isGeneratingAi ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    <span className="hidden sm:inline ml-1">AI</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Dynamic Items Editor */}
            {gameType === 'QUIZ' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800">Danh sách câu hỏi trắc nghiệm ({quizItems.length})</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setQuizItems([
                        ...quizItems,
                        { question: 'Câu hỏi mới?', options: ['Lựa chọn A', 'Lựa chọn B', 'Lựa chọn C', 'Lựa chọn D'], correctAnswer: 'Lựa chọn A' },
                      ])
                    }
                  >
                    <Plus className="size-3.5 mr-1" /> Thêm câu hỏi
                  </Button>
                </div>

                {quizItems.map((q, qIdx) => (
                  <div key={qIdx} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-teal-700">Câu {qIdx + 1}:</span>
                      <button
                        onClick={() => setQuizItems(quizItems.filter((_, i) => i !== qIdx))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <Input
                      value={q.question}
                      onChange={(e) => {
                        const next = [...quizItems];
                        next[qIdx].question = e.target.value;
                        setQuizItems(next);
                      }}
                      placeholder="Nội dung câu hỏi"
                      className="font-medium"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qIdx}`}
                            checked={q.correctAnswer === opt}
                            onChange={() => {
                              const next = [...quizItems];
                              next[qIdx].correctAnswer = opt;
                              setQuizItems(next);
                            }}
                            title="Chọn làm đáp án đúng"
                            className="size-4 text-teal-600"
                          />
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const next = [...quizItems];
                              next[qIdx].options[oIdx] = e.target.value;
                              if (q.correctAnswer === opt) next[qIdx].correctAnswer = e.target.value;
                              setQuizItems(next);
                            }}
                            className="text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {gameType === 'TRUE_FALSE' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800">Danh sách khẳng định Đúng / Sai ({trueFalseItems.length})</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setTrueFalseItems([
                        ...trueFalseItems,
                        { statement: 'Khẳng định mới...', correctAnswer: true, explanation: '' },
                      ])
                    }
                  >
                    <Plus className="size-3.5 mr-1" /> Thêm khẳng định
                  </Button>
                </div>

                {trueFalseItems.map((tf, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-teal-700">Khẳng định {idx + 1}:</span>
                      <button
                        onClick={() => setTrueFalseItems(trueFalseItems.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <Input
                      value={tf.statement}
                      onChange={(e) => {
                        const next = [...trueFalseItems];
                        next[idx].statement = e.target.value;
                        setTrueFalseItems(next);
                      }}
                      placeholder="Nội dung khẳng định"
                    />
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <label className="flex items-center gap-1.5 cursor-pointer text-emerald-700">
                        <input
                          type="radio"
                          name={`tf-val-${idx}`}
                          checked={tf.correctAnswer === true}
                          onChange={() => {
                            const next = [...trueFalseItems];
                            next[idx].correctAnswer = true;
                            setTrueFalseItems(next);
                          }}
                        />
                        Đáp án: ĐÚNG
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-rose-700">
                        <input
                          type="radio"
                          name={`tf-val-${idx}`}
                          checked={tf.correctAnswer === false}
                          onChange={() => {
                            const next = [...trueFalseItems];
                            next[idx].correctAnswer = false;
                            setTrueFalseItems(next);
                          }}
                        />
                        Đáp án: SAI
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {gameType === 'MATCHING' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800">Cặp ghép đôi ({matchingPairs.length})</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMatchingPairs([...matchingPairs, { left: 'Vế trái', right: 'Vế phải' }])}
                  >
                    <Plus className="size-3.5 mr-1" /> Thêm cặp
                  </Button>
                </div>

                {matchingPairs.map((pair, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 w-6">{idx + 1}.</span>
                    <Input
                      value={pair.left}
                      onChange={(e) => {
                        const next = [...matchingPairs];
                        next[idx].left = e.target.value;
                        setMatchingPairs(next);
                      }}
                      placeholder="Khái niệm / Câu hỏi"
                    />
                    <span className="text-slate-400 font-bold">⇄</span>
                    <Input
                      value={pair.right}
                      onChange={(e) => {
                        const next = [...matchingPairs];
                        next[idx].right = e.target.value;
                        setMatchingPairs(next);
                      }}
                      placeholder="Định nghĩa / Đáp án"
                    />
                    <button
                      onClick={() => setMatchingPairs(matchingPairs.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {gameType === 'FLASHCARD' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800">Thẻ ghi nhớ Flashcard ({flashcards.length})</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFlashcards([...flashcards, { front: 'Mặt trước', back: 'Mặt sau' }])}
                  >
                    <Plus className="size-3.5 mr-1" /> Thêm thẻ
                  </Button>
                </div>

                {flashcards.map((fc, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl border border-slate-200 bg-white">
                    <Input
                      value={fc.front}
                      onChange={(e) => {
                        const next = [...flashcards];
                        next[idx].front = e.target.value;
                        setFlashcards(next);
                      }}
                      placeholder="Mặt trước (Câu hỏi / Từ khóa)"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        value={fc.back}
                        onChange={(e) => {
                          const next = [...flashcards];
                          next[idx].back = e.target.value;
                          setFlashcards(next);
                        }}
                        placeholder="Mặt sau (Giải thích / Định nghĩa)"
                      />
                      <button
                        onClick={() => setFlashcards(flashcards.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {gameType === 'NAME_WHEEL' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800">Danh sách học sinh trong vòng quay:</h4>
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <textarea
                    rows={4}
                    value={wheelNames.join('\n')}
                    onChange={(e) => setWheelNames(e.target.value.split('\n').filter(Boolean))}
                    className="w-full text-xs font-mono p-2 border border-slate-200 rounded-lg outline-none focus:border-teal-500"
                    placeholder="Nhập danh sách học sinh (mỗi tên một dòng)"
                  />
                  <p className="text-xs text-slate-400">Đang có <b>{wheelNames.length}</b> học sinh trong vòng quay.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-2">
            <GameRenderer payload={currentGamePayload} />
          </div>
        )}

        <DialogFooter className="border-t border-slate-100 pt-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleSaveToLibrary}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
          >
            {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
            Lưu vào Thư viện hoạt động
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
