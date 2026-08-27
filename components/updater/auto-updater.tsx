'use client';

import React, { useEffect, useRef } from 'react';
import { useUpdater } from '@/hooks/use-updater';
import { UpdateDialog } from './update-dialog';

interface AutoUpdaterProps {
  /** If true (e.g. form is dirty), suppress automatic popup */
  isDirty?: boolean;
}

/**
 * Mount this once at the app root.
 * It silently checks for updates 5 seconds after startup,
 * then shows a dialog only when an update is found.
 * Never blocks startup, never crashes the app on error.
 */
export function AutoUpdater({ isDirty }: AutoUpdaterProps) {
  const { status, updateInfo, downloadProgress, error, checkForUpdate, downloadAndInstall, dismiss } =
    useUpdater(isDirty);

  const hasCheckedRef = useRef(false);

  // Check once 5s after mount — non-blocking
  useEffect(() => {
    // Only run in Tauri context (skip on web/SSR)
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (!isTauri) return;
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const timer = setTimeout(() => {
      checkForUpdate().catch(() => {/* silently ignore */});
    }, 5000);

    return () => clearTimeout(timer);
  }, [checkForUpdate]);

  const showDialog = status === 'available' || status === 'downloading' || status === 'installing' || status === 'error';

  // Don't show dialog if user is editing (isDirty), but still allow from Settings
  if (!showDialog || (isDirty && status === 'available')) return null;

  return (
    <UpdateDialog
      open={showDialog}
      status={status}
      updateInfo={updateInfo}
      downloadProgress={downloadProgress}
      error={error}
      onUpdate={downloadAndInstall}
      onDismiss={dismiss}
    />
  );
}