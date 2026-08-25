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
import { Label } from '@/components/ui/label';
import {
  Download,
  FileArchive,
  Users,
  CalendarCheck,
  Award,
  MessageSquare,
  BookOpen,
  FileText,
  Paperclip,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

interface TeacherBackupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolYears?: Array<{ id: string; name: string }>;
}

export function TeacherBackupModal({
  open,
  onOpenChange,
  schoolYears = [],
}: TeacherBackupModalProps) {
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [includeStudents, setIncludeStudents] = useState(true);
  const [includeAttendance, setIncludeAttendance] = useState(true);
  const [includeAssessments, setIncludeAssessments] = useState(true);
  const [includeComments, setIncludeComments] = useState(true);
  const [includeLessonPlans, setIncludeLessonPlans] = useState(true);
  const [includeWorksheets, setIncludeWorksheets] = useState(true);
  const [includeResources, setIncludeResources] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

      const response = await fetch(`${apiBase}/export/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          schoolYearId: selectedYearId || undefined,
          includeStudents,
          includeAttendance,
          includeAssessments,
          includeComments,
          includeLessonPlans,
          includeWorksheets,
          includeResources,
        }),
      });

      if (!response.ok) {
        throw new Error(`Xuất dữ liệu thất bại (${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `teachflow-backup-${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Đã tải xuống gói sao lưu dữ liệu (.ZIP) thành công!');
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Lỗi sao lưu: ' + (err?.message || 'Vui lòng thử lại sau'));
    } finally {
      setIsExporting(false);
    }
  };

  const options = [
    { id: 'students', label: 'Danh sách học sinh', desc: 'Thông tin cá nhân, phụ huynh, liên lạc', icon: Users, checked: includeStudents, setChecked: setIncludeStudents },
    { id: 'attendance', label: 'Dữ liệu điểm danh', desc: 'Chuyên cần, đi trễ, lý do nghỉ phép', icon: CalendarCheck, checked: includeAttendance, setChecked: setIncludeAttendance },
    { id: 'assessments', label: 'Kết quả đánh giá', desc: 'Điểm số, mức đạt chuẩn GDPT (T/H/C)', icon: Award, checked: includeAssessments, setChecked: setIncludeAssessments },
    { id: 'comments', label: 'Nhận xét sư phạm', desc: 'Sổ nhận xét học sinh theo môn và định kỳ', icon: MessageSquare, checked: includeComments, setChecked: setIncludeComments },
    { id: 'lessonPlans', label: 'Kế hoạch bài dạy (Giáo án)', desc: 'Tiêu đề, tuần, tiết, mục tiêu bài học', icon: BookOpen, checked: includeLessonPlans, setChecked: setIncludeLessonPlans },
    { id: 'worksheets', label: 'Phiếu học tập', desc: 'Danh sách bài tập, câu hỏi và mô tả', icon: FileText, checked: includeWorksheets, setChecked: setIncludeWorksheets },
    { id: 'resources', label: 'Metadata học liệu & tài nguyên', desc: 'Danh mục tài liệu Word, PPTX, PDF, Video', icon: Paperclip, checked: includeResources, setChecked: setIncludeResources },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <FileArchive className="size-5 text-teal-600" />
            Sao lưu & Xuất toàn bộ dữ liệu của tôi
          </DialogTitle>
          <DialogDescription>
            Xuất dữ liệu giảng dạy cá nhân ra các bảng tính Excel (.XLSX) chuẩn và đóng gói trong một tập tin nén (.ZIP) bảo mật.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* School Year Filter */}
          {schoolYears.length > 0 && (
            <div>
              <Label className="text-xs font-semibold text-slate-700">Phạm vi năm học:</Label>
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-teal-500"
              >
                <option value="">Tất cả các năm học</option>
                {schoolYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    Năm học {y.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Module selection list */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 mb-2 block">
              Chọn các mục dữ liệu cần xuất:
            </Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {options.map((opt) => {
                const Icon = opt.icon;
                return (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                      opt.checked
                        ? 'border-teal-500 bg-teal-50/40'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 opacity-70'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={opt.checked}
                      onChange={(e) => opt.setChecked(e.target.checked)}
                      className="mt-1 size-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Icon className="size-4 text-teal-700" />
                        <span className="text-xs font-bold text-slate-900">{opt.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 text-[11px] text-slate-600">
            <ShieldCheck className="size-4 text-teal-600 shrink-0" />
            <span>Gói sao lưu chỉ chứa dữ liệu thuộc quyền quản lý của thầy/cô, không bao gồm thông tin mật hệ thống.</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Hủy
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
          >
            {isExporting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Download className="size-4 mr-1.5" />}
            Tải về gói sao lưu (.ZIP)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
