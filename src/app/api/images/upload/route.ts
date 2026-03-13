import { NextRequest, NextResponse } from 'next/server';
import { createImage, getImages, uploadImageToStorage } from '@/lib/supabase';
import { verifyAuth, isAdmin } from '@/lib/auth';

// Allow longer execution time for file uploads
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (!isAdmin(auth)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const categoryId = formData.get('categoryId') as string;
    const isFeatured = formData.get('isPublished') === 'true' || formData.get('isFeatured') === 'true';
    const folder = (formData.get('folder') as string)?.trim() || '';

    if (!file || !title) {
      return NextResponse.json(
        { error: 'Missing required fields (file and title)' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 15MB' },
        { status: 400 }
      );
    }

    // Validate folder name if provided
    let sanitizedFolder = '';
    if (folder) {
      // Strip leading/trailing slashes
      sanitizedFolder = folder.replace(/^\/+|\/+$/g, '');
      // Reject path traversal
      if (sanitizedFolder.includes('..')) {
        return NextResponse.json(
          { error: 'Invalid folder name: path traversal not allowed' },
          { status: 400 }
        );
      }
      // Allow only alphanumeric, hyphens, underscores, forward slashes
      if (!/^[a-zA-Z0-9\-_/]+$/.test(sanitizedFolder)) {
        return NextResponse.json(
          { error: 'Invalid folder name: only letters, numbers, hyphens, underscores, and slashes allowed' },
          { status: 400 }
        );
      }
      // Max length
      if (sanitizedFolder.length > 100) {
        return NextResponse.json(
          { error: 'Folder name must be 100 characters or less' },
          { status: 400 }
        );
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const baseName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const fileName = sanitizedFolder ? `${sanitizedFolder}/${baseName}` : baseName;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Supabase Storage
    const { publicUrl } = await uploadImageToStorage(buffer, fileName, file.type);

    // Get the next order number for this category
    const categoryImages = categoryId
      ? await getImages(categoryId, false)
      : await getImages(undefined, false);

    const nextOrder = categoryImages.length > 0
      ? Math.max(...categoryImages.map(img => img.display_order)) + 1
      : 1;

    // Create image record in Supabase
    const newImage = await createImage({
      title,
      description: description || '',
      category_id: categoryId || undefined,
      storage_path: publicUrl,
      thumbnail_path: publicUrl,
      display_order: nextOrder,
      is_featured: isFeatured,
    });

    return NextResponse.json({
      success: true,
      image: newImage
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
