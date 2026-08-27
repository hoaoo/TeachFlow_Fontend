'use client';

import { useState, useCallback, useRef } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export type UpdateInfo = {
  version: string;
  currentVersion: string;
  body: string | null;
  date: string | null;
};

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'installing'
  | 'error';

export type UseUpdaterReturn = {
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  downloadProgress: number;
  error: string | null;
  checkForUpdate: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  dismiss: () => void;
};

export function useUpdater(isDirty?: boolean): UseUpdaterReturn {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const updateRef = useRef<Awaited<ReturnType<typeof check>> | null>(null);

  const checkForUpdate = useCallback(async () => {
    if (isDirty) return;
    setStatus('checking');
    setError(null);

    const timeoutId = setTimeout(() => {
      setStatus('idle');
    }, 30_000);

    try {
      const update = await check();
      clearTimeout(timeoutId);
      if (update) {
        updateRef.current = update;
        setUpdateInfo({
          version: update.version,
          currentVersion: update.currentVersion,
          body: update.body ?? null,
          date: update.date ? String(update.date) : null,
        });
        setStatus('available');
      } else {
        setStatus('not-available');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('[Updater] Check failed:', err);
      setError(String(err));
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  }, [isDirty]);

  const downloadAndInstall = useCallback(async () => {
    const update = updateRef.current;
    if (!update) return;
    setStatus('downloading');
    setDownloadProgress(0);

    try {
      let downloaded = 0;
      let total = 0;

      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          total = event.data.contentLength ?? 0;
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          if (total > 0) {
            setDownloadProgress(Math.round((downloaded / total) * 100));
          }
        } else if (event.event === 'Finished') {
          setDownloadProgress(100);
          setStatus('installing');
        }
      });

      await relaunch();
    } catch (err) {
      console.error('[Updater] Install failed:', err);
      setError(String(err));
      setStatus('error');
    }
  }, []);

  const dismiss = useCallback(() => {
    setStatus('idle');
    setUpdateInfo(null);
    setDownloadProgress(0);
    setError(null);
    updateRef.current = null;
  }, []);

  return { status, updateInfo, downloadProgress, error, checkForUpdate, downloadAndInstall, dismiss };
}