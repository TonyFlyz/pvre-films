# Thread Feature — Anonymous Messages with 3D Carousel

## Overview

A new "Thread" page on the public site where anonymous visitors can submit short messages. Approved messages display in a 3D rotating cylinder animation. An admin moderation page controls which messages are visible.

## Database

### `thread_messages` table

| Column       | Type          | Default              | Notes                                     |
|------------- |-------------- |--------------------- |------------------------------------------ |
| `id`         | uuid          | `gen_random_uuid()`  | Primary key                               |
| `content`    | text          | —                    | Max 500 characters (enforced in DB + API) |
| `status`     | text          | `'pending'`          | One of: `pending`, `approved`             |
| `created_at` | timestamptz   | `now()`              |                                           |

### Row-Level Security

RLS is enabled as a defense-in-depth layer. All API routes use `supabaseAdmin` (service role key) which bypasses RLS. Auth is enforced at the API route level via `verifyAuth()` + `isAdmin()`, matching every other table in this project.

- **Public read**: only rows where `status = 'approved'`
- **Public insert**: anyone can insert (anonymous submissions)
- **No public update/delete**: denied via `USING (false)` policies

No author tracking, no IPs — fully anonymous by design.

### SQL Migration

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

## API

### `GET /api/thread`

Returns approved messages ordered by `created_at` descending. No auth required.

**Response:** `ThreadMessage[]`

### `POST /api/thread`

Creates a new message with `status: 'pending'`. No auth required.

**Body:** `{ content: string }`

**Validation:**
- `content` must be a non-empty string, trimmed
- Max 500 characters

**Response:** `{ success: true }`

### `GET /api/thread?status=pending` (admin)

Returns pending messages for moderation. Requires admin auth (`verifyAuth` + `isAdmin`). The `status` query param triggers admin mode.

**Response:** `ThreadMessage[]`

### `PATCH /api/thread/[id]`

Approves a message (sets `status` to `approved`). Requires admin auth.

**Body:** `{ status: 'approved' }`

**Response:** `{ success: true }`

### `DELETE /api/thread/[id]`

Hard-deletes a message (used for rejection and removal). Requires admin auth.

**Response:** `{ success: true }`

## Supabase Helper Functions

Add to `src/lib/supabase.ts`, following the existing pattern:

### `ThreadMessage` interface

```typescript
interface ThreadMessage {
  id: string;
  content: string;
  status: 'pending' | 'approved';
  created_at: string;
}
```

### Helper functions

- `getThreadMessages(status?: string)` — Fetches messages, optionally filtered by status. Ordered by `created_at` desc.
- `createThreadMessage(content: string)` — Inserts a new pending message.
- `updateThreadMessageStatus(id: string, status: string)` — Updates status.
- `deleteThreadMessage(id: string)` — Hard-deletes a message.

## Frontend — Thread Page

**Route:** `/thread` (`src/app/thread/page.tsx`)

### Layout

- Page title "Thread" at top — light text, tracking-wide, matching gallery page style
- 3D cylinder carousel centered in viewport
- Text input + submit button fixed at the bottom
- After submit: brief confirmation "Message sent. It will appear once approved."
- **Empty state:** If no approved messages exist, show centered text: "No messages yet. Be the first to leave one."

### 3D Cylinder Animation

- Messages arranged around a vertical rotating cylinder
- CSS `perspective` and `rotateX()` transforms position each message
- Auto-rotates via CSS `@keyframes`
- ~8-10 messages visible at a time around the cylinder
- Messages on the "back" of the cylinder fade via opacity
- Each message is a simple text card — no metadata shown
- If fewer messages than slots, they spread evenly around the cylinder
- Rotation pauses on hover so users can read
- On mobile: cylinder scales down, maintains same structure

### Sidebar

New "Thread" link added in the sidebar after "Videos" and before "About", in its own section with a divider above it (matching the existing section pattern in `Sidebar.tsx`).

## Admin — Thread Moderation

**Route:** `/admin/thread` (`src/app/admin/thread/page.tsx`)

### Layout

Follows existing admin page patterns — header with back link, content below.

### Two Sections

1. **Pending** (default view) — Messages awaiting review, newest first. Each row: message text, timestamp, Approve button (green), Reject/Delete button (red).
2. **Approved** — Currently visible messages. Each row: message text, timestamp, Delete button.

Rejection = hard-delete. No `rejected` status needed — the admin either approves or deletes.

### Dashboard Integration

- Add "Thread" quick action card on admin dashboard
- Add pending message count to stats grid

## Files to Create/Modify

### New Files
- `src/app/thread/page.tsx` — Public Thread page with 3D carousel
- `src/app/api/thread/route.ts` — GET (list) + POST (submit)
- `src/app/api/thread/[id]/route.ts` — PATCH (approve) + DELETE
- `src/app/admin/thread/page.tsx` — Admin moderation page
- `supabase-thread-messages.sql` — Migration script

### Modified Files
- `src/lib/supabase.ts` — Add `ThreadMessage` interface and CRUD helpers
- `src/components/layout/Sidebar.tsx` — Add "Thread" nav link
- `src/app/admin/dashboard/page.tsx` — Add Thread stats + quick action card
