/**
 * Papra API types — derived from papra-hq/papra server schemas
 * (apps/papra-server/src/modules/documents/documents.routes.ts etc.)
 */

export interface PapraOrganization {
  id: string
  name: string
  createdAt?: string
  updatedAt?: string
}

export interface PapraDocument {
  id: string
  name: string
  organizationId: string
  /** Live servers send `mimeType`; keep contentType as a fallback. */
  mimeType?: string
  contentType: string
  originalSize: number
  content?: string
  notes?: string | null
  documentDate?: string | null
  createdAt: string
  updatedAt: string
  isDeleted?: boolean
  deletedAt?: string | null
  deletedBy?: string | null
  tags?: PapraDocumentTag[]
}

export interface PapraDocumentTag {
  id: string
  name: string
  color: string
  description?: string | null
}

export interface PapraTag {
  id: string
  name: string
  color: string
  description?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface PapraUser {
  id: string
  email: string
  name: string
  createdAt?: string
  updatedAt?: string
  twoFactorEnabled?: boolean
  permissions?: string[]
}

export interface PapraOrganizationStats {
  documentsCount: number
  documentsSize: number
  deletedDocumentsCount: number
  deletedDocumentsSize: number
  totalDocumentsCount: number
  totalDocumentsSize: number
}

export interface PapraDocumentActivity {
  id: string
  documentId: string
  /** Server field is `event` (created | updated | deleted | restored | tagged | untagged) */
  event: string
  eventData?: Record<string, unknown> | null
  createdAt: string
  userId?: string | null
  user?: { id: string; name: string } | null
  tag?: { id: string; name: string; color: string } | null
}

export interface DocumentsPage {
  documents: PapraDocument[]
  documentsCount: number
}

export interface DocumentSearchParams {
  pageIndex?: number
  pageSize?: number
  searchQuery?: string
  sortField?: 'createdAt' | 'updatedAt' | 'name' | 'documentDate'
  sortOrder?: 'asc' | 'desc'
}

export type AuthMode = 'apiKey' | 'session'

export interface StoredConnection {
  baseUrl: string
  mode: AuthMode
  /** api key token when mode=apiKey */
  apiKey?: string
  /** account email, kept so the settings screen can label session connections */
  email?: string
  /** session cookie when mode=session */
  sessionToken?: string
  userId?: string
  /**
   * Cloudflare Access service token (Zero Trust).
   *
   * When a Papra instance sits behind a Cloudflare Access application, every
   * request needs the `CF-Access-Client-Id` / `CF-Access-Client-Secret`
   * header pair — including sign-in, so these are stored with the connection.
   */
  cfAccessClientId?: string
  cfAccessClientSecret?: string
}

export interface CloudflareAccessConfig {
  clientId: string
  clientSecret: string
}
