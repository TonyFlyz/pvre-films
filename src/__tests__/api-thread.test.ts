import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  getThreadMessages: vi.fn(),
  createThreadMessage: vi.fn(),
  updateThreadMessageStatus: vi.fn(),
  deleteThreadMessage: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  verifyAuth: vi.fn(),
  isAdmin: vi.fn(),
}))

import { GET, POST } from '@/app/api/thread/route'
import { PATCH, DELETE } from '@/app/api/thread/[id]/route'
import { getThreadMessages, createThreadMessage, updateThreadMessageStatus, deleteThreadMessage } from '@/lib/supabase'
import { verifyAuth, isAdmin } from '@/lib/auth'

const mockGetThreadMessages = vi.mocked(getThreadMessages)
const mockCreateThreadMessage = vi.mocked(createThreadMessage)
const mockUpdateStatus = vi.mocked(updateThreadMessageStatus)
const mockDeleteMessage = vi.mocked(deleteThreadMessage)
const mockVerifyAuth = vi.mocked(verifyAuth)
const mockIsAdmin = vi.mocked(isAdmin)

function makeRequest(url: string, options?: RequestInit) {
  return new Request(url, options) as any
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/thread', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns approved messages by default', async () => {
    const mockMessages = [
      { id: '1', content: 'Hello', status: 'approved', created_at: '2026-01-01' },
    ]
    mockGetThreadMessages.mockResolvedValue(mockMessages as any)

    const response = await GET(makeRequest('http://localhost/api/thread'))
    const data = await response.json()

    expect(mockGetThreadMessages).toHaveBeenCalledWith('approved')
    expect(data).toEqual(mockMessages)
  })

  it('returns pending messages for admin', async () => {
    mockVerifyAuth.mockResolvedValue({ role: 'admin' } as any)
    mockIsAdmin.mockReturnValue(true)
    mockGetThreadMessages.mockResolvedValue([])

    await GET(makeRequest('http://localhost/api/thread?status=pending'))

    expect(mockGetThreadMessages).toHaveBeenCalledWith('pending')
  })

  it('rejects status=pending for non-admin', async () => {
    mockVerifyAuth.mockResolvedValue(null as any)
    mockIsAdmin.mockReturnValue(false)

    const response = await GET(makeRequest('http://localhost/api/thread?status=pending'))
    expect(response.status).toBe(401)
  })
})

describe('POST /api/thread', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a pending message', async () => {
    mockCreateThreadMessage.mockResolvedValue({ id: '1', content: 'Test', status: 'pending', created_at: '2026-01-01' } as any)

    const response = await POST(
      makeRequest('http://localhost/api/thread', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test' }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(mockCreateThreadMessage).toHaveBeenCalledWith('Test')
  })

  it('rejects empty content', async () => {
    const response = await POST(
      makeRequest('http://localhost/api/thread', {
        method: 'POST',
        body: JSON.stringify({ content: '' }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(response.status).toBe(400)
  })

  it('rejects content over 500 characters', async () => {
    const response = await POST(
      makeRequest('http://localhost/api/thread', {
        method: 'POST',
        body: JSON.stringify({ content: 'a'.repeat(501) }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(response.status).toBe(400)
  })
})

describe('PATCH /api/thread/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('approves a message as admin', async () => {
    mockVerifyAuth.mockResolvedValue({ role: 'admin' } as any)
    mockIsAdmin.mockReturnValue(true)
    mockUpdateStatus.mockResolvedValue({ id: '1', content: 'Test', status: 'approved', created_at: '2026-01-01' } as any)

    const response = await PATCH(
      makeRequest('http://localhost/api/thread/1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('1')
    )
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(mockUpdateStatus).toHaveBeenCalledWith('1', 'approved')
  })

  it('rejects unauthenticated requests', async () => {
    mockVerifyAuth.mockResolvedValue(null as any)
    mockIsAdmin.mockReturnValue(false)

    const response = await PATCH(
      makeRequest('http://localhost/api/thread/1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('1')
    )
    expect(response.status).toBe(401)
  })
})

describe('DELETE /api/thread/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes a message as admin', async () => {
    mockVerifyAuth.mockResolvedValue({ role: 'admin' } as any)
    mockIsAdmin.mockReturnValue(true)
    mockDeleteMessage.mockResolvedValue(undefined)

    const response = await DELETE(
      makeRequest('http://localhost/api/thread/1', { method: 'DELETE' }),
      makeParams('1')
    )
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(mockDeleteMessage).toHaveBeenCalledWith('1')
  })

  it('rejects unauthenticated requests', async () => {
    mockVerifyAuth.mockResolvedValue(null as any)
    mockIsAdmin.mockReturnValue(false)

    const response = await DELETE(
      makeRequest('http://localhost/api/thread/1', { method: 'DELETE' }),
      makeParams('1')
    )
    expect(response.status).toBe(401)
  })
})
