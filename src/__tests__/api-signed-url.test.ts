import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  createSignedUploadUrl: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  verifyAuth: vi.fn(),
  isAdmin: vi.fn(),
}))

import { POST } from '@/app/api/images/signed-url/route'
import { createSignedUploadUrl } from '@/lib/supabase'
import { verifyAuth, isAdmin } from '@/lib/auth'

const mockCreateSignedUploadUrl = vi.mocked(createSignedUploadUrl)
const mockVerifyAuth = vi.mocked(verifyAuth)
const mockIsAdmin = vi.mocked(isAdmin)

function makeRequest(body: any) {
  return new Request('http://localhost/api/images/signed-url', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any
}

describe('POST /api/images/signed-url', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyAuth.mockResolvedValue({ role: 'admin' } as any)
    mockIsAdmin.mockReturnValue(true)
  })

  it('rejects unauthenticated requests', async () => {
    mockVerifyAuth.mockResolvedValue(null as any)
    mockIsAdmin.mockReturnValue(false)

    const res = await POST(makeRequest({ fileName: 'test.jpg', contentType: 'image/jpeg' }))
    expect(res.status).toBe(401)
  })

  it('requires fileName and contentType', async () => {
    const res = await POST(makeRequest({ fileName: 'test.jpg' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Missing required fields')
  })

  it('accepts valid image content types', async () => {
    mockCreateSignedUploadUrl.mockResolvedValue({
      signedUrl: 'https://storage.example.com/signed',
      token: 'tok',
      path: 'test.jpg',
    })

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/tiff']
    for (const contentType of validTypes) {
      const res = await POST(makeRequest({ fileName: 'test.jpg', contentType }))
      expect(res.status).toBe(200)
    }
  })

  it('rejects non-image content types', async () => {
    const res = await POST(makeRequest({ fileName: 'doc.pdf', contentType: 'application/pdf' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('image')
  })

  it('rejects path traversal in folder name', async () => {
    const res = await POST(makeRequest({
      fileName: 'test.jpg',
      contentType: 'image/jpeg',
      folder: '../../../etc',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('path traversal')
  })

  it('rejects invalid characters in folder name', async () => {
    const res = await POST(makeRequest({
      fileName: 'test.jpg',
      contentType: 'image/jpeg',
      folder: 'folder with spaces!',
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Invalid folder name')
  })

  it('rejects overly long folder names', async () => {
    const res = await POST(makeRequest({
      fileName: 'test.jpg',
      contentType: 'image/jpeg',
      folder: 'a'.repeat(101),
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('100 characters')
  })

  it('accepts valid folder names', async () => {
    mockCreateSignedUploadUrl.mockResolvedValue({
      signedUrl: 'https://storage.example.com/signed',
      token: 'tok',
      path: 'wedding-photos/test.jpg',
    })

    const res = await POST(makeRequest({
      fileName: 'test.jpg',
      contentType: 'image/jpeg',
      folder: 'wedding-photos',
    }))
    expect(res.status).toBe(200)
  })

  it('returns signedUrl, token, and path', async () => {
    mockCreateSignedUploadUrl.mockResolvedValue({
      signedUrl: 'https://signed.url',
      token: 'upload-token',
      path: 'photos/123.jpg',
    })

    const res = await POST(makeRequest({ fileName: 'photo.jpg', contentType: 'image/jpeg', folder: 'photos' }))
    const data = await res.json()

    expect(data.signedUrl).toBe('https://signed.url')
    expect(data.token).toBe('upload-token')
    expect(data.path).toBe('photos/123.jpg')
  })
})
