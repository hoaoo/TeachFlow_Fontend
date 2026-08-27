import { toast } from 'sonner'
import { getPlatform } from '@/platform'

function extensionOf(filename: string) {
  return filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || ''
}

export async function saveBlob(blob: Blob, filename: string): Promise<string | null> {
  const extension = extensionOf(filename)
  const platform = getPlatform()
  const path = await platform.saveFile(blob, {
    suggestedName: filename,
    filters: extension ? [{ name: extension.toUpperCase(), extensions: [extension] }] : undefined,
  })
  if (platform.isDesktop() && path) {
    toast.success('Đã lưu file', {
      description: path,
      duration: 10_000,
      action: {
        label: 'Mở file',
        onClick: () => { platform.openFile(path).catch(() => toast.error('Không thể mở file.')) },
      },
      cancel: {
        label: 'Mở thư mục',
        onClick: () => { platform.revealFile(path).catch(() => toast.error('Không thể mở thư mục.')) },
      },
    })
  }
  return path
}
