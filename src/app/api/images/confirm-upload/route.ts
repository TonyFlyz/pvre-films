import { NextRequest, NextResponse } from 'next/server';
import { createImage, getImages, getStoragePublicUrl } from '@/lib/supabase';
import { verifyAuth, isAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (!isAdmin(auth)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { path, title, description, categoryId, isFeatured } = body;

    if (!path || !title) {
      return NextResponse.json(
        { error: 'Missing required fields (path and title)' },
        { status: 400 }
      );
    }

    // Get the public URL for the uploaded file
    const publicUrl = getStoragePublicUrl(path);

    // Get the next display order for this category
    const categoryImages = categoryId
      ? await getImages(categoryId, false)
      : await getImages(undefined, false);

    const nextOrder = categoryImages.length > 0
      ? Math.max(...categoryImages.map(img => img.display_order)) + 1
      : 1;

    // Create image record in database
    const newImage = await createImage({
      title,
      description: description || '',
      category_id: categoryId || undefined,
      storage_path: publicUrl,
      thumbnail_path: publicUrl,
      display_order: nextOrder,
      is_featured: isFeatured ?? true,
    });

    return NextResponse.json({
      success: true,
      image: newImage,
    });
  } catch (error) {
    console.error('Confirm upload error:', error);
    return NextResponse.json(
      { error: `Failed to confirm upload: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
