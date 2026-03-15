# Thread Feature Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an anonymous "Thread" page with 3D cylinder carousel animation for approved messages, admin moderation, and sidebar navigation.

**Architecture:** Single `thread_messages` Supabase table, two API route files (collection + individual), one public page with CSS 3D animation, one admin moderation page, plus sidebar and dashboard integration.

**Tech Stack:** Next.js App Router, Supabase (via `supabaseAdmin`), CSS 3D transforms, Vitest

**Spec:** `docs/superpowers/specs/2026-03-14-thread-feature-design.md`

---

## Chunk 1: Database, Types, and Helper Functions

### Task 1: SQL Migration Script

**Files:**
- Create: `supabase-thread-messages.sql`

- [ ] **Step 1: Write the migration script**

```sql
CREATE TABLE thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE thread_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read approved messages"
  ON thread_messages FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Anyone can submit messages"
  ON thread_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "No public updates"
  ON thread_messages FOR UPDATE
  USING (false);

CREATE POLICY "No public deletes"
  ON thread_messages FOR DELETE
  USING (false);
```

- [ ] **Step 2: Run the migration against Supabase**

Run the SQL in the Supabase dashboard SQL editor or via CLI. Verify the table exists.

- [ ] **Step 3: Commit**

```bash
git add supabase-thread-messages.sql
git commit -m "feat: add thread_messages table migration"
```

### Task 2: ThreadMessage Interface and Helper Functions

**Files:**
- Modify: `src/lib/supabase.ts` (append after line 350, after `deleteVideo`)

- [ ] **Step 1: Write the test**

Create `src/__tests__/api-thread.test.ts` with mocks for the helper functions. We'll test the API routes that use these helpers — the helpers themselves are thin wrappers around `supabaseAdmin` (same pattern as all existing helpers).

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  getThreadMessages: vi.fn(),
  createThreadMessage: vi.fn(),
  updateThreadMessageStatus: vi.fn(),
  deleteThreadMessage: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  verifyAuth: vi.fn(),
  isAdmin: vi.fn(),
}))

import { getThreadMessages, createThreadMessage, updateThreadMessageStatus, deleteThreadMessage } from '@/lib/supabase'

const mockGetThreadMessages = vi.mocked(getThreadMessages)
const mockCreateThreadMessage = vi.mocked(createThreadMessage)

