'use client';

import React from 'react';
import { UpdateInfo, UpdateStatus } from '@/hooks/use-updater';

interface UpdateDialogProps {
  open: boolean;
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  downloadProgress: number;
  error: string | null;
  onUpdate: () => void;
  onDismiss: () => void;
}

export function UpdateDialog({
  open,
  status,
  updateInfo,
  downloadProgress,
  error,
  onUpdate,
  onDismiss,
}: UpdateDialogProps) {
  if (!open) return null;

  const isDownloading = status === 'downloading';
  const isInstalling = status === 'installing';
  const isProcessing = isDownloading || isInstalling;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Có phiên bản TeachFlow mới
            </h2>
            {updateInfo && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Phiên bản <span className="font-medium text-blue-600 dark:text-blue-400">{updateInfo.version}</span>
                {' '}(hiện tại: {updateInfo.currentVersion})
              </p>
            )}
          </div>
        </div>

        {/* Release notes */}
        {updateInfo?.body && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-40 overflow-y-auto">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
              Thay đổi
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {updateInfo.body}
            </p>
          </div>
        )}

        {/* Progress bar */}
        {isProcessing && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>{isInstalling ? 'Đang cài đặt...' : 'Đang tải xuống...'}</span>
              {isDownloading && <span>{downloadProgress}%</span>}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: isInstalling ? '100%' : `${downloadProgress}%` }}
              />
            </div>
            {isInstalling && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Ứng dụng sẽ tự khởi động lại sau khi cài đặt xong.
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {status === 'error' && error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          {!isProcessing && (
            <button
              onClick={onDismiss}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Để sau
            </button>
          )}
          <button
            onClick={onUpdate}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                {isInstalling ? 'Đang cài đặt...' : `Đang tải ${downloadProgress}%`}
              </>
            ) : (
              'Cập nhật ngay'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}