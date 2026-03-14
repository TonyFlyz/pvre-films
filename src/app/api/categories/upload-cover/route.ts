import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToStorage } from '@/lib/supabase';
import { verifyAuth, isAdmin } from '@/lib/auth';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (!isAdmin(auth)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 15MB' }, { status: 400 });
    }

    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `covers/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { publicUrl } = await uploadImageToStorage(buffer, fileName, file.type);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Cover upload error:', error);
    return NextResponse.json(
      { error: `Failed to upload cover image: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