describe('Thread helpers are exported', () => {
  it('helper mocks resolve', () => {
    expect(mockGetThreadMessages).toBeDefined()
    expect(mockCreateThreadMessage).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/anthonyzamot/Documents/Joar_Website/Pvre.films/photographer-site && export PATH="/Users/anthonyzamot/.nvm/versions/node/v20.9.0/bin:$PATH" && npx vitest run src/__tests__/api-thread.test.ts`

Expected: FAIL — the mock factory can't find the exports.

- [ ] **Step 3: Add ThreadMessage interface and helpers to supabase.ts**

Append to `src/lib/supabase.ts` after the `deleteVideo` function (after line 350):

```typescript
// Thread message types and operations
export interface ThreadMessage {
  id: string
  content: string
  status: 'pending' | 'approved'
  created_at: string
}

export async function getThreadMessages(status?: string) {
  let query = supabaseAdmin
    .from('thread_messages')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) throw error
  return data as ThreadMessage[]
}

export async function createThreadMessage(content: string) {
  const { data, error } = await supabaseAdmin
    .from('thread_messages')
    .insert([{ content }])
    .select()
    .single()

  if (error) throw error
  return data as ThreadMessage
}

export async function updateThreadMessageStatus(id: string, status: string) {
  const { data, error } = await supabaseAdmin
    .from('thread_messages')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as ThreadMessage
}

export async function deleteThreadMessage(id: string) {
  const { error } = await supabaseAdmin
    .from('thread_messages')
    .delete()
    .eq('id', id)

  if (error) throw error
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/anthonyzamot/Documents/Joar_Website/Pvre.films/photographer-site && export PATH="/Users/anthonyzamot/.nvm/versions/node/v20.9.0/bin:$PATH" && npx vitest run src/__tests__/api-thread.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.ts src/__tests__/api-thread.test.ts
git commit -m "feat: add ThreadMessage interface and CRUD helpers"
```

## Chunk 2: API Routes

### Task 3: Thread Collection Route (GET + POST)

**Files:**
- Create: `src/app/api/thread/route.ts`
- Modify: `src/__tests__/api-thread.test.ts`

- [ ] **Step 1: Add tests for GET /api/thread and POST /api/thread**

Add to `src/__tests__/api-thread.test.ts` (replace the placeholder test with full tests):

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  getThreadMessages: vi.fn(),
  createThreadMessage: vi.fn(),
  updateThreadMessageStatus: vi.fn(),
  deleteThreadMessage: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  verifyAuth: vi.fn(),
  isAdmin: vi.fn(),
}))

import { GET, POST } from '@/app/api/thread/route'
import { getThreadMessages, createThreadMessage } from '@/lib/supabase'
import { verifyAuth, isAdmin } from '@/lib/auth'

const mockGetThreadMessages = vi.mocked(getThreadMessages)
const mockCreateThreadMessage = vi.mocked(createThreadMessage)
const mockVerifyAuth = vi.mocked(verifyAuth)
const mockIsAdmin = vi.mocked(isAdmin)

function makeRequest(url: string, options?: RequestInit) {
  return new Request(url, options) as any
}

describe('GET /api/thread', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns approved messages by default', async () => {
    const mockMessages = [
      { id: '1', content: 'Hello', status: 'approved', created_at: '2026-01-01' },
    ]
    mockGetThreadMessages.mockResolvedValue(mockMessages as any)

    const response = await GET(makeRequest('http://localhost/api/thread'))
    const data = await response.json()

    expect(mockGetThreadMessages).toHaveBeenCalledWith('approved')
    expect(data).toEqual(mockMessages)
  })

  it('returns pending messages for admin', async () => {
    mockVerifyAuth.mockResolvedValue({ role: 'admin' } as any)
    mockIsAdmin.mockReturnValue(true)
    mockGetThreadMessages.mockResolvedValue([])

    await GET(makeRequest('http://localhost/api/thread?status=pending'))

    expect(mockGetThreadMessages).toHaveBeenCalledWith('pending')
  })

  it('rejects status=pending for non-admin', async () => {
    mockVerifyAuth.mockResolvedValue(null as any)
    mockIsAdmin.mockReturnValue(false)

    const response = await GET(makeRequest('http://localhost/api/thread?status=pending'))
    expect(response.status).toBe(401)
  })
})

describe('POST /api/thread', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a pending message', async () => {
    mockCreateThreadMessage.mockResolvedValue({ id: '1', content: 'Test', status: 'pending', created_at: '2026-01-01' } as any)

    const response = await POST(
      makeRequest('http://localhost/api/thread', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test' }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(mockCreateThreadMessage).toHaveBeenCalledWith('Test')
  })

  it('rejects empty content', async () => {
    const response = await POST(
      makeRequest('http://localhost/api/thread', {
        method: 'POST',
        body: JSON.stringify({ content: '' }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(response.status).toBe(400)
  })

  it('rejects content over 500 characters', async () => {
    const response = await POST(
      makeRequest('http://localhost/api/thread', {
        method: 'POST',
        body: JSON.stringify({ content: 'a'.repeat(501) }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(response.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/api-thread.test.ts`

Expected: FAIL — route module doesn't exist yet.

- [ ] **Step 3: Create the route**

Create `src/app/api/thread/route.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/api-thread.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/thread/route.ts src/__tests__/api-thread.test.ts
git commit -m "feat: add GET/POST /api/thread routes with tests"
```

### Task 4: Thread Individual Route (PATCH + DELETE)

**Files:**
- Create: `src/app/api/thread/[id]/route.ts`
- Modify: `src/__tests__/api-thread.test.ts`

- [ ] **Step 1: Rewrite test file with all tests (collection + individual routes)**

Replace the entire contents of `src/__tests__/api-thread.test.ts` with this complete file:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  getThreadMessages: vi.fn(),
  createThreadMessage: vi.fn(),
  updateThreadMessageStatus: vi.fn(),
  deleteThreadMessage: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  verifyAuth: vi.fn(),
  isAdmin: vi.fn(),
}))

import { GET, POST } from '@/app/api/thread/route'
import { PATCH, DELETE } from '@/app/api/thread/[id]/route'
import { getThreadMessages, createThreadMessage, updateThreadMessageStatus, deleteThreadMessage } from '@/lib/supabase'
import { verifyAuth, isAdmin } from '@/lib/auth'

const mockGetThreadMessages = vi.mocked(getThreadMessages)
const mockCreateThreadMessage = vi.mocked(createThreadMessage)
const mockUpdateStatus = vi.mocked(updateThreadMessageStatus)
const mockDeleteMessage = vi.mocked(deleteThreadMessage)
const mockVerifyAuth = vi.mocked(verifyAuth)
const mockIsAdmin = vi.mocked(isAdmin)

function makeRequest(url: string, options?: RequestInit) {
  return new Request(url, options) as any
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/thread', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns approved messages by default', async () => {
    const mockMessages = [
      { id: '1', content: 'Hello', status: 'approved', created_at: '2026-01-01' },
    ]
    mockGetThreadMessages.mockResolvedValue(mockMessages as any)

    const response = await GET(makeRequest('http://localhost/api/thread'))
    const data = await response.json()

    expect(mockGetThreadMessages).toHaveBeenCalledWith('approved')
    expect(data).toEqual(mockMessages)
  })

  it('returns pending messages for admin', async () => {
    mockVerifyAuth.mockResolvedValue({ role: 'admin' } as any)
    mockIsAdmin.mockReturnValue(true)
    mockGetThreadMessages.mockResolvedValue([])

    await GET(makeRequest('http://localhost/api/thread?status=pending'))

    expect(mockGetThreadMessages).toHaveBeenCalledWith('pending')
  })

  it('rejects status=pending for non-admin', async () => {
    mockVerifyAuth.mockResolvedValue(null as any)
    mockIsAdmin.mockReturnValue(false)

    const response = await GET(makeRequest('http://localhost/api/thread?status=pending'))
    expect(response.status).toBe(401)
  })
})

