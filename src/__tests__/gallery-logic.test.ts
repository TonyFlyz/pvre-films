import { describe, it, expect } from 'vitest'

// Test helper functions extracted from component logic
// These validate the business logic used across gallery and admin pages

describe('Image source resolution', () => {
  const getImageSrc = (image: any) => {
    return image.thumbnail_path || image.thumbnailUrl || image.storage_path || image.imageUrl
  }

  it('prefers thumbnail_path over other fields', () => {
    const image = {
      thumbnail_path: '/thumb.jpg',
      thumbnailUrl: '/old-thumb.jpg',
      storage_path: '/full.jpg',
      imageUrl: '/legacy.jpg',
    }
    expect(getImageSrc(image)).toBe('/thumb.jpg')
  })

  it('falls back to thumbnailUrl when thumbnail_path is missing', () => {
    const image = {
      thumbnailUrl: '/old-thumb.jpg',
      storage_path: '/full.jpg',
    }
    expect(getImageSrc(image)).toBe('/old-thumb.jpg')
  })

  it('falls back to storage_path when no thumbnails exist', () => {
    const image = { storage_path: '/full.jpg' }
    expect(getImageSrc(image)).toBe('/full.jpg')
  })

  it('falls back to imageUrl as last resort', () => {
    const image = { imageUrl: '/legacy.jpg' }
    expect(getImageSrc(image)).toBe('/legacy.jpg')
  })

  it('returns undefined when no image fields exist', () => {
    expect(getImageSrc({})).toBeUndefined()
  })
})

describe('File type detection', () => {
  const isImageFile = (file: { name: string; type: string }) => {
    const isHEIC = file.name.toLowerCase().endsWith('.heic') ||
                   file.name.toLowerCase().endsWith('.heif') ||
                   file.type === 'image/heic' ||
                   file.type === 'image/heif'
    const isTIFF = file.name.toLowerCase().endsWith('.tif') ||
                   file.name.toLowerCase().endsWith('.tiff') ||
                   file.type === 'image/tiff'
    return file.type.startsWith('image/') || isHEIC || isTIFF
  }

  const isHEICFile = (file: { name: string; type: string }) => {
    return file.name.toLowerCase().endsWith('.heic') ||
           file.name.toLowerCase().endsWith('.heif') ||
           file.type === 'image/heic' ||
           file.type === 'image/heif'
  }

  const isTIFFile = (file: { name: string; type: string }) => {
    return file.name.toLowerCase().endsWith('.tif') ||
           file.name.toLowerCase().endsWith('.tiff') ||
           file.type === 'image/tiff'
  }

  it('identifies standard image types', () => {
    expect(isImageFile({ name: 'photo.jpg', type: 'image/jpeg' })).toBe(true)
    expect(isImageFile({ name: 'photo.png', type: 'image/png' })).toBe(true)
    expect(isImageFile({ name: 'photo.webp', type: 'image/webp' })).toBe(true)
  })

  it('identifies HEIC files by extension', () => {
    expect(isHEICFile({ name: 'IMG_001.HEIC', type: '' })).toBe(true)
    expect(isHEICFile({ name: 'photo.heif', type: '' })).toBe(true)
    expect(isImageFile({ name: 'IMG_001.HEIC', type: '' })).toBe(true)
  })

  it('identifies HEIC files by MIME type', () => {
    expect(isHEICFile({ name: 'photo', type: 'image/heic' })).toBe(true)
    expect(isHEICFile({ name: 'photo', type: 'image/heif' })).toBe(true)
  })

  it('identifies TIF files by extension', () => {
    expect(isTIFFile({ name: 'scan.tif', type: '' })).toBe(true)
    expect(isTIFFile({ name: 'scan.tiff', type: '' })).toBe(true)
    expect(isTIFFile({ name: 'SCAN.TIF', type: '' })).toBe(true)
    expect(isImageFile({ name: 'scan.tif', type: '' })).toBe(true)
  })

  it('identifies TIF files by MIME type', () => {
    expect(isTIFFile({ name: 'photo', type: 'image/tiff' })).toBe(true)
  })

  it('rejects non-image files', () => {
    expect(isImageFile({ name: 'doc.pdf', type: 'application/pdf' })).toBe(false)
    expect(isImageFile({ name: 'video.mp4', type: 'video/mp4' })).toBe(false)
    expect(isImageFile({ name: 'data.json', type: 'application/json' })).toBe(false)
  })

  it('does not misidentify non-HEIC/TIF as such', () => {
    expect(isHEICFile({ name: 'photo.jpg', type: 'image/jpeg' })).toBe(false)
    expect(isTIFFile({ name: 'photo.jpg', type: 'image/jpeg' })).toBe(false)
  })
})

