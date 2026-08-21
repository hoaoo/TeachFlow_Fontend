'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileDown,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Users,
  GraduationCap,
  BookOpen,
  School,
  Loader2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  getAttendanceReport,
  exportAttendanceCsv,
  getAssessmentReport,
  exportAssessmentCsv,
  getClassroomSummaryReport,
  exportClassroomSummaryDocx,
  getTeachingAssignmentsReport,
  getStudentEnrollmentReport,
  type AttendanceReportData,
  type AssessmentReportData,
  type ClassroomSummaryReportData,
  type TeachingAssignmentsReportData,
  type StudentEnrollmentReportData,
} from '@/services/reports-service';
import { getClasses, type ClassRecord } from '@/services/classroom-service';
import { toast } from 'sonner';

export function ReportsView() {
  const [activeTab, setActiveTab] = useState<
    'attendance' | 'assessments' | 'classroom' | 'assignments' | 'enrollment'
  >('attendance');

  const [classrooms, setClassrooms] = useState<ClassRecord[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Attendance state
  const [attendanceData, setAttendanceData] = useState<AttendanceReportData | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [exportingAttendanceCsv, setExportingAttendanceCsv] = useState(false);

  // Assessment state
  const [assessmentData, setAssessmentData] = useState<AssessmentReportData | null>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [exportingAssessmentCsv, setExportingAssessmentCsv] = useState(false);

  // Classroom summary state
  const [classroomSummary, setClassroomSummary] = useState<ClassroomSummaryReportData | null>(null);
  const [loadingClassroomSummary, setLoadingClassroomSummary] = useState(false);
  const [exportingClassroomDocx, setExportingClassroomDocx] = useState(false);

  // Teaching assignments state
  const [assignmentsData, setAssignmentsData] = useState<TeachingAssignmentsReportData | null>(null);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Enrollment state
  const [enrollmentData, setEnrollmentData] = useState<StudentEnrollmentReportData | null>(null);
  const [loadingEnrollment, setLoadingEnrollment] = useState(false);

  // Load classrooms on mount
  useEffect(() => {
    getClasses().then((res) => {
      const list = Array.isArray(res) ? res : [];
      setClassrooms(list);
      if (list.length > 0) {
        setSelectedClassId(list[0].id);
      }
    }).catch(() => {});
  }, []);

  // Fetch report data when tab or filters change
  useEffect(() => {
    if (activeTab === 'attendance') {
      setLoadingAttendance(true);
      getAttendanceReport(selectedClassId ? { classroomId: selectedClassId } : undefined)
        .then((data) => setAttendanceData(data))
        .catch(() => toast.error('Không thể tải báo cáo chuyên cần'))
        .finally(() => setLoadingAttendance(false));
    } else if (activeTab === 'assessments') {
      setLoadingAssessment(true);
      getAssessmentReport(selectedClassId ? { classroomId: selectedClassId } : undefined)
        .then((data) => setAssessmentData(data))
        .catch(() => toast.error('Không thể tải báo cáo đánh giá'))
        .finally(() => setLoadingAssessment(false));
    } else if (activeTab === 'classroom') {
      if (!selectedClassId) return;
      setLoadingClassroomSummary(true);
      getClassroomSummaryReport(selectedClassId)
        .then((data) => setClassroomSummary(data))
        .catch(() => toast.error('Không thể tải tổng kết lớp học'))
        .finally(() => setLoadingClassroomSummary(false));
    } else if (activeTab === 'assignments') {
      setLoadingAssignments(true);
      getTeachingAssignmentsReport()
        .then((data) => setAssignmentsData(data))
        .catch(() => toast.error('Không thể tải báo cáo phân công chuyên môn'))
        .finally(() => setLoadingAssignments(false));
    } else if (activeTab === 'enrollment') {
      setLoadingEnrollment(true);
      getStudentEnrollmentReport(selectedClassId ? { classroomId: selectedClassId } : undefined)
        .then((data) => setEnrollmentData(data))
        .catch(() => toast.error('Không thể tải báo cáo tuyển sinh & sĩ số'))
        .finally(() => setLoadingEnrollment(false));
    }
  }, [activeTab, selectedClassId]);

  const handleExportAttendanceCsv = async () => {
    setExportingAttendanceCsv(true);
    try {
      await exportAttendanceCsv(selectedClassId ? { classroomId: selectedClassId } : undefined);
      toast.success('Xuất báo cáo chuyên cần thành công (.csv)');
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xuất báo cáo chuyên cần');
    } finally {
      setExportingAttendanceCsv(false);
    }
  };

  const handleExportAssessmentCsv = async () => {
    setExportingAssessmentCsv(true);
    try {
      await exportAssessmentCsv(selectedClassId ? { classroomId: selectedClassId } : undefined);
      toast.success('Xuất báo cáo đánh giá thành công (.csv)');
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xuất báo cáo đánh giá');
    } finally {
      setExportingAssessmentCsv(false);
    }
  };

  const handleExportClassroomDocx = async () => {
    if (!selectedClassId) return;
    setExportingClassroomDocx(true);
    try {
      const cls = classrooms.find((c) => c.id === selectedClassId);
      await exportClassroomSummaryDocx(selectedClassId, cls?.name || 'Lop');
      toast.success('Xuất báo cáo tổng kết lớp học thành công (.docx)');
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xuất báo cáo tổng kết');
    } finally {
      setExportingClassroomDocx(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-600">Trung tâm Thống kê</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Báo cáo & Thống kê giáo dục</h1>
          <p className="text-sm text-slate-500">
            Dữ liệu tổng hợp chuyên cần, đánh giá, phân công giảng dạy và hồ sơ lớp học
          </p>
        </div>

        {/* Global Classroom Filter */}
        {classrooms.length > 0 && activeTab !== 'assignments' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Chọn lớp:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-teal-500 focus:outline-none"
            >
              {activeTab !== 'classroom' && <option value="">Tất cả các lớp</option>}
              {classrooms.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  Lớp {cls.name} ({cls.grade?.name || 'Khối'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'attendance'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="size-4" /> Báo cáo chuyên cần
        </button>
        <button
          onClick={() => setActiveTab('assessments')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'assessments'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="size-4" /> Đánh giá & Học lực
        </button>
        <button
          onClick={() => setActiveTab('classroom')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'classroom'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="size-4" /> Tổng kết lớp học
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'assignments'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="size-4" /> Phân công chuyên môn
        </button>
        <button
          onClick={() => setActiveTab('enrollment')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'enrollment'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="size-4" /> Tuyển sinh & Sĩ số
        </button>
      </div>

      {/* Tab 1: Attendance Report */}
      {activeTab === 'attendance' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Tổng quan chuyên cần</h2>
            <button
              onClick={handleExportAttendanceCsv}
              disabled={exportingAttendanceCsv || loadingAttendance}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {exportingAttendanceCsv ? (
                <Loader2 className="size-4 animate-spin text-teal-600" />
              ) : (
                <Download className="size-4 text-teal-600" />
              )}
              Xuất Excel / CSV
            </button>
          </div>

          {loadingAttendance ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="size-8 animate-spin text-teal-600" />
              <span className="text-sm font-medium">Đang tổng hợp số liệu chuyên cần...</span>
            </div>
          ) : attendanceData ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">Tỷ lệ chuyên cần</p>
                  <p className="mt-2 text-3xl font-bold text-teal-700">
                    {attendanceData.summary.attendanceRate}%
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Trên {attendanceData.summary.totalSessions} buổi điểm danh</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">Đi đúng giờ</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-600">
                    {attendanceData.summary.presentCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Lượt học sinh có mặt</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">Vắng có phép</p>
                  <p className="mt-2 text-3xl font-bold text-blue-600">
                    {attendanceData.summary.excusedCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Lượt nghỉ phép</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">Vắng không phép / Muộn</p>
                  <p className="mt-2 text-3xl font-bold text-rose-600">
                    {attendanceData.summary.unexcusedCount + attendanceData.summary.lateCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {attendanceData.summary.unexcusedCount} không phép, {attendanceData.summary.lateCount} đi muộn
                  </p>
                </div>
              </div>

              {attendanceData.studentsWithAbsences.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">Học sinh cần lưu ý về chuyên cần</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Danh sách học sinh có lượt vắng hoặc đi muộn</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                        <tr>
                          <th className="px-5 py-3">Học sinh</th>
                          <th className="px-5 py-3">Lớp</th>
                          <th className="px-5 py-3 text-center">Vắng có phép</th>
                          <th className="px-5 py-3 text-center">Vắng không phép</th>
                          <th className="px-5 py-3 text-center">Đi muộn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {attendanceData.studentsWithAbsences.map((s, idx) => (
                          <tr key={s.student.id + idx} className="hover:bg-slate-50/80">
                            <td className="px-5 py-3 font-medium text-slate-900">{s.student.fullName}</td>
                            <td className="px-5 py-3">{s.className}</td>
                            <td className="px-5 py-3 text-center text-blue-600 font-semibold">{s.excused}</td>
                            <td className="px-5 py-3 text-center text-rose-600 font-semibold">{s.unexcused}</td>
                            <td className="px-5 py-3 text-center text-amber-600 font-semibold">{s.late}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-sm text-slate-400 rounded-2xl border border-dashed">
              Chưa có dữ liệu điểm danh cho bộ lọc này.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Assessment Report */}
      {activeTab === 'assessments' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Tổng quan đánh giá học sinh</h2>
            <button
              onClick={handleExportAssessmentCsv}
              disabled={exportingAssessmentCsv || loadingAssessment}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {exportingAssessmentCsv ? (
                <Loader2 className="size-4 animate-spin text-teal-600" />
              ) : (
                <Download className="size-4 text-teal-600" />
              )}
              Xuất Excel / CSV
            </button>
          </div>

          {loadingAssessment ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="size-8 animate-spin text-teal-600" />
              <span className="text-sm font-medium">Đang tổng hợp kết quả đánh giá...</span>
            </div>
          ) : assessmentData ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">Hoàn thành tốt (T)</p>
                    <span className="size-2.5 rounded-full bg-teal-500" />
                  </div>
                  <p className="mt-2 text-3xl font-bold text-teal-700">
                    {assessmentData.summary.excellentCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{assessmentData.summary.excellentRate}% trên tổng số đánh giá</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">Hoàn thành (H)</p>
                    <span className="size-2.5 rounded-full bg-blue-500" />
                  </div>
                  <p className="mt-2 text-3xl font-bold text-blue-700">
                    {assessmentData.summary.completedCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{assessmentData.summary.completedRate}% trên tổng số đánh giá</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">Cần hỗ trợ (C)</p>
                    <span className="size-2.5 rounded-full bg-rose-500" />
                  </div>
                  <p className="mt-2 text-3xl font-bold text-rose-700">
                    {assessmentData.summary.needsSupportCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{assessmentData.summary.needsSupportRate}% trên tổng số đánh giá</p>
                </div>
              </div>

              {assessmentData.assessments.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">Chi tiết các bài đánh giá</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                        <tr>
                          <th className="px-5 py-3">Bài đánh giá</th>
                          <th className="px-5 py-3">Môn học</th>
                          <th className="px-5 py-3">Lớp</th>
                          <th className="px-5 py-3 text-center">Hoàn thành tốt</th>
                          <th className="px-5 py-3 text-center">Hoàn thành</th>
                          <th className="px-5 py-3 text-center">Cần hỗ trợ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {assessmentData.assessments.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/80">
                            <td className="px-5 py-3 font-medium text-slate-900">{a.title}</td>
                            <td className="px-5 py-3">{a.subjectName || 'Chung'}</td>
                            <td className="px-5 py-3">{a.className || 'Lớp'}</td>
                            <td className="px-5 py-3 text-center font-semibold text-teal-700">{a.excellent}</td>
                            <td className="px-5 py-3 text-center font-semibold text-blue-700">{a.completed}</td>
                            <td className="px-5 py-3 text-center font-semibold text-rose-700">{a.needsSupport}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-sm text-slate-400 rounded-2xl border border-dashed">
              Chưa có dữ liệu đánh giá cho bộ lọc này.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Classroom Summary Report */}
      {activeTab === 'classroom' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Báo cáo tổng hợp lớp {classroomSummary?.classInfo.name || ''}
            </h2>
            <button
              onClick={handleExportClassroomDocx}
              disabled={exportingClassroomDocx || loadingClassroomSummary || !classroomSummary}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
            >
              {exportingClassroomDocx ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileDown className="size-4" />
              )}
              Xuất Microsoft Word (.docx)
            </button>
          </div>

          {loadingClassroomSummary ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="size-8 animate-spin text-teal-600" />
              <span className="text-sm font-medium">Đang tổng hợp thông tin toàn diện lớp học...</span>
            </div>
          ) : classroomSummary ? (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-400">Giáo viên chủ nhiệm</p>
                    <p className="text-base font-semibold text-slate-900 mt-1">
                      {classroomSummary.classInfo.homeroomTeacher}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Năm học</p>
                    <p className="text-base font-semibold text-slate-900 mt-1">
                      {classroomSummary.classInfo.schoolYear}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Sĩ số lớp</p>
                    <p className="text-base font-semibold text-slate-900 mt-1">
                      {classroomSummary.students.total} (Nam: {classroomSummary.students.male}, Nữ: {classroomSummary.students.female})
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Tỷ lệ chuyên cần</p>
                    <p className="text-base font-semibold text-teal-600 mt-1">
                      {classroomSummary.attendance.overallAttendanceRate}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Danh sách học sinh chính thức</h3>
                  <span className="text-xs text-slate-400 font-medium">
                    Tổng số: {classroomSummary.students.list.length} học sinh
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                      <tr>
                        <th className="px-5 py-3 w-16">STT</th>
                        <th className="px-5 py-3">Mã học sinh</th>
                        <th className="px-5 py-3">Họ và tên</th>
                        <th className="px-5 py-3">Giới tính</th>
                        <th className="px-5 py-3">Phân loại học lực</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {classroomSummary.students.list.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50/80">
                          <td className="px-5 py-3 text-slate-400 font-medium">{st.stt}</td>
                          <td className="px-5 py-3 font-mono text-xs">{st.code || '—'}</td>
                          <td className="px-5 py-3 font-medium text-slate-900">{st.fullName}</td>
                          <td className="px-5 py-3">{st.gender}</td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                st.status === 'EXCELLENT'
                                  ? 'bg-teal-100 text-teal-800'
                                  : st.status === 'GOOD'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-orange-100 text-orange-800'
                              }`}
                            >
                              {st.status === 'EXCELLENT' ? 'Xuất sắc' : st.status === 'GOOD' ? 'Tốt / Khá' : 'Cần hỗ trợ'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-sm text-slate-400 rounded-2xl border border-dashed">
              Vui lòng chọn một lớp học để xem tổng kết.
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Teaching Assignments */}
      {activeTab === 'assignments' && (
        <div className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold text-slate-900">Báo cáo phân công chuyên môn giáo viên</h2>

          {loadingAssignments ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="size-8 animate-spin text-teal-600" />
              <span className="text-sm font-medium">Đang tải phân công chuyên môn...</span>
            </div>
          ) : assignmentsData ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs text-slate-500 font-medium">Tổng số giáo viên được phân công</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{assignmentsData.totalTeachers}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs text-slate-500 font-medium">Tổng lượt phân công giảng dạy</p>
                  <p className="mt-2 text-3xl font-bold text-teal-700">{assignmentsData.totalAssignments}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignmentsData.byTeacher.map((t, idx) => (
                  <div key={t.teacherName + idx} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="font-semibold text-slate-900">{t.teacherName}</h3>
                        <p className="text-xs text-slate-400">{t.phone || 'Chưa cập nhật SĐT'}</p>
                      </div>
                      <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                        {t.assignments.length} lớp phụ trách
                      </span>
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      {t.assignments.map((asg) => (
                        <div key={asg.id} className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl">
                          <span className="font-medium text-slate-800">
                            Lớp {asg.className} ({asg.gradeName})
                          </span>
                          <span className="text-teal-700 font-semibold">{asg.subjectName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-sm text-slate-400 rounded-2xl border border-dashed">
              Chưa có dữ liệu phân công giảng dạy.
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Enrollment */}
      {activeTab === 'enrollment' && (
        <div className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold text-slate-900">Báo cáo số liệu tuyển sinh & sĩ số</h2>

          {loadingEnrollment ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="size-8 animate-spin text-teal-600" />
              <span className="text-sm font-medium">Đang tổng hợp số liệu tuyển sinh...</span>
            </div>
          ) : enrollmentData ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs text-slate-500 font-medium">Tổng số học sinh ghi danh</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{enrollmentData.totalEnrollments}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs text-slate-500 font-medium">Học sinh đang học (ACTIVE)</p>
                  <p className="mt-2 text-3xl font-bold text-teal-700">{enrollmentData.activeEnrollments}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">Thống kê sĩ số theo lớp</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                      <tr>
                        <th className="px-5 py-3">Lớp học</th>
                        <th className="px-5 py-3">Khối</th>
                        <th className="px-5 py-3 text-center">Đang học</th>
                        <th className="px-5 py-3 text-center">Đã chuyển lớp</th>
                        <th className="px-5 py-3 text-center">Hoàn thành</th>
                        <th className="px-5 py-3 text-center">Tổng ghi danh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {enrollmentData.classBreakdown.map((c, idx) => (
                        <tr key={c.className + idx} className="hover:bg-slate-50/80">
                          <td className="px-5 py-3 font-medium text-slate-900">Lớp {c.className}</td>
                          <td className="px-5 py-3">{c.gradeName}</td>
                          <td className="px-5 py-3 text-center font-bold text-teal-700">{c.active}</td>
                          <td className="px-5 py-3 text-center text-slate-500">{c.transferred}</td>
                          <td className="px-5 py-3 text-center text-blue-600">{c.completed}</td>
                          <td className="px-5 py-3 text-center font-semibold text-slate-900">{c.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-sm text-slate-400 rounded-2xl border border-dashed">
              Chưa có dữ liệu tuyển sinh.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
