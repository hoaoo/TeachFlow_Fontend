'use client'

import { useEffect, useState } from 'react'
import { MonitorCog, Power } from 'lucide-react'
import { toast } from 'sonner'
import { getPlatform } from '@/platform'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckUpdateButton } from '@/components/updater/check-update-button'
import {
  DESKTOP_CLOSE_TO_TRAY_SETTING,
  DESKTOP_NOTIFICATION_SETTING,
} from './desktop-runtime'

function SettingToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-50 ${checked ? 'bg-teal-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

export function DesktopSettingsSection() {
  const [desktop, setDesktop] = useState(false)
  const [version, setVersion] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [autostartEnabled, setAutostartEnabled] = useState(false)
  const [closeToTray, setCloseToTray] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const platform = getPlatform()
    if (!platform.isDesktop()) return
    setDesktop(true)
    setNotificationsEnabled(localStorage.getItem(DESKTOP_NOTIFICATION_SETTING) === 'true')
    setCloseToTray(localStorage.getItem(DESKTOP_CLOSE_TO_TRAY_SETTING) === 'true')
    platform.getAppVersion().then(setVersion).catch(() => setVersion('—'))
    platform.isAutostartEnabled().then(setAutostartEnabled).catch(() => {})
  }, [])

  if (!desktop) return null

  const changeNotifications = async (enabled: boolean) => {
    if (enabled) {
      const granted = await getPlatform().showNotification({
        id: 'teachflow-notification-enabled',
        title: 'TeachFlow',
        body: 'Thông báo Windows đã được bật.',
      }, true).catch(() => false)
      if (!granted) {
        toast.error('TeachFlow chưa được Windows cấp quyền thông báo.')
        return
      }
    }
    localStorage.setItem(DESKTOP_NOTIFICATION_SETTING, String(enabled))
    setNotificationsEnabled(enabled)
    window.dispatchEvent(new CustomEvent('teachflow:desktop-notification-setting'))
  }

  const changeAutostart = async (enabled: boolean) => {
    setBusy(true)
    try {
      await getPlatform().setAutostartEnabled(enabled)
      setAutostartEnabled(enabled)
      toast.success(enabled ? 'Đã bật khởi động cùng Windows' : 'Đã tắt khởi động cùng Windows')
    } catch {
      toast.error('Không thể thay đổi cài đặt khởi động cùng Windows.')
    } finally {
      setBusy(false)
    }
  }

  const changeCloseToTray = async (enabled: boolean) => {
    try {
      await getPlatform().setCloseToTray(enabled)
      localStorage.setItem(DESKTOP_CLOSE_TO_TRAY_SETTING, String(enabled))
      setCloseToTray(enabled)
    } catch {
      toast.error('Không thể thay đổi cài đặt system tray.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MonitorCog className="size-5 text-teal-600" /> Ứng dụng Windows
        </CardTitle>
        <CardDescription>Cấu hình các tính năng native của TeachFlow Desktop.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">TeachFlow</p>
            <p className="text-xs text-slate-500">Version {version || '...'}</p>
          </div>
          <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">Windows Desktop</span>
        </div>
        <SettingToggle
          label="Thông báo Windows"
          description="Hiển thị notification backend mới bằng Windows toast; không tạo notification trùng lặp."
          checked={notificationsEnabled}
          onChange={changeNotifications}
        />
        <SettingToggle
          label="Khởi động cùng Windows"
          description="Mặc định tắt và chỉ được bật khi bạn chủ động chọn."
          checked={autostartEnabled}
          disabled={busy}
          onChange={changeAutostart}
        />
        <SettingToggle
          label="Thu nhỏ xuống system tray khi đóng"
          description="Mặc định tắt. Khi tắt, nút đóng sẽ thoát ứng dụng như bình thường."
          checked={closeToTray}
          onChange={changeCloseToTray}
        />
        <div className="rounded-xl border border-slate-100 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Power className="size-4 text-teal-600" /> Cập nhật ứng dụng
          </div>
          <CheckUpdateButton />
        </div>
      </CardContent>
    </Card>
  )
}
