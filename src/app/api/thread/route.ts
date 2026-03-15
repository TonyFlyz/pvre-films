import { NextRequest, NextResponse } from 'next/server';
import { getThreadMessages, createThreadMessage } from '@/lib/supabase';
import { verifyAuth, isAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // If requesting pending messages, require admin auth
    if (status === 'pending') {
      const auth = await verifyAuth();
      if (!isAdmin(auth)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const messages = await getThreadMessages('pending');
      return NextResponse.json(messages);
    }

    // Default: return approved messages (public)
    const messages = await getThreadMessages('approved');
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching thread messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'Content must be 500 characters or fewer' }, { status: 400 });
    }

    await createThreadMessage(content);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating thread message:', error);
    return NextResponse.json({ error: 'Failed to submit message' }, { status: 500 });
  }
}
