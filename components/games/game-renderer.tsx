'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Trophy,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Shuffle,
  Users,
  Award,
} from 'lucide-react';
import { GamePayload, QuizQuestion, TrueFalseQuestion, MatchingPair, FlashcardItem, NameWheelConfig } from './game-types';
import { Button } from '@/components/ui/button';

interface GameRendererProps {
  payload: GamePayload;
  onFinish?: (score: number, total: number) => void;
  isProjectorMode?: boolean;
}

export function GameRenderer({ payload, onFinish, isProjectorMode = false }: GameRendererProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-slate-900 text-white rounded-2xl overflow-hidden shadow-2xl relative select-none transition-all ${
        fullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : 'w-full min-h-[520px]'
      }`}
    >
      {/* Top Game Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 border-b border-slate-700/60 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">{payload.title}</h3>
            <span className="text-xs text-slate-400">
              {payload.gameType === 'QUIZ'
                ? '🎮 Trắc nghiệm tương tác'
                : payload.gameType === 'TRUE_FALSE'
                ? '⚖️ Thử thách Đúng / Sai'
                : payload.gameType === 'MATCHING'
                ? '🧩 Ghép đôi kiến thức'
                : payload.gameType === 'FLASHCARD'
                ? '🃏 Thẻ ghi nhớ thông minh'
                : '🎡 Vòng quay gọi tên may mắn'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleFullscreen}
            className="text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-xl"
            title={fullscreen ? 'Thu nhỏ' : 'Toàn màn hình / Máy chiếu'}
          >
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            <span className="hidden sm:inline ml-1.5 text-xs">{fullscreen ? 'Thu nhỏ' : 'Máy chiếu'}</span>
          </Button>
        </div>
      </div>

      {/* Game Content Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto">
        {payload.gameType === 'QUIZ' && <QuizGame questions={payload.quizItems || []} onFinish={onFinish} />}
        {payload.gameType === 'TRUE_FALSE' && <TrueFalseGame questions={payload.trueFalseItems || []} onFinish={onFinish} />}
        {payload.gameType === 'MATCHING' && <MatchingGame pairs={payload.matchingPairs || []} onFinish={onFinish} />}
        {payload.gameType === 'FLASHCARD' && <FlashcardGame cards={payload.flashcards || []} />}
        {payload.gameType === 'NAME_WHEEL' && <NameWheelGame config={payload.wheelConfig} />}
      </div>
    </div>
  );
}

// ==========================================
// 1. QUIZ GAME
// ==========================================
function QuizGame({
  questions,
  onFinish,
}: {
  questions: QuizQuestion[];
  onFinish?: (score: number, total: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentQ = questions[currentIndex];

  const handleSelect = (option: string) => {
    if (isAnswered || !currentQ) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect = option.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();
    if (isCorrect) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
      onFinish?.(score + (selectedOption?.trim().toLowerCase() === currentQ?.correctAnswer.trim().toLowerCase() ? 0 : 0), questions.length);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setIsFinished(false);
  };

  if (!questions.length) {
    return <div className="text-slate-400 text-sm">Chưa có câu hỏi trắc nghiệm nào.</div>;
  }

  if (isFinished) {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center text-center max-w-md animate-in zoom-in-95 duration-200">
        <div className="grid size-20 place-items-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-4 animate-bounce">
          <Trophy className="size-10" />
        </div>
        <h2 className="text-2xl font-black text-white">HOÀN THÀNH XUẤT SẮC!</h2>
        <p className="text-slate-300 mt-2 text-sm">
          Bạn đã trả lời đúng <b className="text-teal-400 font-bold text-lg">{score}</b> / {questions.length} câu hỏi ({percent}%).
        </p>

        <Button onClick={handleRestart} className="mt-6 bg-teal-600 hover:bg-teal-500 text-white rounded-xl px-6 py-2.5 font-bold shadow-lg shadow-teal-900/30">
          <RotateCcw className="size-4 mr-2" /> Chơi lại
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl flex flex-col gap-6">
      {/* Progress header */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
        <span>Câu hỏi {currentIndex + 1} / {questions.length}</span>
        <span className="text-teal-400">Điểm: {score}</span>
      </div>

      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
        <div
          className="bg-teal-500 h-full transition-all duration-300 rounded-full"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-lg text-center">
        <h2 className="text-lg sm:text-2xl font-bold text-white leading-relaxed">
          {currentQ.question}
        </h2>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {currentQ.options.map((opt, idx) => {
          const isSelected = selectedOption === opt;
          const isCorrect = opt.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();

          let btnStyle = 'bg-slate-800/80 border-slate-700 text-slate-100 hover:bg-slate-700/80 hover:border-slate-500';
          if (isAnswered) {
            if (isCorrect) {
              btnStyle = 'bg-emerald-600/30 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500';
            } else if (isSelected && !isCorrect) {
              btnStyle = 'bg-rose-600/30 border-rose-500 text-rose-200 ring-2 ring-rose-500';
            } else {
              btnStyle = 'opacity-40 bg-slate-800/40 border-slate-700 text-slate-400';
            }
          }

          const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

          return (
            <button
              key={idx}
              disabled={isAnswered}
              onClick={() => handleSelect(opt)}
              className={`p-4 sm:p-5 rounded-2xl border text-left font-semibold text-base sm:text-lg transition-all flex items-center gap-3 cursor-pointer shadow-md ${btnStyle}`}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-slate-700/80 text-xs font-bold text-slate-200">
                {optionLabels[idx] || idx + 1}
              </span>
              <span className="flex-1">{opt}</span>
              {isAnswered && isCorrect && <CheckCircle2 className="size-6 text-emerald-400 shrink-0" />}
              {isAnswered && isSelected && !isCorrect && <XCircle className="size-6 text-rose-400 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Explanation & Next */}
      {isAnswered && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700 animate-in fade-in duration-200">
          <div className="text-xs text-slate-300 flex-1">
            {currentQ.explanation ? (
              <p><b className="text-teal-400">Giải thích:</b> {currentQ.explanation}</p>
            ) : (
              <p className="text-slate-400">Nhấn tiếp tục để sang câu hỏi kế tiếp.</p>
            )}
          </div>
          <Button onClick={handleNext} className="w-full sm:w-auto bg-teal-600 hover:bg-teal-500 text-white rounded-xl px-6 font-bold shadow-md">
            Tiếp tục <ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. TRUE / FALSE GAME
// ==========================================
function TrueFalseGame({
  questions,
  onFinish,
}: {
  questions: TrueFalseQuestion[];
  onFinish?: (score: number, total: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userChoice, setUserChoice] = useState<boolean | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentQ = questions[currentIndex];

  const handleSelect = (choice: boolean) => {
    if (isAnswered || !currentQ) return;
    setUserChoice(choice);
    setIsAnswered(true);

    const isCorrect = choice === currentQ.correctAnswer;
    if (isCorrect) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setUserChoice(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
      onFinish?.(score, questions.length);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setUserChoice(null);
    setIsAnswered(false);
    setScore(0);
    setIsFinished(false);
  };

  if (!questions.length) {
    return <div className="text-slate-400 text-sm">Chưa có khẳng định Đúng/Sai nào.</div>;
  }

  if (isFinished) {
    return (
      <div className="flex flex-col items-center text-center max-w-md animate-in zoom-in-95 duration-200">
        <div className="grid size-20 place-items-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-4 animate-bounce">
          <Trophy className="size-10" />
        </div>
        <h2 className="text-2xl font-black text-white">XUẤT SẮC!</h2>
        <p className="text-slate-300 mt-2 text-sm">
          Bạn đạt <b className="text-teal-400 font-bold text-lg">{score}</b> / {questions.length} điểm.
        </p>
        <Button onClick={handleRestart} className="mt-6 bg-teal-600 hover:bg-teal-500 text-white rounded-xl px-6 py-2.5 font-bold shadow-lg shadow-teal-900/30">
          <RotateCcw className="size-4 mr-2" /> Chơi lại
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl flex flex-col gap-6">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
        <span>Khẳng định {currentIndex + 1} / {questions.length}</span>
        <span className="text-teal-400">Điểm: {score}</span>
      </div>

      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
        <div
          className="bg-teal-500 h-full transition-all duration-300 rounded-full"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="p-8 sm:p-10 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-xl text-center min-h-[160px] flex items-center justify-center">
        <h2 className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
          "{currentQ.statement}"
        </h2>
      </div>

      {/* 2 Big Buttons: ĐÚNG / SAI */}
      <div className="grid grid-cols-2 gap-4">
        <button
          disabled={isAnswered}
          onClick={() => handleSelect(true)}
          className={`p-6 sm:p-8 rounded-2xl border-2 font-black text-xl sm:text-2xl transition-all flex flex-col items-center justify-center gap-2 cursor-pointer shadow-lg ${
            isAnswered
              ? currentQ.correctAnswer === true
                ? 'bg-emerald-600/40 border-emerald-500 text-emerald-200 ring-4 ring-emerald-500'
                : userChoice === true
                ? 'bg-rose-600/40 border-rose-500 text-rose-200'
                : 'opacity-30 bg-slate-800/40 border-slate-700'
              : 'bg-emerald-600/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-600/30 hover:border-emerald-400 hover:scale-[1.02]'
          }`}
        >
          <CheckCircle2 className="size-8 text-emerald-400" />
          <span>ĐÚNG</span>
        </button>

        <button
          disabled={isAnswered}
          onClick={() => handleSelect(false)}
          className={`p-6 sm:p-8 rounded-2xl border-2 font-black text-xl sm:text-2xl transition-all flex flex-col items-center justify-center gap-2 cursor-pointer shadow-lg ${
            isAnswered
              ? currentQ.correctAnswer === false
                ? 'bg-emerald-600/40 border-emerald-500 text-emerald-200 ring-4 ring-emerald-500'
                : userChoice === false
                ? 'bg-rose-600/40 border-rose-500 text-rose-200'
                : 'opacity-30 bg-slate-800/40 border-slate-700'
              : 'bg-rose-600/20 border-rose-500/60 text-rose-300 hover:bg-rose-600/30 hover:border-rose-400 hover:scale-[1.02]'
          }`}
        >
          <XCircle className="size-8 text-rose-400" />
          <span>SAI</span>
        </button>
      </div>

      {isAnswered && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700 animate-in fade-in duration-200">
          <div className="text-xs text-slate-300 flex-1">
            {currentQ.explanation ? (
              <p><b className="text-teal-400">Giải thích:</b> {currentQ.explanation}</p>
            ) : (
              <p className="text-slate-400">Nhấn tiếp tục để sang câu kế tiếp.</p>
            )}
          </div>
          <Button onClick={handleNext} className="w-full sm:w-auto bg-teal-600 hover:bg-teal-500 text-white rounded-xl px-6 font-bold shadow-md">
            Tiếp tục <ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. MATCHING GAME
// ==========================================
function MatchingGame({
  pairs,
  onFinish,
}: {
  pairs: MatchingPair[];
  onFinish?: (score: number, total: number) => void;
}) {
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<number>>(new Set());
  const [wrongMatch, setWrongMatch] = useState<{ left: number; right: number } | null>(null);

  // Shuffled right items with original index preserved
  const shuffledRight = useMemo(() => {
    return pairs.map((p, idx) => ({ ...p, originalIdx: idx })).sort(() => Math.random() - 0.5);
  }, [pairs]);

  const handleLeftClick = (idx: number) => {
    if (matchedPairs.has(idx)) return;
    setSelectedLeft(idx);
    setWrongMatch(null);
  };

  const handleRightClick = (originalIdx: number) => {
    if (selectedLeft === null || matchedPairs.has(originalIdx)) return;

    if (selectedLeft === originalIdx) {
      // Correct match
      const nextMatched = new Set(matchedPairs);
      nextMatched.add(originalIdx);
      setMatchedPairs(nextMatched);
      setSelectedLeft(null);
      setWrongMatch(null);

      if (nextMatched.size === pairs.length) {
        onFinish?.(pairs.length, pairs.length);
      }
    } else {
      // Wrong match
      setWrongMatch({ left: selectedLeft, right: originalIdx });
      setTimeout(() => {
        setWrongMatch(null);
        setSelectedLeft(null);
      }, 700);
    }
  };

  const handleRestart = () => {
    setSelectedLeft(null);
    setMatchedPairs(new Set());
    setWrongMatch(null);
  };

  if (!pairs.length) {
    return <div className="text-slate-400 text-sm">Chưa có dữ liệu ghép cặp.</div>;
  }

  const isCompleted = matchedPairs.size === pairs.length;

  if (isCompleted) {
    return (
      <div className="flex flex-col items-center text-center max-w-md animate-in zoom-in-95 duration-200">
        <div className="grid size-20 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-4 animate-bounce">
          <Trophy className="size-10" />
        </div>
        <h2 className="text-2xl font-black text-white">HOÀN THÀNH GHÉP CẶP!</h2>
        <p className="text-slate-300 mt-2 text-sm">
          Bạn đã ghép chính xác toàn bộ {pairs.length} cặp thành công.
        </p>
        <Button onClick={handleRestart} className="mt-6 bg-teal-600 hover:bg-teal-500 text-white rounded-xl px-6 py-2.5 font-bold shadow-lg shadow-teal-900/30">
          <RotateCcw className="size-4 mr-2" /> Chơi lại
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl flex flex-col gap-6">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
        <span>Đã ghép: {matchedPairs.size} / {pairs.length} cặp</span>
        <span>Chọn 1 thẻ cột trái rồi chọn thẻ tương ứng ở cột phải</span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column */}
        <div className="flex flex-col gap-3">
          {pairs.map((p, idx) => {
            const isMatched = matchedPairs.has(idx);
            const isSelected = selectedLeft === idx;
            const isWrong = wrongMatch?.left === idx;

            let style = 'bg-slate-800/90 border-slate-700 text-slate-100 hover:border-teal-500';
            if (isMatched) style = 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300 opacity-60 pointer-events-none';
            else if (isSelected) style = 'bg-teal-600/30 border-teal-400 ring-2 ring-teal-400 text-white scale-[1.02]';
            else if (isWrong) style = 'bg-rose-600/30 border-rose-500 ring-2 ring-rose-500 text-rose-200 animate-shake';

            return (
              <button
                key={idx}
                disabled={isMatched}
                onClick={() => handleLeftClick(idx)}
                className={`p-4 rounded-xl border text-left font-medium text-sm sm:text-base transition-all shadow-md flex items-center justify-between cursor-pointer ${style}`}
              >
                <span>{p.left}</span>
                {isMatched && <CheckCircle2 className="size-4 text-emerald-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-3">
          {shuffledRight.map((p, idx) => {
            const isMatched = matchedPairs.has(p.originalIdx);
            const isWrong = wrongMatch?.right === p.originalIdx;

            let style = 'bg-slate-800/90 border-slate-700 text-slate-100 hover:border-teal-500';
            if (isMatched) style = 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300 opacity-60 pointer-events-none';
            else if (isWrong) style = 'bg-rose-600/30 border-rose-500 ring-2 ring-rose-500 text-rose-200 animate-shake';

            return (
              <button
                key={idx}
                disabled={isMatched || selectedLeft === null}
                onClick={() => handleRightClick(p.originalIdx)}
                className={`p-4 rounded-xl border text-left font-medium text-sm sm:text-base transition-all shadow-md flex items-center justify-between cursor-pointer ${style}`}
              >
                <span>{p.right}</span>
                {isMatched && <CheckCircle2 className="size-4 text-emerald-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. FLASHCARD GAME
// ==========================================
function FlashcardGame({ cards }: { cards: FlashcardItem[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setIsFlipped(false);
    }
  };

  if (!cards.length) {
    return <div className="text-slate-400 text-sm">Chưa có thẻ ghi nhớ nào.</div>;
  }

  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-6">
      <div className="text-xs font-semibold text-slate-400">
        Thẻ {currentIndex + 1} / {cards.length} · Nhấn vào thẻ để lật mặt sau
      </div>

      {/* 3D Flip Card */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full h-72 sm:h-80 cursor-pointer [perspective:1000px]"
      >
        <div
          className={`relative w-full h-full rounded-2xl shadow-2xl transition-all duration-500 [transform-style:preserve-3d] ${
            isFlipped ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          {/* Front */}
          <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-teal-500/40 p-8 flex flex-col items-center justify-center text-center [backface-visibility:hidden] shadow-inner">
            <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider mb-2">Mặt trước</span>
            <p className="text-xl sm:text-2xl font-bold text-white leading-relaxed">{currentCard.front}</p>
            {currentCard.hint && <p className="text-xs text-slate-400 mt-4 italic">💡 Gợi ý: {currentCard.hint}</p>}
          </div>

          {/* Back */}
          <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-teal-950 to-slate-900 border-2 border-emerald-500/50 p-8 flex flex-col items-center justify-center text-center [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2">Mặt sau (Đáp án / Định nghĩa)</span>
            <p className="text-lg sm:text-xl font-semibold text-emerald-100 leading-relaxed">{currentCard.back}</p>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="rounded-xl border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          <ChevronLeft className="size-4 mr-1" /> Thẻ trước
        </Button>
        <Button
          onClick={() => setIsFlipped(!isFlipped)}
          className="bg-teal-600 hover:bg-teal-500 text-white rounded-xl px-5 font-bold"
        >
          {isFlipped ? 'Xem mặt trước' : 'Lật đáp án'}
        </Button>
        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          className="rounded-xl border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          Thẻ kế <ChevronRight className="size-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ==========================================
// 5. NAME WHEEL GAME (VÒNG QUAY GỌI TÊN)
// ==========================================
function NameWheelGame({ config }: { config?: NameWheelConfig }) {
  const [names, setNames] = useState<string[]>(
    config?.names?.length
      ? config.names
      : ['Nguyễn Minh Anh', 'Trần Bảo An', 'Lê Hoàng Nam', 'Phạm Quỳnh Chi', 'Vũ Đức Duy', 'Hoàng Thu Trang', 'Đỗ Quang Huy', 'Bùi Ngọc Mai']
  );
  const [pickedHistory, setPickedHistory] = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [excludePicked, setExcludePicked] = useState(config?.excludePicked ?? true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const colors = [
    '#0d9488', '#0284c7', '#7c3aed', '#db2777', '#ea580c', '#ca8a04',
    '#16a34a', '#059669', '#2563eb', '#9333ea', '#e11d48', '#d97706'
  ];

  // Draw wheel on canvas
  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 12;
    const totalSlices = names.length;
    if (totalSlices === 0) return;
    const sliceAngle = (2 * Math.PI) / totalSlices;

    ctx.clearRect(0, 0, size, size);

    // Draw slices
    names.forEach((name, i) => {
      const angle = i * sliceAngle;
      ctx.beginPath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, angle, angle + sliceAngle);
      ctx.lineTo(center, center);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(angle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(name, radius - 18, 5);
      ctx.restore();
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(center, center, 24, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.stroke();
  };

  useEffect(() => {
    drawWheel();
  }, [names]);

  const handleSpin = () => {
    if (isSpinning || names.length === 0) return;
    setIsSpinning(true);
    setSelectedStudent(null);

    const randomIndex = Math.floor(Math.random() * names.length);
    const sliceAngle = 360 / names.length;
    const extraRounds = 5 * 360; // 5 full rounds
    const targetRotation = rotation + extraRounds + (360 - (randomIndex * sliceAngle + sliceAngle / 2));

    setRotation(targetRotation);

    setTimeout(() => {
      const picked = names[randomIndex];
      setSelectedStudent(picked);
      setIsSpinning(false);
      setPickedHistory((prev) => [picked, ...prev]);

      if (excludePicked) {
        setNames((prev) => prev.filter((_, i) => i !== randomIndex));
      }
    }, 4000);
  };

  const handleResetNames = () => {
    if (config?.names?.length) {
      setNames(config.names);
    } else {
      setNames(['Nguyễn Minh Anh', 'Trần Bảo An', 'Lê Hoàng Nam', 'Phạm Quỳnh Chi', 'Vũ Đức Duy', 'Hoàng Thu Trang', 'Đỗ Quang Huy', 'Bùi Ngọc Mai']);
    }
    setPickedHistory([]);
    setSelectedStudent(null);
  };

  return (
    <div className="w-full max-w-4xl flex flex-col md:flex-row items-center justify-center gap-8">
      {/* Wheel Area */}
      <div className="flex flex-col items-center relative">
        {/* Pointer Arrow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-3 z-10 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[22px] border-t-amber-400 drop-shadow-md" />

        <div
          className="relative transition-transform ease-out"
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: isSpinning ? '4000ms' : '0ms',
            transitionTimingFunction: 'cubic-bezier(0.15, 0.9, 0.2, 1)',
          }}
        >
          <canvas ref={canvasRef} width={380} height={380} className="rounded-full shadow-2xl" />
        </div>

        <Button
          disabled={isSpinning || names.length === 0}
          onClick={handleSpin}
          className="mt-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-lg px-8 py-3 rounded-2xl shadow-xl hover:scale-105 transition-all"
        >
          {isSpinning ? 'ĐANG QUAY...' : '🎯 QUAY GỌI TÊN'}
        </Button>
      </div>

      {/* Result & Controls Panel */}
      <div className="flex flex-col gap-4 w-full md:w-72 bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl">
        {selectedStudent ? (
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-center animate-in zoom-in-95 duration-200">
            <Award className="mx-auto size-8 text-amber-400 mb-1" />
            <p className="text-xs text-amber-300 font-bold uppercase">Học sinh được chọn</p>
            <h4 className="text-lg font-black text-white mt-1">{selectedStudent}</h4>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-900/60 text-center text-xs text-slate-400">
            Nhấn QUAY để chọn ngẫu nhiên 1 học sinh trả lời hoặc lên bảng.
          </div>
        )}

        <div className="text-xs text-slate-300 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={excludePicked}
              onChange={(e) => setExcludePicked(e.target.checked)}
              className="rounded text-teal-600"
            />
            <span>Loại trừ sau khi gọi</span>
          </label>
          <p className="text-[11px] text-slate-400">Còn lại trong vòng quay: <b>{names.length}</b> em</p>
        </div>

        {pickedHistory.length > 0 && (
          <div className="border-t border-slate-700 pt-3">
            <p className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Lịch sử vừa gọi:</p>
            <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-slate-300">
              {pickedHistory.map((name, i) => (
                <div key={i} className="px-2 py-1 rounded bg-slate-900/40 truncate">
                  {i + 1}. {name}
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleResetNames}
          className="rounded-xl border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 mt-2"
        >
          <RotateCcw className="size-3.5 mr-1" /> Đặt lại danh sách ({config?.names?.length || 8})
        </Button>
      </div>
    </div>
  );
}
