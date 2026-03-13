import { NextRequest, NextResponse } from 'next/server';
import { createSignedUploadUrl } from '@/lib/supabase';
import { verifyAuth, isAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (!isAdmin(auth)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fileName, contentType, folder } = body;

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields (fileName and contentType)' },
        { status: 400 }
      );
    }

    // Validate content type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'image/heic', 'image/heif', 'image/tiff',
    ];
    if (!allowedTypes.includes(contentType) && !contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate and sanitize folder
    let sanitizedFolder = '';
    if (folder) {
      sanitizedFolder = folder.trim().replace(/^\/+|\/+$/g, '');
      if (sanitizedFolder.includes('..')) {
        return NextResponse.json(
          { error: 'Invalid folder name: path traversal not allowed' },
          { status: 400 }
        );
      }
      if (!/^[a-zA-Z0-9\-_/]+$/.test(sanitizedFolder)) {
        return NextResponse.json(
          { error: 'Invalid folder name: only letters, numbers, hyphens, underscores, and slashes allowed' },
          { status: 400 }
        );
      }
      if (sanitizedFolder.length > 100) {
        return NextResponse.json(
          { error: 'Folder name must be 100 characters or less' },
          { status: 400 }
        );
      }
    }

    // Generate unique file path
    const timestamp = Date.now();
    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    const baseName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const path = sanitizedFolder ? `${sanitizedFolder}/${baseName}` : baseName;

    const result = await createSignedUploadUrl(path);

    return NextResponse.json({
      signedUrl: result.signedUrl,
      token: result.token,
      path: result.path,
    });
  } catch (error) {
    console.error('Signed URL error:', error);
    return NextResponse.json(
      { error: `Failed to create upload URL: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
