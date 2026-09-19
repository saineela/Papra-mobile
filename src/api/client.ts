import { createAuthClient } from 'better-auth/client'
import { Capacitor, CapacitorHttp, CapacitorCookies } from '@capacitor/core'
import type {
  CloudflareAccessConfig,
  DocumentsPage,
  DocumentSearchParams,
  PapraDocument,
  PapraDocumentActivity,
  PapraOrganization,
  PapraOrganizationStats,
  PapraTag,
  PapraUser,
  StoredConnection,
} from '@/types/papra'

export class PapraApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const AUTH_EXCEPTION_STATUSES = new Set([401, 403])

export class AuthRequiredError extends Error {
  constructor(message = 'Authentication required') {
    super(message)
  }
}

/** Normalizes a base url: strips trailing slash and any /api suffix the user may have pasted */
export function normalizeBaseUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, '')
  url = url.replace(/\/api\/?$/, '')
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  return url
}

/** Singleton connection state, hydrated from storage by the app */
let connection: StoredConnection | null = null

export function setConnection(conn: StoredConnection | null) {
  connection = conn
}

export function getConnection(): StoredConnection | null {
  return connection
}

/**
 * Cloudflare Access service-token headers, when configured.
 *
 * A Papra instance behind a Cloudflare Access application rejects requests
 * that lack a valid service token, so these headers are attached to every
 * outbound request (API calls, uploads, file downloads and sign-in).
 */
export function cloudflareHeaders(token?: CloudflareAccessConfig | null): Record<string, string> {
  // `undefined` means "use the stored connection"; `null` is an explicit
  // opt-out used by normal sign-in when Cloudflare Access is not enabled.
  const id = token === undefined
    ? connection?.cfAccessClientId?.trim()
    : token?.clientId?.trim()
  const secret = token === undefined
    ? connection?.cfAccessClientSecret?.trim()
    : token?.clientSecret?.trim()
  if (!id || !secret) return {}
  return {
    'CF-Access-Client-Id': id,
    'CF-Access-Client-Secret': secret,
  }
}

/** True when a Cloudflare Access service token is stored */
export function hasCloudflareAccess(): boolean {
  return Object.keys(cloudflareHeaders()).length > 0
}

export class CloudflareAccessError extends Error {
  constructor(
    message = 'This server is protected by Cloudflare Access. Add a service token to continue.',
  ) {
    super(message)
  }
}

/**
 * Cloudflare Access answers unauthorized requests with `403`/`302` and an HTML
 * login page (not JSON), which otherwise looks like a generic auth failure.
 * Detecting it lets us tell the user exactly what to do.
 */
function looksLikeCloudflareLogin(status: number, contentType: string): boolean {
  if (status !== 403 && status !== 302 && status !== 401) return false
  return contentType.includes('text/html')
}

/**
 * Native WebViews send `Origin: null`, which Better Auth correctly rejects as
 * an unsafe sign-in origin. CapacitorHttp lets us make the auth request with a
 * real server origin while also bypassing WebView CORS restrictions.
 */
async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const requestUrl = input instanceof Request ? input.url : String(input)
  const origin = new URL(requestUrl).origin
  const headers = new Headers(init.headers)
  headers.set('Origin', origin)

  if (!Capacitor.isNativePlatform()) {
    return fetch(input, { ...init, headers })
  }

  const nativeResponse = await CapacitorHttp.request({
    url: requestUrl,
    method: init.method ?? 'GET',
    headers: Object.fromEntries(headers.entries()),
    data: init.body,
    responseType: 'text',
  })

  const responseHeaders = new Headers(nativeResponse.headers)
  // Preserve session cookies if the native HTTP implementation exposes them.
  const setCookie = responseHeaders.get('set-cookie')
  if (setCookie) {
    for (const cookie of setCookie.split(/,(?=[^;]+=[^;]+)/)) {
      const [pair] = cookie.trim().split(';')
      const separator = pair.indexOf('=')
      if (separator > 0) {
        await CapacitorCookies.setCookie({
          url: origin,
          key: pair.slice(0, separator),
          value: pair.slice(separator + 1),
        }).catch(() => undefined)
      }
    }
  }

  const body = typeof nativeResponse.data === 'string'
    ? nativeResponse.data
    : JSON.stringify(nativeResponse.data ?? '')
  return new Response(body, {
    status: nativeResponse.status,
    headers: responseHeaders,
  })
}

