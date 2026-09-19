import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  AuthRequiredError,
  checkApiKey,
  getAuthClient,
  getDocument,
  hasCloudflareAccess,
  listDocuments,
  listOrganizations,
  listTags,
  normalizeBaseUrl,
  resetAuthClient,
  setConnection,
} from '@/api/client'
import type {
  CloudflareAccessConfig,
  DocumentSearchParams,
  PapraDocument,
  PapraOrganization,
  PapraOrganizationStats,
  PapraTag,
  PapraUser,
  StoredConnection,
} from '@/types/papra'

const STORAGE_KEY = 'papra.connection'
const ACTIVE_ORG_KEY = 'papra.activeOrganizationId'

export const useConnectionStore = defineStore('connection', () => {
  const connection = ref<StoredConnection | null>(null)
  const user = ref<PapraUser | null>(null)
  const organizations = ref<PapraOrganization[]>([])
  const activeOrganizationId = ref<string | null>(null)
  const status = ref<'loading' | 'connected' | 'disconnected' | 'error'>('loading')
  const errorMessage = ref<string | null>(null)

  const activeOrganization = computed(
    () => organizations.value.find((org) => org.id === activeOrganizationId.value) ?? null,
  )

  /** True when a Cloudflare Access service token is stored with the connection */
  const hasCloudflareToken = computed(() => hasCloudflareAccess())

  const cloudflareMaskedClientId = computed(() => {
    const id = connection.value?.cfAccessClientId ?? ''
    if (!id) return ''
    return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id
  })

  async function persist() {
    if (connection.value) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(connection.value))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  /** Remembers the selected organization so it survives restarts */
  function persistActiveOrganization() {
    if (activeOrganizationId.value) {
      localStorage.setItem(ACTIVE_ORG_KEY, activeOrganizationId.value)
    } else {
      localStorage.removeItem(ACTIVE_ORG_KEY)
    }
  }

  /**
   * Picks the organization to activate after a fresh sign-in: the previously
   * remembered one when it is still visible to this account, otherwise the
   * first organization the server returns.
   */
  function pickInitialOrganization() {
    const remembered = localStorage.getItem(ACTIVE_ORG_KEY)
    const match = organizations.value.find((org) => org.id === remembered)
    activeOrganizationId.value = match?.id ?? organizations.value[0]?.id ?? null
    persistActiveOrganization()
  }

  async function restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        status.value = 'disconnected'
        return false
      }
      const parsed = JSON.parse(raw) as StoredConnection
      setConnection(parsed)
      connection.value = parsed

      // Verify the stored credentials are still valid
      const me = await getCurrentUserSafe()
      if (!me) {
        status.value = 'disconnected'
        return false
      }
      user.value = me
      organizations.value = await listOrganizations()
      if (organizations.value.length > 0 && !activeOrganizationId.value) {
        pickInitialOrganization()
      }
      status.value = 'connected'
      return true
    } catch (error) {
      status.value = 'disconnected'
      return false
    }
  }

  async function getCurrentUserSafe(): Promise<PapraUser | null> {
    try {
      const { getCurrentUser } = await import('@/api/client')
      return await getCurrentUser()
    } catch {
      return null
    }
  }

  /** Normalizes an optional Cloudflare Access service token for storage */
  function cloudflareFields(cfAccess?: CloudflareAccessConfig | null) {
    const clientId = cfAccess?.clientId?.trim()
    const clientSecret = cfAccess?.clientSecret?.trim()
    if (!clientId || !clientSecret) return {}
    return { cfAccessClientId: clientId, cfAccessClientSecret: clientSecret }
  }

  async function connectWithApiKey(
    baseUrl: string,
    apiKey: string,
    cfAccess?: CloudflareAccessConfig | null,
  ) {
    const url = normalizeBaseUrl(baseUrl)
    // Validate the key first — this call carries the service token when present,
    // otherwise a Cloudflare-protected instance would reject the request.
    const keyInfo = await checkApiKey(url, apiKey, cfAccess)
    const conn: StoredConnection = { baseUrl: url, mode: 'apiKey', apiKey, ...cloudflareFields(cfAccess) }
    resetAuthClient()
    setConnection(conn)
    connection.value = conn
    user.value = null
    organizations.value = await listOrganizations()
    if (organizations.value.length === 0) {
      throw new Error('No organizations visible to this API key')
    }
    activeOrganizationId.value = null
    pickInitialOrganization()
    await persist()
    status.value = 'connected'
    errorMessage.value = null
    return { keyInfo, organizations: organizations.value }
  }

  async function connectWithPassword(
    baseUrl: string,
    email: string,
    password: string,
    twoFactorCode?: string,
    cfAccess?: CloudflareAccessConfig | null,
  ) {
    const url = normalizeBaseUrl(baseUrl)

    // better-auth reads its headers from the cached client, so seed the
    // connection (and reset the client) before signing in.
    const conn: StoredConnection = {
      baseUrl: url,
      mode: 'session',
      email,
      ...cloudflareFields(cfAccess),
    }
    resetAuthClient()
    setConnection(conn)
    const authClient = getAuthClient(url)

    const result = await authClient.signIn.email({
      email,
      password,
      ...(twoFactorCode ? { twoFactorCode } : {}),
    })

    if (result.error) {
      // better-auth returns twoFactor related errors with a distinct code
      const code = (result.error as { code?: string }).code
      if (code === 'TWO_FACTOR_REQUIRED' || result.error.status === 401 && code === 'INVALID_TWO_FACTOR') {
        const err = new Error('two-factor-required')
        throw err
      }
      throw new Error(result.error.message ?? 'Sign-in failed')
    }

    connection.value = conn
    user.value = await getCurrentUserSafe()
    organizations.value = await listOrganizations()
    if (organizations.value.length === 0) {
      throw new Error('No organizations available for this account')
    }
    activeOrganizationId.value = null
    pickInitialOrganization()
    await persist()
    status.value = 'connected'
    errorMessage.value = null
    return { user: user.value, organizations: organizations.value }
  }

  /**
   * Switches the active organization and reloads its documents, tags and stats.
   * Every screen reads from the shared documents store, so clearing it here is
   * what keeps the whole app consistent after a switch.
   */
  async function setActiveOrganization(organizationId: string) {
    if (organizationId === activeOrganizationId.value) return
    activeOrganizationId.value = organizationId
    persistActiveOrganization()

    const documentsStore = useDocumentsStore()
    documentsStore.reset()
    try {
      await documentsStore.fetchOrganizationData(organizationId)
    } catch {
      // A failed reload must not bounce the user back; the pages show their own error state
    }
  }

  /**
   * Stores (or clears) a Cloudflare Access service token and verifies it by
   * re-reading the current user through the new headers.
   */
  async function setCloudflareAccess(clientId: string, clientSecret: string) {
    if (!connection.value) throw new Error('Not connected')
    const id = clientId.trim()
    const secret = clientSecret.trim()

    const next: StoredConnection = { ...connection.value }
    if (id && secret) {
      next.cfAccessClientId = id
      next.cfAccessClientSecret = secret
    } else {
      delete next.cfAccessClientId
      delete next.cfAccessClientSecret
    }

    // Verify before committing the new credentials. Otherwise a mistyped
    // service token would be persisted and could lock the user out of the
    // ordinary sign-in flow on the next launch.
    const previous = connection.value
    connection.value = next
    setConnection(next)
    resetAuthClient()

    const me = await getCurrentUserSafe()
    if (!me) {
      connection.value = previous
      setConnection(previous)
      resetAuthClient()
      throw new Error(id && secret
        ? 'Service token rejected by Cloudflare Access'
        : 'Could not verify the connection after removing the service token')
    }

    await persist()
    user.value = me
    return true
  }

  async function disconnect() {
    if (connection.value?.mode === 'session') {
      try {
        await getAuthClient(connection.value.baseUrl).signOut()
      } catch {
        // best effort
      }
    }
    connection.value = null
    user.value = null
    organizations.value = []
    activeOrganizationId.value = null
    setConnection(null)
    resetAuthClient()
    localStorage.removeItem(ACTIVE_ORG_KEY)
    useDocumentsStore().reset()
    await persist()
    status.value = 'disconnected'
  }

  /** Wraps an API call and flips to disconnected on auth errors */
  async function withAuth<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        status.value = 'disconnected'
        throw error
      }
      throw error
    }
  }

  return {
    connection,
    user,
    organizations,
    activeOrganizationId,
    activeOrganization,
    hasCloudflareToken,
    cloudflareMaskedClientId,
    status,
    errorMessage,
    restore,
    connectWithApiKey,
    connectWithPassword,
    setActiveOrganization,
    setCloudflareAccess,
    disconnect,
    withAuth,
    getCurrentUserSafe,
    /** Re-reads the organization list (used after creating an organization) */
    async reloadOrganizations() {
      organizations.value = await listOrganizations()
      return organizations.value
    },
  }
})

