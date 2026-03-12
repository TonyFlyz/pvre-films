import { NextRequest, NextResponse } from 'next/server';
import { getImages, createImage } from '@/lib/supabase';
import { verifyAuth, isAdmin } from '@/lib/auth';


// GET all images
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const featured = searchParams.get('featured');

    // Only filter by featured if explicitly requested
    const featuredOnly = featured === 'true';

    // Get images from Supabase
    const images = await getImages(
      categoryId || undefined,
      featuredOnly
    );

    return NextResponse.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}

// POST new image (admin only)
export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (!isAdmin(auth)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();

    // Create image in Supabase
    const newImage = await createImage({
      title: data.title,
      description: data.description || '',
      category_id: data.categoryId || data.category_id,
      storage_path: data.imageUrl || data.storage_path,
      thumbnail_path: data.thumbnailUrl || data.thumbnail_path,
      display_order: data.order || data.display_order || 0,
      is_featured: data.isPublished ?? data.is_featured ?? true,
    });

    return NextResponse.json(newImage);
  } catch (error) {
    console.error('Error creating image:', error);
    return NextResponse.json(
      { error: 'Failed to create image' },
      { status: 400 }
    );
  }
}
