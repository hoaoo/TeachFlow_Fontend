import { getAccessToken, API_BASE_URL } from './api-client';

/**
 * Downloads a file from the backend with JWT authorization and handles Content-Disposition filename
 */
export async function downloadExportFile(
  endpoint: string,
  defaultFilename: string,
): Promise<void> {
  const token = getAccessToken();
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMsg = 'Không thể xuất tài liệu lúc này. Vui lòng thử lại.';
    try {
      const errorJson = await response.json();
      errorMsg = errorJson.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  // Extract filename from Content-Disposition header
  let filename = defaultFilename;
  const disposition = response.headers.get('content-disposition');
  if (disposition) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match && utf8Match[1]) {
      filename = decodeURIComponent(utf8Match[1]);
    } else {
      const regularMatch = disposition.match(/filename="?([^";]+)"?/i);
      if (regularMatch && regularMatch[1]) {
        filename = regularMatch[1];
      }
    }
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(blobUrl);
}

export const exportService = {
  exportLessonPlanDocx: (id: string, title = 'Giao_an') =>
    downloadExportFile(`/lesson-plans/${id}/export/docx`, `${title}.docx`),

  exportLessonPlanPdf: (id: string, title = 'Giao_an') =>
    downloadExportFile(`/lesson-plans/${id}/export/pdf`, `${title}.pdf`),

  exportWorksheetDocx: (id: string, includeAnswers = false, title = 'Phieu_hoc_tap') =>
    downloadExportFile(
      `/worksheets/${id}/export/docx?includeAnswers=${includeAnswers}`,
      `${title}${includeAnswers ? '_Co_dap_an' : ''}.docx`,
    ),

  exportWorksheetPdf: (id: string, includeAnswers = false, title = 'Phieu_hoc_tap') =>
    downloadExportFile(
      `/worksheets/${id}/export/pdf?includeAnswers=${includeAnswers}`,
      `${title}${includeAnswers ? '_Co_dap_an' : ''}.pdf`,
    ),
};
