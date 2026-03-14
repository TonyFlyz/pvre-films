import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing route
vi.mock('@/lib/supabase', () => ({
  getImages: vi.fn(),
  createImage: vi.fn(),
  deleteImageRecord: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  verifyAuth: vi.fn(),
  isAdmin: vi.fn(),
}))

import { GET, DELETE } from '@/app/api/images/route'
import { getImages, deleteImageRecord } from '@/lib/supabase'
import { verifyAuth, isAdmin } from '@/lib/auth'

const mockGetImages = vi.mocked(getImages)
const mockDeleteImageRecord = vi.mocked(deleteImageRecord)
const mockVerifyAuth = vi.mocked(verifyAuth)
const mockIsAdmin = vi.mocked(isAdmin)

function makeRequest(url: string, options?: RequestInit) {
  return new Request(url, options) as any
}

describe('GET /api/images', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all images when no filters are provided', async () => {
    const mockImages = [
      { id: '1', title: 'Image 1' },
      { id: '2', title: 'Image 2' },
    ]
    mockGetImages.mockResolvedValue(mockImages as any)

    const response = await GET(makeRequest('http://localhost/api/images'))
    const data = await response.json()

    expect(mockGetImages).toHaveBeenCalledWith(undefined, false)
    expect(data).toEqual(mockImages)
  })

  it('filters by categoryId when provided', async () => {
    mockGetImages.mockResolvedValue([])

    await GET(makeRequest('http://localhost/api/images?categoryId=cat-123'))

    expect(mockGetImages).toHaveBeenCalledWith('cat-123', false)
  })

  it('filters by featured when explicitly true', async () => {
    mockGetImages.mockResolvedValue([])

    await GET(makeRequest('http://localhost/api/images?featured=true'))

    expect(mockGetImages).toHaveBeenCalledWith(undefined, true)
  })

  it('returns 500 on error', async () => {
    mockGetImages.mockRejectedValue(new Error('DB error'))

    const response = await GET(makeRequest('http://localhost/api/images'))
    expect(response.status).toBe(500)
  })
})

describe('DELETE /api/images (bulk)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated requests', async () => {
    mockVerifyAuth.mockResolvedValue(null as any)
    mockIsAdmin.mockReturnValue(false)

    const response = await DELETE(
      makeRequest('http://localhost/api/images', {
        method: 'DELETE',
        body: JSON.stringify({ ids: ['1'] }),
        headers: { 'Content-Type': 'application/json' },
      })
    )

    expect(response.status).toBe(401)
  })

  it('rejects empty ids array', async () => {
    mockVerifyAuth.mockResolvedValue({ role: 'admin' } as any)
    mockIsAdmin.mockReturnValue(true)

    const response = await DELETE(
      makeRequest('http://localhost/api/images', {
        method: 'DELETE',
        body: JSON.stringify({ ids: [] }),
        headers: { 'Content-Type': 'application/json' },
      })
    )

    expect(response.status).toBe(400)
  })

  it('deletes multiple images and reports results', async () => {
    mockVerifyAuth.mockResolvedValue({ role: 'admin' } as any)
    mockIsAdmin.mockReturnValue(true)
    mockDeleteImageRecord.mockResolvedValue(undefined)

    const ids = ['id-1', 'id-2', 'id-3']
    const response = await DELETE(
      makeRequest('http://localhost/api/images', {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.deleted).toBe(3)
    expect(data.failed).toBe(0)
    expect(mockDeleteImageRecord).toHaveBeenCalledTimes(3)
  })

  it('reports partial failures', async () => {
    mockVerifyAuth.mockResolvedValue({ role: 'admin' } as any)
    mockIsAdmin.mockReturnValue(true)
    mockDeleteImageRecord
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Not found'))
      .mockResolvedValueOnce(undefined)

    const response = await DELETE(
      makeRequest('http://localhost/api/images', {
        method: 'DELETE',
        body: JSON.stringify({ ids: ['1', '2', '3'] }),
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const data = await response.json()
    expect(data.deleted).toBe(2)
    expect(data.failed).toBe(1)
  })
})