/** Session-based better-auth client bound to the stored base url */
let authClientInstance: ReturnType<typeof createAuthClient> | null = null
let authClientBaseUrl: string | null = null

export function getAuthClient(baseUrl?: string) {
  const url = baseUrl ?? connection?.baseUrl
  if (!url) throw new Error('No server url configured')
  if (!authClientInstance || authClientBaseUrl !== url) {
    authClientInstance = createAuthClient({
      baseURL: url,
      fetchOptions: {
        credentials: 'include',
        customFetchImpl: authFetch,
        headers: cloudflareHeaders(),
      },
    })
    authClientBaseUrl = url
  }
  return authClientInstance
}

/**
 * Drops the cached better-auth client.
 * Must be called whenever the connection headers change (e.g. a Cloudflare
 * Access service token is added or removed) so the next sign-in uses them.
 */
export function resetAuthClient() {
  authClientInstance = null
  authClientBaseUrl = null
}

async function request<T>(
  path: string,
  options: RequestInit & { baseUrl?: string; extraHeaders?: Record<string, string> } = {},
): Promise<T> {
  // `baseUrl` alone is enough for pre-connection calls such as API-key checks
  if (!connection && !options.baseUrl) throw new AuthRequiredError('Not connected to a Papra server')
  const base = options.baseUrl ?? connection!.baseUrl

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...cloudflareHeaders(),
    ...(options.extraHeaders ?? {}),
  }

  // API key mode sends bearer tokens; session mode relies on cookies
  if (connection?.mode === 'apiKey' && connection.apiKey) {
    headers.Authorization = `Bearer ${connection.apiKey}`
  }
  if (options.headers) Object.assign(headers, options.headers as Record<string, string>)

  const response = await fetch(`${base}/api${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (response.status === 204) return undefined as T

  const contentType = response.headers.get('content-type') ?? ''

  if (!response.ok) {
    if (looksLikeCloudflareLogin(response.status, contentType)) {
      throw new CloudflareAccessError()
    }
    let message = `Request failed (${response.status})`
    try {
      const data = await response.json()
      if (typeof data === 'string') message = data
      else if (data?.message) message = data.message
      else if (data?.error?.message) message = data.error.message
    } catch {
      // keep default message
    }
    if (AUTH_EXCEPTION_STATUSES.has(response.status)) {
      throw new AuthRequiredError(message)
    }
    throw new PapraApiError(response.status, message)
  }

  // A Cloudflare Access challenge can also arrive as a 200 HTML login page
  if (contentType.includes('text/html')) {
    throw new CloudflareAccessError()
  }
  if (!contentType.includes('application/json')) {
    // streams (document files) are handled separately
    return response as unknown as T
  }
  return (await response.json()) as T
}

/* ------------------------------ auth / me ------------------------------ */

export async function getCurrentUser(): Promise<PapraUser> {
  const data = await request<{ user: PapraUser }>('/users/me')
  return data.user
}

export async function checkApiKey(
  baseUrl: string,
  apiKey: string,
  cfAccess?: CloudflareAccessConfig | null,
) {
  const data = await request<{ apiKey: { id: string; name: string; permissions: string[] } }>(
    '/api-keys/current',
    {
      baseUrl,
      extraHeaders: { ...cloudflareHeaders(cfAccess), Authorization: `Bearer ${apiKey}` },
    },
  )
  return data.apiKey
}

/* ---------------------------- organizations ---------------------------- */

export async function listOrganizations(): Promise<PapraOrganization[]> {
  const data = await request<{ organizations: PapraOrganization[] }>('/organizations')
  return data.organizations
}

export async function createOrganization(name: string): Promise<PapraOrganization> {
  const data = await request<{ organization: PapraOrganization }>('/organizations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  return data.organization
}

/* ------------------------------ documents ------------------------------ */

export async function listDocuments(
  organizationId: string,
  params: DocumentSearchParams = {},
): Promise<DocumentsPage> {
  const query = new URLSearchParams()
  if (params.pageIndex !== undefined) query.set('pageIndex', String(params.pageIndex))
  if (params.pageSize !== undefined) query.set('pageSize', String(params.pageSize))
  if (params.searchQuery) query.set('searchQuery', params.searchQuery)
  if (params.sortField) query.set('sortField', params.sortField)
  if (params.sortOrder) query.set('sortOrder', params.sortOrder)
  const qs = query.toString()
  return request<DocumentsPage>(
    `/organizations/${organizationId}/documents${qs ? `?${qs}` : ''}`,
  )
}

export async function listDeletedDocuments(
  organizationId: string,
  pageIndex = 0,
  pageSize = 100,
): Promise<DocumentsPage> {
  return request<DocumentsPage>(
    `/organizations/${organizationId}/documents/deleted?pageIndex=${pageIndex}&pageSize=${pageSize}`,
  )
}

export async function getDocument(
  organizationId: string,
  documentId: string,
): Promise<PapraDocument> {
  const data = await request<{ document: PapraDocument }>(
    `/organizations/${organizationId}/documents/${documentId}`,
  )
  return data.document
}

export async function updateDocument(
  organizationId: string,
  documentId: string,
  changes: { name?: string; content?: string; notes?: string; documentDate?: string | null },
): Promise<PapraDocument> {
  const data = await request<{ document: PapraDocument }>(
    `/organizations/${organizationId}/documents/${documentId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    },
  )
  return data.document
}

