'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Users,
  BookOpen,
  FileText,
  Download,
  Loader2,
  X,
  ChevronRight,
  ExternalLink,
  Presentation,
  Table as TableIcon,
  Film,
  Image as ImageIcon,
} from 'lucide-react';
import { searchGlobal, type GlobalSearchResult } from '@/services/search-service';

interface GlobalSearchBarProps {
  onNavigate?: (view: string, targetId?: string) => void;
  onOpenStudentDetail?: (studentId: string) => void;
}

export function GlobalSearchBar({ onNavigate, onOpenStudentDetail }: GlobalSearchBarProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search (300ms)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handler = setTimeout(async () => {
      try {
        const data = await searchGlobal(trimmed, 5);
        setResults(data);
        setIsOpen(true);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalResults =
    (results?.students.length || 0) +
    (results?.lessonPlans.length || 0) +
    (results?.worksheets.length || 0) +
    (results?.resources.length || 0);

  const handleSelectStudent = (studentId: string) => {
    setIsOpen(false);
    setQuery('');
    if (onOpenStudentDetail) {
      onOpenStudentDetail(studentId);
    } else if (onNavigate) {
      onNavigate('Học sinh', studentId);
    }
  };

  const handleSelectLessonPlan = (planId: string) => {
    setIsOpen(false);
    setQuery('');
    if (onNavigate) {
      onNavigate('Giáo án', planId);
    }
  };

  const handleSelectWorksheet = (worksheetId: string) => {
    setIsOpen(false);
    setQuery('');
    if (onNavigate) {
      onNavigate('Phiếu học tập', worksheetId);
    }
  };

  const handleSelectResource = (resourceId: string) => {
    setIsOpen(false);
    setQuery('');
    if (onNavigate) {
      onNavigate('Tài nguyên', resourceId);
    }
  };

  const getResourceIcon = (resType: string, ext?: string) => {
    const upper = (ext || resType).toUpperCase();
    if (upper === 'MP4' || resType === 'VIDEO') return <Film className="size-3.5 text-purple-600" />;
    if (['PNG', 'JPG', 'JPEG', 'WEBP'].includes(upper) || resType === 'IMAGE') return <ImageIcon className="size-3.5 text-emerald-600" />;
    if (['PPT', 'PPTX'].includes(upper) || resType === 'PRESENTATION') return <Presentation className="size-3.5 text-orange-600" />;
    if (['XLS', 'XLSX', 'CSV'].includes(upper) || resType === 'SPREADSHEET') return <TableIcon className="size-3.5 text-green-600" />;
    return <FileText className="size-3.5 text-blue-600" />;
  };

  return (
    <div className="relative w-64 sm:w-80 md:w-96" ref={containerRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 size-4 text-slate-400 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen && e.target.value.trim().length >= 2) setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim().length >= 2 && results) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false);
          }}
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:bg-white transition"
          placeholder="Tìm kiếm nhanh học sinh, giáo án..."
        />
        {loading ? (
          <Loader2 className="absolute right-3 size-4 animate-spin text-teal-600" />
        ) : query ? (
          <button
            onClick={() => {
              setQuery('');
              setResults(null);
              setIsOpen(false);
            }}
            className="absolute right-3 p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 top-12 z-50 flex w-full flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[500px]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 bg-slate-50/80 text-xs">
            <span className="font-semibold text-slate-700">
              Kết quả tìm kiếm cho "{query.trim()}"
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {totalResults} kết quả
            </span>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-100 p-1">
            {totalResults === 0 && !loading ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Search className="mx-auto size-6 text-slate-300 mb-1.5" />
                <p className="font-medium text-slate-600">Không tìm thấy kết quả phù hợp</p>
                <p className="text-[11px] mt-0.5">Thử tìm bằng tên học sinh, tiêu đề giáo án hoặc tài nguyên khác.</p>
              </div>
            ) : null}

            {/* 1. HỌC SINH */}
            {results?.students && results.students.length > 0 && (
              <div className="py-1.5 px-2">
                <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-teal-800">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5" /> Học sinh
                  </span>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate?.('Học sinh');
                    }}
                    className="text-[10px] font-semibold text-teal-600 hover:underline lowercase tracking-normal"
                  >
                    Xem tất cả
                  </button>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {results.students.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectStudent(s.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl p-2 text-left hover:bg-teal-50/70 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`grid size-7 place-items-center rounded-full text-[10px] font-bold shrink-0 ${s.avatarColor || 'bg-teal-100 text-teal-700'}`}>
                          {s.fullName.split(' ').map((p) => p[0]).slice(-2).join('').toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-teal-700">
                            {s.fullName}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {s.classroomName ? `Lớp ${s.classroomName}` : ''}{s.studentCode ? ` · Mã: ${s.studentCode}` : ''}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="size-3.5 text-slate-300 group-hover:text-teal-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. GIÁO ÁN */}
            {results?.lessonPlans && results.lessonPlans.length > 0 && (
              <div className="py-1.5 px-2">
                <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-800">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="size-3.5" /> Giáo án
                  </span>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate?.('Giáo án');
                    }}
                    className="text-[10px] font-semibold text-blue-600 hover:underline lowercase tracking-normal"
                  >
                    Xem tất cả
                  </button>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {results.lessonPlans.map((lp) => (
                    <button
                      key={lp.id}
                      onClick={() => handleSelectLessonPlan(lp.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl p-2 text-left hover:bg-blue-50/70 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="grid size-7 place-items-center rounded-lg bg-blue-100 text-blue-700 shrink-0">
                          <BookOpen className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-700">
                            {lp.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {lp.subjectName || 'Chung'}{lp.gradeName ? ` · ${lp.gradeName}` : ''}{lp.topic ? ` · ${lp.topic}` : ''}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="size-3.5 text-slate-300 group-hover:text-blue-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. PHIẾU HỌC TẬP */}
            {results?.worksheets && results.worksheets.length > 0 && (
              <div className="py-1.5 px-2">
                <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  <span className="flex items-center gap-1.5">
                    <FileText className="size-3.5" /> Phiếu học tập
                  </span>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate?.('Phiếu học tập');
                    }}
                    className="text-[10px] font-semibold text-emerald-600 hover:underline lowercase tracking-normal"
                  >
                    Xem tất cả
                  </button>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {results.worksheets.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => handleSelectWorksheet(w.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl p-2 text-left hover:bg-emerald-50/70 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="grid size-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                          <FileText className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-emerald-700">
                            {w.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {w.subtitle || w.description || 'Phiếu bài tập'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="size-3.5 text-slate-300 group-hover:text-emerald-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. TÀI NGUYÊN */}
            {results?.resources && results.resources.length > 0 && (
              <div className="py-1.5 px-2">
                <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-purple-800">
                  <span className="flex items-center gap-1.5">
                    <Download className="size-3.5" /> Tài nguyên
                  </span>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate?.('Tài nguyên');
                    }}
                    className="text-[10px] font-semibold text-purple-600 hover:underline lowercase tracking-normal"
                  >
                    Xem tất cả
                  </button>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {results.resources.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleSelectResource(r.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl p-2 text-left hover:bg-purple-50/70 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="grid size-7 place-items-center rounded-lg bg-purple-100 text-purple-700 shrink-0">
                          {getResourceIcon(r.resourceType, r.extension)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-purple-700">
                            {r.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {r.extension || r.resourceType} · {r.formattedSize || '0 KB'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="size-3.5 text-slate-300 group-hover:text-purple-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
