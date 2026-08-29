import { api } from './api-client'

export type HtmlGameStatus = 'DRAFT' | 'PUBLISHED' | 'DISABLED'

export type HtmlGameThumbnail = {
  url: string
  alt?: string
}

export type HtmlGame = {
  id: string
  title: string
  description?: string | null
  thumbnail?: HtmlGameThumbnail | null
  gradeId?: string | null
  grade?: { id: string; name: string } | null
  subjectId?: string | null
  subject?: { id: string; name: string } | null
  entryFile: string
  status: HtmlGameStatus
  createdBy?: { id: string; email: string } | null
  createdAt: string
  updatedAt: string
  package?: { fileCount: number; totalSize: number }
}

export type HtmlGamePlay = {
  id: string
  title: string
  playUrl: string
  sandbox: string
  referrerPolicy: 'no-referrer'
}

export type HtmlGamePayload = {
  title: string
  description?: string | null
  thumbnail?: HtmlGameThumbnail | null
  gradeId?: string | null
  subjectId?: string | null
}

export async function getHtmlGames(params?: {
  search?: string
  gradeId?: string
  subjectId?: string
  status?: HtmlGameStatus
}): Promise<HtmlGame[]> {
  const query = new URLSearchParams()
  if (params?.search) query.set('search', params.search)
  if (params?.gradeId) query.set('gradeId', params.gradeId)
  if (params?.subjectId) query.set('subjectId', params.subjectId)
  if (params?.status) query.set('status', params.status)
  const suffix = query.size ? `?${query.toString()}` : ''
  const games = await api.get<HtmlGame[]>(`/html-games${suffix}`)
  return Array.isArray(games) ? games : []
}

export function getHtmlGame(id: string): Promise<HtmlGame> {
  return api.get<HtmlGame>(`/html-games/${id}`)
}

export function getHtmlGamePlay(id: string): Promise<HtmlGamePlay> {
  return api.get<HtmlGamePlay>(`/html-games/${id}/play`)
}

export function createHtmlGame(payload: HtmlGamePayload): Promise<HtmlGame> {
  return api.post<HtmlGame>('/admin/html-games', payload)
}

export function updateHtmlGame(id: string, payload: Partial<HtmlGamePayload>): Promise<HtmlGame> {
  return api.patch<HtmlGame>(`/admin/html-games/${id}`, payload)
}

export function updateHtmlGameStatus(id: string, status: HtmlGameStatus): Promise<HtmlGame> {
  return api.patch<HtmlGame>(`/admin/html-games/${id}/status`, { status })
}

export function uploadHtmlGamePackage(id: string, file: File): Promise<HtmlGame> {
  const form = new FormData()
  form.append('file', file)
  return api.postForm<HtmlGame>(`/admin/html-games/${id}/package`, form)
}

export function deleteHtmlGame(id: string): Promise<{ success: boolean; message: string }> {
  return api.delete(`/admin/html-games/${id}`)
}

export function attachHtmlGameToLessonPlan(lessonPlanId: string, htmlGameId: string): Promise<HtmlGame> {
  return api.post<HtmlGame>(`/lesson-plans/${lessonPlanId}/html-games/${htmlGameId}`)
}

export function detachHtmlGameFromLessonPlan(lessonPlanId: string, htmlGameId: string) {
  return api.delete(`/lesson-plans/${lessonPlanId}/html-games/${htmlGameId}`)
}

export function getLessonPlanHtmlGames(lessonPlanId: string): Promise<HtmlGame[]> {
  return api.get<HtmlGame[]>(`/lesson-plans/${lessonPlanId}/html-games`)
}
