'use client';

import React from 'react';
import { useUpdater } from '@/hooks/use-updater';

interface CheckUpdateButtonProps {
  isDirty?: boolean;
}

export function CheckUpdateButton({ isDirty }: CheckUpdateButtonProps) {
  const { status, updateInfo, downloadProgress, error, checkForUpdate, downloadAndInstall, dismiss } =
    useUpdater(isDirty);

  const currentVersion =
    typeof window !== 'undefined' && (window as { __TAURI_INTERNALS__?: { metadata?: { packages?: Array<{ version: string }> } } }).__TAURI_INTERNALS__?.metadata?.packages?.[0]?.version
      ? (window as { __TAURI_INTERNALS__?: { metadata?: { packages?: Array<{ version: string }> } } }).__TAURI_INTERNALS__!.metadata!.packages![0].version
      : '1.0.0';

  const statusLabel: Record<string, string> = {
    idle: '',
    checking: 'Đang kiểm tra...',
    available: `Có phiên bản mới: ${updateInfo?.version ?? ''}`,
    'not-available': 'Bạn đang dùng phiên bản mới nhất.',
    downloading: `Đang tải: ${downloadProgress}%`,
    installing: 'Đang cài đặt...',
    error: `Lỗi: ${error ?? 'Không xác định'}`,
  };

  const isProcessing = status === 'downloading' || status === 'installing' || status === 'checking';

  return (
    <div className="flex flex-col gap-3">
      {/* Version info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Phiên bản hiện tại</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{currentVersion}</p>
        </div>

        <button
          onClick={status === 'available' ? downloadAndInstall : checkForUpdate}
          disabled={isProcessing || status === 'installing'}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600
            hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed
            text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1.5"
        >
          {isProcessing ? (
            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
          ) : status === 'available' ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {status === 'available' ? 'Cập nhật ngay' : 'Kiểm tra cập nhật'}
        </button>
      </div>

      {/* Status message */}
      {statusLabel[status] && (
        <div
          className={`text-xs px-3 py-2 rounded-lg ${
            status === 'available'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              : status === 'error'
              ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
              : status === 'not-available'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          {statusLabel[status]}
          {status === 'available' && (
            <button onClick={dismiss} className="ml-2 opacity-60 hover:opacity-100 text-xs">✕</button>
          )}
        </div>
      )}

      {/* Download progress bar (in settings) */}
      {(status === 'downloading') && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${downloadProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}