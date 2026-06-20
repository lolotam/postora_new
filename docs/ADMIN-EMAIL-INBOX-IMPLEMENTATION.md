# Admin Email Inbox — Complete Implementation Guide

> **Purpose**: This document contains every file, edge function, database table, Resend configuration, and hook needed to implement the Admin Email Inbox feature from scratch. Copy/paste ready for a new project.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Supabase Secrets Required](#3-supabase-secrets-required)
4. [Resend.com Configuration](#4-resendcom-configuration)
5. [Edge Functions (Backend)](#5-edge-functions-backend)
6. [Hooks (Data Layer)](#6-hooks-data-layer)
7. [Frontend Components](#7-frontend-components)
8. [Storage Bucket](#8-storage-bucket)
9. [config.toml](#9-configtoml)
10. [File Tree Summary](#10-file-tree-summary)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                                                                 │
│  AdminInbox.tsx ─┬─ ThreadedMessageList ─ ThreadDetail          │
│                  ├─ ComposeEmail (reply/forward/draft/schedule)  │
│                  ├─ DraftsManager                               │
│                  ├─ ScheduledEmailsManager                      │
│                  └─ TestEmailButton                             │
│                                                                 │
│  Sub-components:                                                │
│    RichTextEditor, AIWriteAssistant, EmailAutocomplete,         │
│    EmailAttachments, EmailScheduler, EmailSignatureManager,     │
│    EmailTemplateManager, EmailPreviewDialog,                    │
│    SaveAsTemplateDialog, SubscriberSelector,                    │
│    DeliveryStatusBadge                                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ supabase.functions.invoke()
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTIONS (Deno)                         │
│                                                                 │
│  send-inbox-email ──────► Resend API POST /emails               │
│  resend-webhook ◄──────── Resend Webhooks (inbound + tracking)  │
│  fetch-email-content ───► Resend Receiving API                  │
│  ai-email-assistant ────► Lovable AI Gateway                    │
│  sync-resend-delivery ──► Resend GET /emails/:id                │
│  process-scheduled ─────► Resend API (cron-triggered)           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                             │
│                                                                 │
│  admin_inbox_messages    (core inbox table)                      │
│  email_drafts            (auto-saved drafts)                    │
│  email_signatures        (reusable signatures)                  │
│  email_templates         (reusable email templates)             │
│  email_contacts          (autocomplete contacts)                │
│  scheduled_emails        (scheduled send queue)                 │
│  email_log               (delivery tracking)                    │
│                                                                 │
│  Storage: email-attachments (public bucket)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema

### 2.1 `admin_inbox_messages` (Core Table)

```sql
CREATE TABLE public.admin_inbox_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  html_body TEXT,
  direction TEXT NOT NULL DEFAULT 'inbound',       -- 'inbound' | 'outbound'
  status TEXT NOT NULL DEFAULT 'received',          -- received|sent|delivered|bounced|complaint|replied|failed|processing
  is_read BOOLEAN NOT NULL DEFAULT false,
  admin_id UUID,                                    -- who sent (for outbound)
  resend_id TEXT,                                   -- Resend email ID for tracking
  reply_to_id UUID REFERENCES admin_inbox_messages(id),
  thread_id TEXT,                                   -- groups conversations
  message_type TEXT NOT NULL DEFAULT 'email',
  attachments JSONB,                                -- [{id, filename, content_type, size, url}]
  metadata JSONB,                                   -- {cc, bcc, open_count, click_count, raw_event...}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_inbox_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins can access
CREATE POLICY "Admins can manage inbox messages"
  ON public.admin_inbox_messages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

### 2.2 `email_drafts`

```sql
CREATE TABLE public.email_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  from_email TEXT NOT NULL,
  to_emails TEXT[],
  cc_emails TEXT[],
  bcc_emails TEXT[],
  subject TEXT,
  body TEXT,
  html_body TEXT,
  attachments JSONB,
  reply_to_message_id UUID REFERENCES admin_inbox_messages(id),
  signature_id UUID REFERENCES email_signatures(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage drafts"
  ON public.email_drafts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

### 2.3 `email_signatures`

```sql
CREATE TABLE public.email_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage signatures"
  ON public.email_signatures FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

### 2.4 `email_templates`

```sql
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage templates"
  ON public.email_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

### 2.5 `email_contacts`

```sql
CREATE TABLE public.email_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  admin_id UUID,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage contacts"
  ON public.email_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

### 2.6 `scheduled_emails`

```sql
CREATE TABLE public.scheduled_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  cc_email TEXT,
  bcc_email TEXT,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  attachments JSONB,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',    -- pending|processing|sent|failed|cancelled
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  reply_to_message_id UUID REFERENCES admin_inbox_messages(id),
  signature_id UUID REFERENCES email_signatures(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage scheduled emails"
  ON public.scheduled_emails FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

---

## 3. Supabase Secrets Required

| Secret Name | Source | Purpose |
|---|---|---|
| `RESEND_API_KEY` | resend.com → API Keys | Send emails, fetch inbound content |
| `RESEND_WEBHOOK_SECRET` | resend.com → Webhooks → Signing Secret | Verify webhook signatures (Svix) |
| `LOVABLE_API_KEY` | Lovable platform | AI email writing assistant |
| `SUPABASE_URL` | Auto-configured | Database access |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-configured | Service-level DB access |
| `SUPABASE_ANON_KEY` | Auto-configured | Client auth verification |

---

## 4. Resend.com Configuration

### 4.1 Domain Setup

1. Go to **resend.com → Domains → Add Domain**
2. Add your domain (e.g., `postora.cloud`)
3. Add the DNS records Resend provides:
   - **MX record**: For receiving emails
   - **SPF record**: `v=spf1 include:amazonses.com ~all`
   - **DKIM record**: Provided by Resend
4. Wait for DNS verification (can take up to 72 hours)

### 4.2 Sending Addresses

Configure two "from" addresses:
- `admin@yourdomain.com`
- `support@yourdomain.com`

### 4.3 Inbound Email (Receiving)

1. Go to **Resend Dashboard → Receiving**
2. Add MX record: `inbound-smtp.resend.com` priority `10`
3. Configure receiving endpoint: your edge function webhook URL

### 4.4 Webhook Configuration

1. Go to **Resend Dashboard → Webhooks → Add Webhook**
2. **Endpoint URL**: `https://<project-ref>.supabase.co/functions/v1/resend-webhook`
3. **Events to subscribe**:
   - `email.received` — Inbound emails
   - `email.sent` — Outbound sent confirmation
   - `email.delivered` — Delivery confirmation
   - `email.bounced` — Bounce notification
   - `email.complained` — Spam complaint
   - `email.opened` — Open tracking
   - `email.clicked` — Click tracking
4. **Copy the Signing Secret** → Save as `RESEND_WEBHOOK_SECRET` in Supabase secrets

### 4.5 API Key

1. Go to **Resend Dashboard → API Keys → Create API Key**
2. Permission: **Full access** (sending + receiving)
3. Save as `RESEND_API_KEY` in Supabase secrets

---

## 5. Edge Functions (Backend)

### 5.1 `send-inbox-email/index.ts`

**Purpose**: Send outbound emails via Resend API. Handles immediate send and scheduled send.

**Location**: `supabase/functions/send-inbox-email/index.ts`

**Flow**:
1. Verify JWT auth → check admin role
2. If `scheduledAt` is in the future → insert into `scheduled_emails` table
3. Otherwise → POST to `https://api.resend.com/emails`
4. Store outbound message in `admin_inbox_messages` (direction: outbound)
5. If reply → set `thread_id` and update original message status to "replied"
6. Save email contacts for autocomplete

**Request Body**:
```typescript
interface SendEmailRequest {
  to: string;
  cc?: string[];
  bcc?: string[];
  from?: "admin@postora.cloud" | "support@postora.cloud";
  subject: string;
  html: string;
  text?: string;
  replyToMessageId?: string;
  attachments?: Array<{ filename: string; path: string }>;
  scheduledAt?: string;  // ISO date string
}
```

---

### 5.2 `resend-webhook/index.ts`

**Purpose**: Receive Resend webhook events for inbound emails and delivery tracking.

**Location**: `supabase/functions/resend-webhook/index.ts`

**Config**: Must have `verify_jwt = false` in config.toml (webhooks have no JWT)

**Flow**:
1. Verify Svix webhook signature using `RESEND_WEBHOOK_SECRET`
2. Parse event type:
   - `email.received` → Fetch full content from Resend Receiving API → Insert into `admin_inbox_messages`
   - `email.sent` → Update status to "sent"
   - `email.delivered` → Update status to "delivered"
   - `email.bounced` → Update status to "bounced"
   - `email.complained` → Update status to "complaint"
   - `email.opened` → Increment open_count in metadata
   - `email.clicked` → Increment click_count in metadata
3. For inbound: fetch body from `GET /emails/receiving/{email_id}` and attachments from `GET /emails/receiving/{email_id}/attachments`
4. Upload attachments to `email-attachments` storage bucket

**CRITICAL**: Add to `supabase/config.toml`:
```toml
[functions.resend-webhook]
verify_jwt = false
```

---

### 5.3 `fetch-email-content/index.ts`

**Purpose**: Manually fetch email content from Resend when webhook didn't capture the body.

**Location**: `supabase/functions/fetch-email-content/index.ts`

**Flow**:
1. Auth check (JWT)
2. Get message from DB by `messageId`
3. Extract `resend_id` (from column or metadata)
4. `GET https://api.resend.com/emails/receiving/{resend_id}` for body
5. `GET https://api.resend.com/emails/receiving/{resend_id}/attachments` for attachments
6. Upload attachments to storage, update message in DB

---

### 5.4 `ai-email-assistant/index.ts`

**Purpose**: AI-powered email writing/rewriting using Lovable AI Gateway.

**Location**: `supabase/functions/ai-email-assistant/index.ts`

**Flow**:
1. Receive action (generate/rewrite/improve), style, outputFormat, template
2. Build system prompt with tone instructions + optional HTML template
3. Call `https://ai.gateway.lovable.dev/v1/chat/completions` with `LOVABLE_API_KEY`
4. Return generated content (plain text or styled HTML)

**Supported Tones**: professional, friendly, funny, formal, casual, persuasive

**HTML Templates**: minimal, modern, newsletter, announcement

---

### 5.5 `sync-resend-delivery-status/index.ts`

**Purpose**: Fallback sync — polls Resend API for delivery statuses when webhooks miss events.

**Location**: `supabase/functions/sync-resend-delivery-status/index.ts`

**Flow**:
1. Auth + admin check
2. Query `admin_inbox_messages` where direction=outbound AND status IN (sent, processing)
3. For each: `GET https://api.resend.com/emails/{resend_id}`
4. Map Resend status → inbox status, update DB

---

### 5.6 `process-scheduled-emails/index.ts`

**Purpose**: Process and send scheduled emails when their time arrives.

**Location**: `supabase/functions/process-scheduled-emails/index.ts`

**Flow**:
1. Query `scheduled_emails` where status=pending AND scheduled_at <= now()
2. For each: mark as processing → send via Resend → store in inbox → mark as sent
3. Handle failures: mark as failed with error message

**Trigger**: Should be called via pg_cron every minute:
```sql
SELECT cron.schedule(
  'process-scheduled-emails',
  '* * * * *',
  $$SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/process-scheduled-emails',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
  )$$
);
```

---

## 6. Hooks (Data Layer)

### 6.1 `useAdminInbox.ts`

**Location**: `src/hooks/useAdminInbox.ts`

**Returns**:
```typescript
{
  messages: InboxMessage[];
  unreadCount: number;
  isLoading: boolean;
  isRefetching: boolean;
  error: string | undefined;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteMessage: (id: string) => void;
  syncDeliveryStatuses: () => void;
  isSyncingDeliveryStatuses: boolean;
  refetch: () => void;
}
```

**Features**:
- Auto-refresh every 10 seconds
- Supabase Realtime subscription for INSERT/UPDATE on `admin_inbox_messages`
- Toast notifications for new inbound emails and delivery status changes
- Mark as read, mark all as read, delete mutations

### 6.2 `useAdminEmailNotifications.ts`

**Location**: `src/hooks/useAdminEmailNotifications.ts`

**Purpose**: Lightweight notification hook for the admin sidebar badge.

**Returns**: `{ emails, unreadCount, isLoading, markAsRead }`

**Features**:
- Fetches last 20 inbound emails
- Realtime subscription for new inbound emails
- Browser push notifications via `useAdminEmailPushNotifications`

---

## 7. Frontend Components

### 7.1 Page: `AdminInbox.tsx`

**Location**: `src/pages/admin/AdminInbox.tsx`

Wraps in `AdminLayout`, renders the `AdminInbox` component.

### 7.2 Main Component: `AdminInbox.tsx`

**Location**: `src/components/admin/inbox/AdminInbox.tsx` (~280 lines)

**Features**:
- 3-tab layout: **Inbox** | **Drafts** | **Scheduled**
- Message filter: All / Received / Sent
- Search bar (sender, subject, content)
- Action buttons: Compose, Test Email, Sync Status, Mark All Read, Refresh
- Split pane: ThreadedMessageList (1/3) + ThreadDetail (2/3)

### 7.3 `ThreadedMessageList.tsx` (~228 lines)

Groups messages into threads by `thread_id` or `reply_to_id`. Shows:
- Direction icon (inbound blue / outbound green)
- Unread dot
- Thread count badge
- Delivery status badge
- Attachment icon
- Date

### 7.4 `ThreadDetail.tsx` (~397 lines)

Shows all messages in a thread with collapsible sections:
- Thread header with subject, message count, date
- Expand all / Collapse buttons
- Each message: direction icon, sender/recipient, timestamp, attachments, HTML/text body
- Action buttons: Reply, Forward/Resend, Delete (with confirmation dialog)

### 7.5 `ComposeEmail.tsx` (~799 lines)

Full-featured email composer dialog:
- **From address** selector (admin@, support@)
- **To/CC/BCC** with `EmailAutocomplete` and `SubscriberSelector`
- **Subject** with `EmailTemplateManager`
- **Rich text body** with `RichTextEditor`
- **AI assistant** (generate + rewrite)
- **Attachments** with drag-and-drop upload
- **Schedule send** with date/time picker
- **Email signatures** with insert at cursor/end
- **Preview** (desktop/tablet/mobile)
- **Save as template**
- **Auto-save drafts** every 30 seconds
- Exposed via `ref`: `openReply()`, `openForward()`, `openDraft()`

### 7.6 `ReplyForm.tsx` (~221 lines)

Inline reply form (alternative to ComposeEmail reply mode):
- From address selector
- Subject (auto-prefixed with "Re:")
- Rich text editor with AI assist
- Attachments
- Quoted original message

### 7.7 `MessageDetail.tsx` (~336 lines)

Single message detail view (used before threading was added):
- Full header with status badges
- Attachments with download links
- HTML body rendering or plain text
- "Fetch content from Resend" button for missing content
- Reply and Forward action buttons

### 7.8 `MessageList.tsx` (~126 lines)

Simple flat message list (used before threading was added).

### 7.9 `RichTextEditor.tsx` (~401 lines)

ContentEditable-based rich text editor:
- **Toolbar**: Undo/Redo, Font family, Font size, Bold/Italic/Underline/Strikethrough
- **Colors**: Text color picker, Highlight color picker
- **Alignment**: Left/Center/Right/Justify
- **Lists**: Bullet/Numbered
- **Link** insertion
- **HTML code mode** toggle (visual ↔ code)
- Keyboard shortcuts: Ctrl+B, Ctrl+I, Ctrl+U
- Exposed ref: `insertHtmlAtCursor()`, `focus()`

### 7.10 `AIWriteAssistant.tsx` (~274 lines)

AI-powered email writing dialog:
- **Mode**: Generate (from prompt) or Rewrite (improve existing)
- **Output format**: Plain Text or HTML Template
- **HTML templates**: Minimal, Modern, Newsletter, Announcement
- **Tone**: Professional, Friendly, Funny, Formal, Casual, Persuasive
- Calls `ai-email-assistant` edge function

### 7.11 `EmailAutocomplete.tsx` (~245 lines)

Email input with autocomplete:
- Queries `email_contacts` table as you type
- Badge display for added emails
- Keyboard navigation (Enter/Tab/Comma to add, Backspace to remove)
- Auto-saves new contacts on use
- Suggestion dropdown with name + email

### 7.12 `EmailAttachments.tsx` (~227 lines)

Drag-and-drop file attachment:
- Upload to `email-attachments` Supabase storage bucket
- File type restrictions (images, PDFs, docs, spreadsheets, text)
- Max 5 files, max 10MB each
- Progress indicator
- File type icons

### 7.13 `EmailScheduler.tsx` (~186 lines)

Schedule send date/time picker:
- Calendar date picker (no past dates)
- Time input
- Auto-rounds to next 15-minute slot
- Visual display of scheduled time with clear button

### 7.14 `EmailSignatureManager.tsx` (~349 lines)

Manage email signatures:
- CRUD for signatures (name, HTML content, is_default)
- Signature selector dropdown
- Set default signature
- `useDefaultSignature()` hook exported

### 7.15 `EmailTemplateManager.tsx` (~339 lines)

Manage reusable email templates:
- CRUD for templates (name, subject, body with RichTextEditor)
- Template selector dropdown
- "Save current as template" option
- Apply template to compose form

### 7.16 `EmailPreviewDialog.tsx` (~155 lines)

Email preview in simulated email client:
- Desktop / Tablet / Mobile viewport modes
- Renders email in sandboxed iframe
- Shows from address, subject, body

### 7.17 `SaveAsTemplateDialog.tsx` (~139 lines)

Quick save current compose content as a reusable template.

### 7.18 `SubscriberSelector.tsx` (~298 lines)

Select email recipients from existing users:
- **Tabs**: Paid Subscribers | All Users
- Search filter
- Checkbox multi-select with "Select All"
- Shows plan name and subscription status
- Deduplication

### 7.19 `TestEmailButton.tsx` (~218 lines)

Send a test email to verify delivery:
- Enter recipient email
- Sends styled test email via `send-inbox-email`
- Shows success/failure result with Resend dashboard link

### 7.20 `DeliveryStatusBadge.tsx` (~228 lines)

Visual status indicators:
- **Status icons**: Sent (processing), Delivered ✓, Bounced ✗, Spam ⚠, Replied 💬
- **Open tracking**: Eye icon with count + first opened timestamp
- **Click tracking**: Pointer icon with count + first clicked timestamp
- Tooltips with descriptions

### 7.21 `DraftsManager.tsx` (~243 lines)

Manage saved email drafts:
- Split pane: draft list + detail view
- Shows recipient, subject, body preview, last edited date
- "Continue Editing" opens draft in ComposeEmail
- Delete with confirmation

### 7.22 `ScheduledEmailsManager.tsx` (~515 lines)

Manage scheduled emails:
- **Pending section**: upcoming emails with Send Now / Edit / Cancel actions
- **History section**: sent, failed, cancelled with retry option
- Edit dialog: change subject and scheduled time
- Cancel/Delete with confirmation
- Status badges: Pending, Processing, Sent, Failed, Cancelled

---

## 8. Storage Bucket

```sql
-- Create public bucket for email attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-attachments', 'email-attachments', true);

-- Public read access
CREATE POLICY "Email attachments are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'email-attachments');

-- Authenticated upload
CREATE POLICY "Authenticated users can upload email attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'email-attachments');

-- Authenticated delete
CREATE POLICY "Authenticated users can delete email attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'email-attachments');
```

---

## 9. config.toml

Add to `supabase/config.toml`:

```toml
[functions.resend-webhook]
verify_jwt = false

[functions.process-scheduled-emails]
verify_jwt = false
```

All other inbox edge functions use JWT verification in code (not config.toml).

---

## 10. File Tree Summary

```
src/
├── pages/admin/
│   └── AdminInbox.tsx                          # Page wrapper
├── components/admin/inbox/
│   ├── AdminInbox.tsx                          # Main inbox component (280 lines)
│   ├── ThreadedMessageList.tsx                 # Thread grouping + list (228 lines)
│   ├── ThreadDetail.tsx                        # Thread conversation view (397 lines)
│   ├── ComposeEmail.tsx                        # Full email composer (799 lines ⚠️)
│   ├── ReplyForm.tsx                           # Inline reply form (221 lines)
│   ├── MessageDetail.tsx                       # Single message detail (336 lines)
│   ├── MessageList.tsx                         # Flat message list (126 lines)
│   ├── RichTextEditor.tsx                      # WYSIWYG editor (401 lines)
│   ├── AIWriteAssistant.tsx                    # AI writing dialog (274 lines)
│   ├── EmailAutocomplete.tsx                   # Email input autocomplete (245 lines)
│   ├── EmailAttachments.tsx                    # Drag-drop attachments (227 lines)
│   ├── EmailScheduler.tsx                      # Schedule send picker (186 lines)
│   ├── EmailSignatureManager.tsx               # Signature CRUD (349 lines)
│   ├── EmailTemplateManager.tsx                # Template CRUD (339 lines)
│   ├── EmailPreviewDialog.tsx                  # Email preview (155 lines)
│   ├── SaveAsTemplateDialog.tsx                # Quick save template (139 lines)
│   ├── SubscriberSelector.tsx                  # User/subscriber picker (298 lines)
│   ├── TestEmailButton.tsx                     # Test email delivery (218 lines)
│   ├── DeliveryStatusBadge.tsx                 # Status icons (228 lines)
│   ├── DraftsManager.tsx                       # Draft management (243 lines)
│   └── ScheduledEmailsManager.tsx              # Scheduled emails (515 lines ⚠️)
├── hooks/
│   ├── useAdminInbox.ts                        # Main inbox data hook (217 lines)
│   ├── useAdminEmailNotifications.ts           # Notification badge hook (124 lines)
│   └── usePushNotifications.tsx                # Browser push notifications (lines 134-168)
│
supabase/functions/
├── send-inbox-email/index.ts                   # Send outbound emails (291 lines)
├── resend-webhook/index.ts                     # Receive webhooks (601 lines ⚠️)
├── fetch-email-content/index.ts                # Fetch missing content (358 lines)
├── ai-email-assistant/index.ts                 # AI writing assistant (201 lines)
├── sync-resend-delivery-status/index.ts        # Poll delivery statuses (256 lines)
└── process-scheduled-emails/index.ts           # Process scheduled queue (220 lines)
```

> ⚠️ Files marked with ⚠️ exceed 500 lines and should be refactored when porting to a new project.

---

## Key Integration Points

### Realtime Subscriptions
- `useAdminInbox` subscribes to `postgres_changes` on `admin_inbox_messages` table
- `useAdminEmailNotifications` subscribes to INSERT (inbound) and UPDATE events

### Query Keys (TanStack Query)
- `["admin-inbox-messages"]` — All inbox messages
- `["admin-email-notifications"]` — Notification badge
- `["email-drafts"]` — Drafts list
- `["email-drafts-count"]` — Draft count badge
- `["email-signatures"]` — Signatures list
- `["email-signatures", "default"]` — Default signature
- `["email-templates"]` — Templates list
- `["email-contacts", inputValue]` — Autocomplete contacts
- `["scheduled-emails"]` — Scheduled emails
- `["all-users-for-email"]` — All users for subscriber selector
- `["paid-subscribers-for-email"]` — Paid subscribers for selector

### From Addresses
Configured as constants in `ComposeEmail.tsx` and `ReplyForm.tsx`:
```typescript
const FROM_ADDRESSES = [
  { value: "admin@postora.cloud", label: "admin@postora.cloud" },
  { value: "support@postora.cloud", label: "support@postora.cloud" },
];
```

Change these to match your domain.

---

*End of Admin Email Inbox Implementation Guide*