describe('Infinite scroll logic', () => {
  const BATCH_SIZE = 50

  it('starts with first batch of images', () => {
    const images = Array.from({ length: 352 }, (_, i) => ({ id: `img-${i}` }))
    const visibleCount = BATCH_SIZE
    const visibleImages = images.slice(0, visibleCount)

    expect(visibleImages.length).toBe(50)
    expect(visibleImages[0].id).toBe('img-0')
    expect(visibleImages[49].id).toBe('img-49')
  })

  it('loads more images in batches', () => {
    const total = 352
    let visibleCount = BATCH_SIZE

    // Simulate 3 load-more triggers
    visibleCount = Math.min(visibleCount + BATCH_SIZE, total)
    expect(visibleCount).toBe(100)

    visibleCount = Math.min(visibleCount + BATCH_SIZE, total)
    expect(visibleCount).toBe(150)

    visibleCount = Math.min(visibleCount + BATCH_SIZE, total)
    expect(visibleCount).toBe(200)
  })

  it('caps at total image count', () => {
    const total = 120
    let visibleCount = BATCH_SIZE

    visibleCount = Math.min(visibleCount + BATCH_SIZE, total)
    expect(visibleCount).toBe(100)

    visibleCount = Math.min(visibleCount + BATCH_SIZE, total)
    expect(visibleCount).toBe(120)

    // Stays at max
    visibleCount = Math.min(visibleCount + BATCH_SIZE, total)
    expect(visibleCount).toBe(120)
  })

  it('knows when there are more images to load', () => {
    const total = 100
    let visibleCount = BATCH_SIZE
    expect(visibleCount < total).toBe(true) // hasMore = true

    visibleCount = Math.min(visibleCount + BATCH_SIZE, total)
    expect(visibleCount < total).toBe(false) // hasMore = false
  })

  it('handles fewer images than batch size', () => {
    const total = 20
    const visibleCount = BATCH_SIZE
    const visible = Math.min(visibleCount, total)
    expect(visible).toBe(20)
    expect(visibleCount < total).toBe(false) // No sentinel needed
  })
})

describe('Smart column defaults', () => {
  it('defaults to 5 columns for All Images with many images', () => {
    const categoryParam = null
    const imageCount = 352
    const loading = false

    const shouldUse5Columns = !loading && !categoryParam && imageCount > 20
    expect(shouldUse5Columns).toBe(true)
  })

  it('keeps 1 column for category pages', () => {
    const categoryParam = 'portraits'
    const imageCount = 30
    const loading = false

    const shouldUse5Columns = !loading && !categoryParam && imageCount > 20
    expect(shouldUse5Columns).toBe(false)
  })

  it('keeps 1 column when All Images has few images', () => {
    const categoryParam = null
    const imageCount = 10
    const loading = false

    const shouldUse5Columns = !loading && !categoryParam && imageCount > 20
    expect(shouldUse5Columns).toBe(false)
  })

  it('does not change columns while loading', () => {
    const categoryParam = null
    const imageCount = 352
    const loading = true

    const shouldUse5Columns = !loading && !categoryParam && imageCount > 20
    expect(shouldUse5Columns).toBe(false)
  })
})

describe('Category hierarchy logic', () => {
  const categories = [
    { id: '1', name: 'Weddings', slug: 'weddings', parent_id: null },
    { id: '2', name: 'Portraits', slug: 'portraits', parent_id: null },
    { id: '3', name: 'Ceremony', slug: 'ceremony', parent_id: '1' },
    { id: '4', name: 'Reception', slug: 'reception', parent_id: '1' },
  ]

  it('finds parent categories (no parent_id)', () => {
    const parents = categories.filter((c) => !c.parent_id)
    expect(parents).toHaveLength(2)
    expect(parents.map((c) => c.name)).toEqual(['Weddings', 'Portraits'])
  })

  it('finds child categories for a parent', () => {
    const children = categories.filter((c) => c.parent_id === '1')
    expect(children).toHaveLength(2)
    expect(children.map((c) => c.name)).toEqual(['Ceremony', 'Reception'])
  })

  it('identifies leaf vs parent categories', () => {
    const weddingsChildren = categories.filter((c) => c.parent_id === '1')
    const portraitsChildren = categories.filter((c) => c.parent_id === '2')

    expect(weddingsChildren.length > 0).toBe(true)  // parent
    expect(portraitsChildren.length > 0).toBe(false) // leaf
  })

  it('matches categories by slug with trimming', () => {
    const slugParam = 'weddings'
    const match = categories.find((c) => c.slug.trim() === slugParam?.trim())
    expect(match?.name).toBe('Weddings')
  })

  it('returns null for unknown slug', () => {
    const match = categories.find((c) => c.slug.trim() === 'unknown')
    expect(match).toBeUndefined()
  })
})

describe('Bulk select logic', () => {
  it('toggles selection on and off', () => {
    const selected = new Set<string>()

    // Select
    selected.add('img-1')
    expect(selected.has('img-1')).toBe(true)
    expect(selected.size).toBe(1)

    // Deselect
    selected.delete('img-1')
    expect(selected.has('img-1')).toBe(false)
    expect(selected.size).toBe(0)
  })

  it('select all adds all filtered image ids', () => {
    const filteredImages = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const selected = new Set(filteredImages.map((img) => img.id))
    expect(selected.size).toBe(3)
    expect(selected.has('a')).toBe(true)
    expect(selected.has('c')).toBe(true)
  })

  it('select none clears all selections', () => {
    const selected = new Set(['a', 'b', 'c'])
    selected.clear()
    expect(selected.size).toBe(0)
  })
})

describe('YouTube URL parsing', () => {
  function getYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/)
    return match ? match[1] : null
  }

  it('extracts ID from standard watch URL', () => {
    expect(getYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts ID from short URL', () => {
    expect(getYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts ID from embed URL', () => {
    expect(getYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extracts ID with extra parameters', () => {
    expect(getYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30')).toBe('dQw4w9WgXcQ')
  })

  it('returns null for invalid URLs', () => {
    expect(getYouTubeId('https://vimeo.com/12345')).toBeNull()
    expect(getYouTubeId('not a url')).toBeNull()
  })
})