/* --------------------------------- documents store --------------------------------- */

export const useDocumentsStore = defineStore('documents', () => {
  const documents = ref<PapraDocument[]>([])
  const documentsCount = ref(0)
  const tags = ref<PapraTag[]>([])
  const stats = ref<PapraOrganizationStats | null>(null)
  const isLoading = ref(false)
  const isLoadingMore = ref(false)
  const searchQuery = ref('')
  const sortField = ref<DocumentSearchParams['sortField']>('createdAt')
  const sortOrder = ref<DocumentSearchParams['sortOrder']>('desc')
  const pageIndex = ref(0)
  const pageSize = 50
  const hasMore = computed(() => documents.value.length < documentsCount.value)
  const selectedTagId = ref<string | null>(null)
  const showUntagged = ref(false)

  function applyClientFilters(list: PapraDocument[]): PapraDocument[] {
    let result = list
    if (selectedTagId.value) {
      result = result.filter((doc) => doc.tags?.some((tag) => tag.id === selectedTagId.value))
    }
    if (showUntagged.value) {
      result = result.filter((doc) => !doc.tags || doc.tags.length === 0)
    }
    return result
  }

  /** Empties the store so it cannot leak data across organization switches */
  function reset() {
    documents.value = []
    documentsCount.value = 0
    tags.value = []
    stats.value = null
    pageIndex.value = 0
    searchQuery.value = ''
    selectedTagId.value = null
    showUntagged.value = false
  }

  async function fetchOrganizationData(organizationId: string) {
    isLoading.value = true
    try {
      const [orgs, docs, orgTags, orgStats] = await Promise.all([
        Promise.resolve(),
        listDocuments(organizationId, { pageIndex: 0, pageSize, searchQuery: searchQuery.value || undefined, sortField: sortField.value, sortOrder: sortOrder.value }),
        listTags(organizationId).catch(() => []),
        import('@/api/client').then(({ getOrganizationStats }) => getOrganizationStats(organizationId)).catch(() => null),
      ])
      documents.value = docs.documents
      documentsCount.value = docs.documentsCount
      tags.value = orgTags
      stats.value = orgStats
      pageIndex.value = 0
    } finally {
      isLoading.value = false
    }
  }

  async function loadMore(organizationId: string) {
    if (isLoadingMore.value || !hasMore.value) return
    isLoadingMore.value = true
    try {
      const next = pageIndex.value + 1
      const page = await listDocuments(organizationId, {
        pageIndex: next,
        pageSize,
        searchQuery: searchQuery.value || undefined,
        sortField: sortField.value,
        sortOrder: sortOrder.value,
      })
      documents.value = [...documents.value, ...page.documents]
      documentsCount.value = page.documentsCount
      pageIndex.value = next
    } finally {
      isLoadingMore.value = false
    }
  }

  async function search(organizationId: string, query: string) {
    searchQuery.value = query
    await fetchOrganizationData(organizationId)
  }

  async function refresh(organizationId: string) {
    await fetchOrganizationData(organizationId)
  }

  async function removeDocument(organizationId: string, documentId: string) {
    const { trashDocument } = await import('@/api/client')
    await trashDocument(organizationId, documentId)
    documents.value = documents.value.filter((doc) => doc.id !== documentId)
    documentsCount.value = Math.max(0, documentsCount.value - 1)
  }

  function replaceDocument(updated: PapraDocument) {
    const index = documents.value.findIndex((doc) => doc.id === updated.id)
    if (index >= 0) {
      documents.value.splice(index, 1, updated)
    }
  }

  function removeTagFromAll(tagId: string) {
    tags.value = tags.value.filter((tag) => tag.id !== tagId)
    for (const doc of documents.value) {
      if (doc.tags) {
        doc.tags = doc.tags.filter((tag) => tag.id !== tagId)
      }
    }
  }

  function upsertTag(tag: PapraTag) {
    const index = tags.value.findIndex((candidate) => candidate.id === tag.id)
    if (index >= 0) {
      tags.value.splice(index, 1, tag)
    } else {
      tags.value.push(tag)
    }
  }

  return {
    documents,
    documentsCount,
    tags,
    stats,
    isLoading,
    isLoadingMore,
    searchQuery,
    sortField,
    sortOrder,
    hasMore,
    selectedTagId,
    showUntagged,
    applyClientFilters,
    reset,
    fetchOrganizationData,
    loadMore,
    search,
    refresh,
    removeDocument,
    replaceDocument,
    removeTagFromAll,
    upsertTag,
  }
})