describe('POST /api/thread', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a pending message', async () => {
    mockCreateThreadMessage.mockResolvedValue({ id: '1', content: 'Test', status: 'pending', created_at: '2026-01-01' } as any)

    const response = await POST(
      makeRequest('http://localhost/api/thread', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test' }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(mockCreateThreadMessage).toHaveBeenCalledWith('Test')
  })

  it('rejects empty content', async () => {
    const response = await POST(
      makeRequest('http://localhost/api/thread', {
        method: 'POST',
        body: JSON.stringify({ content: '' }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(response.status).toBe(400)
  })

  it('rejects content over 500 characters', async () => {
    const response = await POST(
      makeRequest('http://localhost/api/thread', {
        method: 'POST',
        body: JSON.stringify({ content: 'a'.repeat(501) }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(response.status).toBe(400)
  })
})

describe('PATCH /api/thread/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('approves a message as admin', async () => {
    mockVerifyAuth.mockResolvedValue({ role: 'admin' } as any)
    mockIsAdmin.mockReturnValue(true)
    mockUpdateStatus.mockResolvedValue({ id: '1', content: 'Test', status: 'approved', created_at: '2026-01-01' } as any)

    const response = await PATCH(
      makeRequest('http://localhost/api/thread/1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('1')
    )
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(mockUpdateStatus).toHaveBeenCalledWith('1', 'approved')
  })

  it('rejects unauthenticated requests', async () => {
    mockVerifyAuth.mockResolvedValue(null as any)
    mockIsAdmin.mockReturnValue(false)

    const response = await PATCH(
      makeRequest('http://localhost/api/thread/1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      makeParams('1')
    )
    expect(response.status).toBe(401)
  })
})

describe('DELETE /api/thread/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes a message as admin', async () => {
    mockVerifyAuth.mockResolvedValue({ role: 'admin' } as any)
    mockIsAdmin.mockReturnValue(true)
    mockDeleteMessage.mockResolvedValue(undefined)

    const response = await DELETE(
      makeRequest('http://localhost/api/thread/1', { method: 'DELETE' }),
      makeParams('1')
    )
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(mockDeleteMessage).toHaveBeenCalledWith('1')
  })

  it('rejects unauthenticated requests', async () => {
    mockVerifyAuth.mockResolvedValue(null as any)
    mockIsAdmin.mockReturnValue(false)

    const response = await DELETE(
      makeRequest('http://localhost/api/thread/1', { method: 'DELETE' }),
      makeParams('1')
    )
    expect(response.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/api-thread.test.ts`

Expected: FAIL — `[id]/route.ts` doesn't exist yet.

- [ ] **Step 3: Create the route**

Create `src/app/api/thread/[id]/route.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/api-thread.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/thread/[id]/route.ts src/__tests__/api-thread.test.ts
git commit -m "feat: add PATCH/DELETE /api/thread/[id] routes with tests"
```

## Chunk 3: Frontend — Thread Page with 3D Carousel

### Task 5: Thread Page

**Files:**
- Create: `src/app/thread/page.tsx`

- [ ] **Step 1: Create the Thread page**

Create `src/app/thread/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { ThreadMessage } from '@/lib/supabase';

export default function ThreadPage() {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    fetch('/api/thread')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setMessages(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching thread messages:', err);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });
      if (res.ok) {
        setContent('');
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 4000);
      }
    } catch (err) {
      console.error('Error submitting message:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-xs text-zinc-600 tracking-widest uppercase">Loading</div>
      </div>
    );
  }

  const VISIBLE_COUNT = 10;
  const count = messages.length;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="p-6 lg:p-12 pb-0">
        <h1 className="text-2xl lg:text-3xl font-light text-white tracking-wide">Thread</h1>
        <p className="text-zinc-500 text-sm mt-2">Anonymous messages from visitors</p>
      </div>

      {/* 3D Carousel */}
      <div className="flex-1 flex items-center justify-center px-6">
        {count === 0 ? (
          <p className="text-zinc-600 text-sm">No messages yet. Be the first to leave one.</p>
        ) : (
          <div
            className="cylinder-container"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div
              className={`cylinder ${isPaused ? 'cylinder--paused' : ''}`}
              style={{ '--total': Math.max(count, VISIBLE_COUNT) } as React.CSSProperties}
            >
              {messages.map((msg, i) => {
                const total = Math.max(count, VISIBLE_COUNT);
                const angle = (360 / total) * i;
                return (
                  <div
                    key={msg.id}
                    className="cylinder-item"
                    style={{
                      '--angle': `${angle}deg`,
                    } as React.CSSProperties}
                  >
                    <p className="text-sm text-zinc-300 leading-relaxed">{msg.content}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Submit Form */}
      <div className="p-6 lg:p-12 pt-0">
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
          {submitted && (
            <p className="text-xs text-zinc-500 mb-3">
              Message sent. It will appear once approved.
            </p>
          )}
          <div className="flex gap-3">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Leave a message..."
              maxLength={500}
              className="flex-1 bg-transparent border border-zinc-800 text-white text-sm px-4 py-3 focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700"
            />
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="px-6 py-3 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {submitting ? '...' : 'Send'}
            </button>
          </div>
          <p className="text-xs text-zinc-700 mt-2 text-right">{content.length}/500</p>
        </form>
      </div>

      {/* CSS for 3D Cylinder */}
      <style jsx>{`
        .cylinder-container {
          perspective: 1200px;
          width: 100%;
          max-width: 500px;
          height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .cylinder-container {
            height: 300px;
            max-width: 100%;
          }
        }

        .cylinder {
          width: 100%;
          height: 60px;
          position: relative;
          transform-style: preserve-3d;
          animation: rotate-cylinder 30s linear infinite;
        }

        .cylinder--paused {
          animation-play-state: paused;
        }

        @keyframes rotate-cylinder {
          from { transform: rotateX(0deg); }
          to { transform: rotateX(-360deg); }
        }

        .cylinder-item {
          position: absolute;
          width: 100%;
          padding: 12px 20px;
          text-align: center;
          backface-visibility: hidden;
          transform: rotateX(var(--angle)) translateZ(200px);
        }

        @media (max-width: 768px) {
          .cylinder-item {
            transform: rotateX(var(--angle)) translateZ(140px);
            padding: 8px 12px;
          }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page renders**

Run the dev server and navigate to `http://localhost:3000/thread`:

```bash
cd /Users/anthonyzamot/Documents/Joar_Website/Pvre.films/photographer-site && export PATH="/Users/anthonyzamot/.nvm/versions/node/v20.9.0/bin:$PATH" && npx next dev
```

Verify: Page loads with "Thread" heading, empty state message, and submit form.

- [ ] **Step 3: Commit**

```bash
git add src/app/thread/page.tsx
git commit -m "feat: add Thread page with 3D cylinder carousel"
```

## Chunk 4: Sidebar and Admin Integration

### Task 6: Add Thread Link to Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add Thread section to sidebar**

In `src/components/layout/Sidebar.tsx`, insert a new section after the Videos section (after line 240, before the `{/* Divider */}` comment on line 242) and before the About & Contact section:

After the Videos `</div>` closing tag (line 240) and before the existing divider on line 242, add:

```tsx
          {/* Divider */}
          <div className="mb-6 border-t border-zinc-900" />

          {/* Thread Section */}
          <div className="mb-6">
            <Link
              href="/thread"
              onClick={closeMobileMenu}
              className={`
                block text-sm transition-colors duration-200
                ${isActive('/thread') ? 'text-white' : 'text-zinc-500 hover:text-white'}
              `}
            >
              Thread
            </Link>
          </div>
```

Note: The existing divider between Videos and About/Contact (line 242-243) stays. You're inserting a new divider + Thread section between the Videos `</div>` and the existing divider.

- [ ] **Step 2: Verify sidebar shows Thread link**

Refresh the dev server, check that "Thread" appears between Videos and About in the sidebar. Click it — navigates to `/thread`.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: add Thread link to sidebar navigation"
```

### Task 7: Admin Thread Moderation Page

**Files:**
- Create: `src/app/admin/thread/page.tsx`

- [ ] **Step 1: Create the admin moderation page**

Create `src/app/admin/thread/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Trash2 } from 'lucide-react';
import { ThreadMessage } from '@/lib/supabase';

export default function AdminThread() {
  const router = useRouter();
  const [pendingMessages, setPendingMessages] = useState<ThreadMessage[]>([]);
  const [approvedMessages, setApprovedMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');

  const fetchMessages = async () => {
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        fetch('/api/thread?status=pending'),
        fetch('/api/thread'),
      ]);

      if (pendingRes.status === 401) {
        router.push('/admin/login');
        return;
      }

      const pending = await pendingRes.json();
      const approved = await approvedRes.json();

      setPendingMessages(Array.isArray(pending) ? pending : []);
      setApprovedMessages(Array.isArray(approved) ? approved : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      router.push('/admin/login');
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await fetch(`/api/thread/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      fetchMessages();
    } catch (error) {
      console.error('Error approving message:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/thread/${id}`, { method: 'DELETE' });
      fetchMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-xs text-zinc-600 tracking-widest uppercase">Loading</div>
      </div>
    );
  }

  const currentMessages = activeTab === 'pending' ? pendingMessages : approvedMessages;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-900">
        <div className="px-6 lg:px-12 py-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-zinc-600 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-lg font-light text-white tracking-wide">Thread Messages</h1>
          </div>
        </div>
      </header>

      <div className="px-6 lg:px-12 py-8">
        {/* Tabs */}
        <div className="flex gap-6 mb-8 border-b border-zinc-900">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 text-sm transition-colors ${
              activeTab === 'pending'
                ? 'text-white border-b border-white'
                : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >
            Pending ({pendingMessages.length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`pb-3 text-sm transition-colors ${
              activeTab === 'approved'
                ? 'text-white border-b border-white'
                : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >
            Approved ({approvedMessages.length})
          </button>
        </div>

        {/* Messages */}
        {currentMessages.length === 0 ? (
          <p className="text-zinc-600 text-sm">
            {activeTab === 'pending' ? 'No pending messages' : 'No approved messages'}
          </p>
        ) : (
          <div className="space-y-3">
            {currentMessages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start justify-between gap-4 p-4 border border-zinc-900"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 break-words">{msg.content}</p>
                  <p className="text-xs text-zinc-700 mt-2">{formatDate(msg.created_at)}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {activeTab === 'pending' && (
                    <button
                      onClick={() => handleApprove(msg.id)}
                      className="p-2 text-green-600 hover:text-green-400 hover:bg-zinc-900 transition-colors"
                      title="Approve"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="p-2 text-red-600 hover:text-red-400 hover:bg-zinc-900 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify admin page works**

Navigate to `http://localhost:3000/admin/thread` while logged in. Verify tabs, approve/delete buttons.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/thread/page.tsx
git commit -m "feat: add admin Thread moderation page"
```

### Task 8: Dashboard Integration

**Files:**
- Modify: `src/app/admin/dashboard/page.tsx`

- [ ] **Step 1: Add Thread stats and quick action to dashboard**

In `src/app/admin/dashboard/page.tsx`:

1. Add import: `import { MessageCircle } from 'lucide-react';`

2. Add state: `const [pendingThreadCount, setPendingThreadCount] = useState(0);`

3. In the `useEffect` `Promise.all`, add a 4th fetch:

```typescript
fetch('/api/thread?status=pending').then((res) => res.json()).catch(() => []),
```

Update the `.then` handler to destructure the 4th result:

```typescript
.then(([imagesData, categoriesData, videosData, threadData]) => {
  // ... existing setters ...
  setPendingThreadCount(Array.isArray(threadData) ? threadData.length : 0);
  setLoading(false);
})
```

4. Change stats grid from `grid-cols-2 md:grid-cols-4` to `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` and add a 5th stat box after the "Published" box:

```tsx
<div className="p-6 border border-zinc-900">
  <p className="text-xs text-zinc-600 mb-2">Pending Messages</p>
  <p className="text-2xl font-light text-white">{pendingThreadCount}</p>
</div>
```

5. In the Quick Actions grid, change `lg:grid-cols-4` to `lg:grid-cols-5` and add a 5th card after the Settings card:

```tsx
<Link
  href="/admin/thread"
  className="p-6 border border-zinc-800 hover:border-zinc-600 transition-colors group"
>
  <MessageCircle size={20} className="text-zinc-600 group-hover:text-white mb-3 transition-colors" />
  <h3 className="text-sm text-white mb-1">Thread Messages</h3>
  <p className="text-xs text-zinc-600">
    Moderate anonymous messages
  </p>
</Link>
```

- [ ] **Step 2: Verify dashboard shows Thread stats and quick action**

Navigate to `/admin/dashboard`. Verify the "Pending Messages" stat and "Thread Messages" quick action card appear.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/dashboard/page.tsx
git commit -m "feat: add Thread stats and quick action to admin dashboard"
```

## Chunk 5: Build Verification

### Task 9: Run All Tests and Build

- [ ] **Step 1: Run all tests**

```bash
cd /Users/anthonyzamot/Documents/Joar_Website/Pvre.films/photographer-site && export PATH="/Users/anthonyzamot/.nvm/versions/node/v20.9.0/bin:$PATH" && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Run production build**

```bash
cd /Users/anthonyzamot/Documents/Joar_Website/Pvre.films/photographer-site && export PATH="/Users/anthonyzamot/.nvm/versions/node/v20.9.0/bin:$PATH" && npx next build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Fix any issues and commit**

If tests or build fail, fix the issues and commit the fixes.
