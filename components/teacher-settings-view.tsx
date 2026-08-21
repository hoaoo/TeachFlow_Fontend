'use client'

import { useState, useEffect } from 'react'
import { User, Phone, Mail, Shield, Save, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { api } from '@/services/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export function TeacherSettingsView() {
  const { user, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user?.teacher) {
      setFullName(user.teacher.fullName || '')
      setPhone(user.teacher.phone || '')
    }
  }, [user])

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
      await refreshProfile()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('teachflow:auth-state-changed'))
      }
      toast.success('Đã lưu thông tin hồ sơ giáo viên thành công')
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
          Quản lý thông tin tài khoản và cấu hình không gian làm việc của bạn.
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
    </div>
  )
}