/** Moves the document to trash */
export async function trashDocument(organizationId: string, documentId: string): Promise<void> {
  await request<void>(`/organizations/${organizationId}/documents/${documentId}`, {
    method: 'DELETE',
  })
}

/** Permanently deletes a document already in trash */
export async function deleteDocumentForever(
  organizationId: string,
  documentId: string,
): Promise<void> {
  await request<{ success: boolean }>(
    `/organizations/${organizationId}/documents/trash/${documentId}`,
    { method: 'DELETE' },
  )
}

export async function emptyTrash(organizationId: string): Promise<void> {
  await request<void>(`/organizations/${organizationId}/documents/trash`, { method: 'DELETE' })
}

export async function restoreDocument(
  organizationId: string,
  documentId: string,
): Promise<void> {
  await request<void>(`/organizations/${organizationId}/documents/${documentId}/restore`, {
    method: 'POST',
  })
}

export async function getOrganizationStats(
  organizationId: string,
): Promise<PapraOrganizationStats> {
  const data = await request<{ organizationStats: PapraOrganizationStats }>(
    `/organizations/${organizationId}/documents/statistics`,
  )
  return data.organizationStats
}

export async function uploadDocument(
  organizationId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<PapraDocument> {
  const form = new FormData()
  form.append('file', file)

  const url = `${connection?.baseUrl ?? ''}/api/organizations/${organizationId}/documents`
  const headers: Record<string, string> = { ...cloudflareHeaders() }
  if (connection?.mode === 'apiKey' && connection.apiKey) {
    headers.Authorization = `Bearer ${connection.apiKey}`
  }

  const data = await new Promise<{ document: PapraDocument }>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.withCredentials = true
    for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch (error) {
          reject(new PapraApiError(xhr.status, 'Invalid JSON response'))
        }
      } else if (xhr.status === 401 || xhr.status === 403) {
        reject(new AuthRequiredError(`Upload failed (${xhr.status})`))
      } else {
        let message = `Upload failed (${xhr.status})`
        try {
          const parsed = JSON.parse(xhr.responseText)
          if (parsed?.message) message = parsed.message
        } catch {
          // keep default
        }
        reject(new PapraApiError(xhr.status, message))
      }
    }
    xhr.onerror = () => reject(new PapraApiError(0, 'Network error during upload'))
    xhr.send(form)
  })

  return data.document
}

