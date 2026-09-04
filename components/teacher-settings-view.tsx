'use client'

import { useState, useEffect } from 'react'
import {
  User,
  Phone,
  Mail,
  Shield,
  Save,
  Loader2,
  CheckCircle2,
  FileArchive,
  Download,
  School,
  ArrowRight,
  GraduationCap,
} from 'lucide-react'
import {
  getCurrentEducationProfile,
  setEducationProfile,
  EDUCATION_PROFILES,
  type EducationProfile,
} from '@/lib/capabilities'
import { useAuth } from '@/context/auth-context'
import { api } from '@/services/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TeacherBackupModal } from '@/components/teacher-backup-modal'
import { SchoolYearRolloverModal } from '@/components/school-year-rollover-modal'
import { DesktopSettingsSection } from '@/components/desktop/desktop-settings'
import { toast } from 'sonner'

export function TeacherSettingsView() {
  const { user, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [backupModalOpen, setBackupModalOpen] = useState(false)
  const [rolloverModalOpen, setRolloverModalOpen] = useState(false)
  const [currentSchoolYear, setCurrentSchoolYear] = useState<{ id: string; name: string } | null>(null)
  const [schoolYears, setSchoolYears] = useState<Array<{ id: string; name: string }>>([])
  const [educationProfile, setEduProfile] = useState<EducationProfile>(getCurrentEducationProfile())

  useEffect(() => {
    if (user?.teacher) {
      setFullName(user.teacher.fullName || '')
      setPhone(user.teacher.phone || '')
    }
  }, [user])

  useEffect(() => {
    api.get<Array<{ id: string; name: string; isCurrent: boolean }>>('/school-years')
      .then((res) => {
        setSchoolYears(res || [])
        const cur = res?.find((y) => y.isCurrent) || res?.[0]
        if (cur) setCurrentSchoolYear(cur)
      })
      .catch(() => {})
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      toast.error('Họ và tên không được để trống')
      return
    }

    setSaving(true)
    try {
      await api.patch('/auth/profile', {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
      })
      setEducationProfile(educationProfile)
      await refreshProfile()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('teachflow:auth-state-changed'))
      }
      toast.success('Đã lưu thông tin hồ sơ và cấu hình giảng dạy thành công')
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu cài đặt lúc này. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-600">
          <User className="size-4" /> Tài khoản cá nhân
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Cài đặt & Hồ sơ</h1>
        <p className="mt-1 text-sm text-slate-500">
          Quản lý thông tin tài khoản, sao lưu dữ liệu và cấu hình năm học của bạn.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Thông tin giáo viên</CardTitle>
            <CardDescription>
              Thông tin này sẽ hiển thị trên giáo án, báo cáo học sinh và giao diện làm việc.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-fullname" className="text-xs font-semibold">
                  Họ và tên <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="settings-fullname"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ví dụ: Cô Nguyễn Thị Mai"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-phone" className="text-xs font-semibold">
                  Số điện thoại
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="settings-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ví dụ: 0901 234 567"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-email" className="text-xs font-semibold">
                Email đăng nhập
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="settings-email"
                  value={user?.email || ''}
                  disabled
                  className="bg-slate-50 pl-9 text-slate-500"
                />
              </div>
              <p className="text-xs text-slate-400">
                Email dùng để đăng nhập và nhận thông báo hệ thống (không thể chỉnh sửa trực tiếp).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Education Level & Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="size-5 text-teal-600" />
              Môi trường đào tạo & Cấp học (Education Profile)
            </CardTitle>
            <CardDescription>
              Tùy biến thuật ngữ, quy trình bài giảng và công cụ phù hợp với mô hình giảng dạy của bạn.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">Chọn cấp học / Mô hình đào tạo</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                {(Object.keys(EDUCATION_PROFILES) as EducationProfile[]).map((profKey) => {
                  const conf = EDUCATION_PROFILES[profKey]
                  const isSelected = educationProfile === profKey
                  return (
                    <div
                      key={profKey}
                      onClick={() => setEduProfile(profKey)}
                      className={`cursor-pointer rounded-xl border p-3.5 transition flex flex-col justify-between ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/50 shadow-xs ring-1 ring-teal-500'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-800">{conf.levelLabel}</span>
                        {isSelected && <CheckCircle2 className="size-4 text-teal-600 shrink-0" />}
                      </div>
                      <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                        <p>• Người học: <b>{conf.learnerLabel}</b></p>
                        <p>• Lớp/học phần: <b>{conf.sectionLabel}</b></p>
                        <p>• Bài dạy: <b>{conf.lessonPlanLabel}</b></p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* School Year Rollover Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <School className="size-5 text-teal-600" />
              Năm học & Quản lý niên khóa
            </CardTitle>
            <CardDescription>
              Xem năm học hiện tại, chuyển sang năm học mới hoặc đóng niên khóa cũ.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Năm học đang làm việc</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  Năm học {currentSchoolYear?.name || '2026 - 2027'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Khi chuyển năm học, cấu hình lớp và môn học sẽ được sao chép có chọn lọc, bảo toàn toàn vẹn dữ liệu cũ.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRolloverModalOpen(true)}
                className="border-teal-300 text-teal-700 bg-teal-50/50 hover:bg-teal-100 font-bold shrink-0"
              >
                Chuyển năm học mới <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Backup & Export Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileArchive className="size-5 text-teal-600" />
              Sao lưu & Xuất toàn bộ dữ liệu của tôi
            </CardTitle>
            <CardDescription>
              Tải xuống trọn bộ dữ liệu học sinh, điểm danh, kết quả đánh giá, giáo án và tài nguyên dưới dạng file nén (.ZIP) kèm bảng tính Excel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-teal-100 bg-teal-50/30 p-4">
              <div>
                <p className="text-sm font-bold text-slate-900">Gói dữ liệu cá nhân (.ZIP)</p>
                <p className="text-xs text-slate-500 mt-1">
                  Bao gồm các file: students.xlsx, attendance.xlsx, assessments.xlsx, comments.xlsx, lesson-plans.xlsx, worksheets.xlsx, resources.xlsx.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setBackupModalOpen(true)}
                className="bg-teal-600 text-white hover:bg-teal-700 font-bold shrink-0"
              >
                <Download className="size-4 mr-1.5" /> Xuất dữ liệu của tôi
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Roles and permissions card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vai trò & Quyền hạn</CardTitle>
            <CardDescription>Trạng thái tài khoản và phân quyền trong hệ thống TeachFlow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-teal-100 text-teal-700">
                  <Shield className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {user?.role === 'ADMIN' ? 'Quản trị viên hệ thống' : 'Giáo viên'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {user?.role === 'ADMIN'
                      ? 'Toàn quyền quản trị tài khoản giáo viên và xem audit logs.'
                      : 'Trợ lý cá nhân tự quản lý lớp học, học sinh, giáo án và học liệu.'}
                  </p>
                </div>
              </div>
              <Badge variant="default" className="bg-teal-600">
                <CheckCircle2 className="mr-1 size-3" /> Đang hoạt động
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={saving}
            className="bg-teal-600 text-white hover:bg-teal-700 font-medium"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" />
                Lưu cài đặt
              </>
            )}
          </Button>
        </div>
      </form>

      <DesktopSettingsSection />

      {/* Backup Modal */}
      <TeacherBackupModal
        open={backupModalOpen}
        onOpenChange={setBackupModalOpen}
        schoolYears={schoolYears}
      />

      {/* Rollover Modal */}
      <SchoolYearRolloverModal
        open={rolloverModalOpen}
        onOpenChange={setRolloverModalOpen}
        currentSchoolYear={currentSchoolYear}
        onRolloverSuccess={() => {
          api.get<Array<{ id: string; name: string; isCurrent: boolean }>>('/school-years')
            .then((res) => {
              setSchoolYears(res || [])
              const cur = res?.find((y) => y.isCurrent) || res?.[0]
              if (cur) setCurrentSchoolYear(cur)
            })
            .catch(() => {})
        }}
      />
    </div>
  )
}
