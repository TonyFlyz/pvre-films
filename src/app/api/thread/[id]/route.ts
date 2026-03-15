import { NextRequest, NextResponse } from 'next/server';
import { updateThreadMessageStatus, deleteThreadMessage } from '@/lib/supabase';
import { verifyAuth, isAdmin } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth();
  if (!isAdmin(auth)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    if (body.status !== 'approved') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await updateThreadMessageStatus(id, body.status);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating thread message:', error);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth();
  if (!isAdmin(auth)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    await deleteThreadMessage(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting thread message:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