/**
 * Returns the direct server URL of the document file.
 *
 * We deliberately do NOT use blob: URLs here — Android WebView cannot render
 * blob: URLs inside iframes/imgs, so PDF previews appeared as empty/black.
 * The native WebView CookieManager sends the session cookie automatically,
 * and subresource loads bypass CORS entirely.
 */
export async function getDocumentFileUrl(
  organizationId: string,
  documentId: string,
): Promise<string> {
  if (!connection) throw new AuthRequiredError('Not connected')
  return `${connection.baseUrl}/api/organizations/${organizationId}/documents/${documentId}/file`
}

/**
 * Downloads the raw document file bytes (needed by Markup & Sign).
 * Uses CapacitorHttp arraybuffer + base64 on native, plain fetch in the browser.
 */
export async function fetchDocumentFile(
  organizationId: string,
  documentId: string,
): Promise<Uint8Array> {
  if (!connection) throw new AuthRequiredError('Not connected')
  const path = `/api/organizations/${organizationId}/documents/${documentId}/file`
  const headers: Record<string, string> = { ...cloudflareHeaders() }
  if (connection.mode === 'apiKey' && connection.apiKey) {
    headers.Authorization = `Bearer ${connection.apiKey}`
  }

  // Native (Capacitor): CapacitorHttp intercepts window.fetch but cannot hand
  // back a real ArrayBuffer, so go through the plugin's arraybuffer -> base64 path.
  const { CapacitorHttp } = await import('@capacitor/core')
  if (CapacitorHttp) {
    const response = await CapacitorHttp.request({
      url: `${connection.baseUrl}${path}`,
      method: 'GET',
      headers,
      responseType: 'arraybuffer',
    })
    if (response.status !== 200) throw new PapraApiError(response.status, 'Failed to download document')
    const binary = atob(response.data as string)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }

  const response = await fetch(`${connection.baseUrl}${path}`, {
    headers,
    credentials: 'include',
  })
  if (!response.ok) throw new PapraApiError(response.status, 'Failed to download document')
  return new Uint8Array(await response.arrayBuffer())
}

/* --------------------------- document activity --------------------------- */

export async function getDocumentActivity(
  organizationId: string,
  documentId: string,
): Promise<PapraDocumentActivity[]> {
  const data = await request<{ activities: PapraDocumentActivity[] }>(
    `/organizations/${organizationId}/documents/${documentId}/activity`,
  )
  return data.activities
}

/* --------------------------------- tags --------------------------------- */

export async function listTags(organizationId: string): Promise<PapraTag[]> {
  const data = await request<{ tags: PapraTag[] }>(`/organizations/${organizationId}/tags`)
  return data.tags
}

export async function createTag(
  organizationId: string,
  input: { name: string; color: string; description?: string },
): Promise<PapraTag> {
  const data = await request<{ tag: PapraTag }>(`/organizations/${organizationId}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return data.tag
}

export async function updateTag(
  organizationId: string,
  tagId: string,
  input: { name?: string; color?: string; description?: string },
): Promise<PapraTag> {
  const data = await request<{ tag: PapraTag }>(
    `/organizations/${organizationId}/tags/${tagId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
  return data.tag
}

export async function deleteTag(organizationId: string, tagId: string): Promise<void> {
  await request<void>(`/organizations/${organizationId}/tags/${tagId}`, { method: 'DELETE' })
}

export async function addTagToDocument(
  organizationId: string,
  documentId: string,
  tagId: string,
): Promise<void> {
  await request<void>(`/organizations/${organizationId}/documents/${documentId}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tagId }),
  })
}

export async function removeTagFromDocument(
  organizationId: string,
  documentId: string,
  tagId: string,
): Promise<void> {
  await request<void>(
    `/organizations/${organizationId}/documents/${documentId}/tags/${tagId}`,
    { method: 'DELETE' },
  )
}
