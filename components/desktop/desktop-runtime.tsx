'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/auth-context'
import { getPlatform } from '@/platform'
import { getNotifications } from '@/services/notification-service'

export const DESKTOP_NOTIFICATION_SETTING = 'teachflow.desktop.notifications'
export const DESKTOP_CLOSE_TO_TRAY_SETTING = 'teachflow.desktop.close-to-tray'
const NOTIFIED_IDS_KEY = 'teachflow.desktop.notified-ids.v1'

function readIds(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(NOTIFIED_IDS_KEY) || '[]')
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function storeIds(ids: Set<string>) {
  localStorage.setItem(NOTIFIED_IDS_KEY, JSON.stringify(Array.from(ids).slice(-200)))
}

export function DesktopRuntime() {
  const { user } = useAuth()
  const initializedNotifications = useRef(false)

  useEffect(() => {
    const platform = getPlatform()
    if (!platform.isDesktop()) return
    const closeToTray = localStorage.getItem(DESKTOP_CLOSE_TO_TRAY_SETTING) === 'true'
    platform.setCloseToTray(closeToTray).catch(() => {})
  }, [])

  useEffect(() => {
    const platform = getPlatform()
    if (!platform.isDesktop() || !user) return
    let stopped = false

    const syncNotifications = async () => {
      if (localStorage.getItem(DESKTOP_NOTIFICATION_SETTING) !== 'true') return
      try {
        const response = await getNotifications({ isRead: false, page: 1, pageSize: 20 })
        if (stopped) return
        const seen = new Set(readIds())
        if (!initializedNotifications.current && seen.size === 0) {
          response.items.forEach((item) => seen.add(item.id))
          storeIds(seen)
          initializedNotifications.current = true
          return
        }
        initializedNotifications.current = true
        const fresh = response.items
          .filter((item) => !seen.has(item.id))
          .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
        for (const item of fresh.slice(-3)) {
          const displayed = await platform.showNotification({
            id: item.id,
            title: item.title,
            body: item.message,
          })
          if (displayed) seen.add(item.id)
        }
        response.items.forEach((item) => {
          if (fresh.length > 3) seen.add(item.id)
        })
        storeIds(seen)
      } catch {
        // Native notification delivery must never affect in-app notifications.
      }
    }

    syncNotifications()
    const interval = window.setInterval(syncNotifications, 60_000)
    const onSettingChanged = () => syncNotifications()
    window.addEventListener('teachflow:desktop-notification-setting', onSettingChanged)
    return () => {
      stopped = true
      window.clearInterval(interval)
      window.removeEventListener('teachflow:desktop-notification-setting', onSettingChanged)
    }
  }, [user])

  return null
}
