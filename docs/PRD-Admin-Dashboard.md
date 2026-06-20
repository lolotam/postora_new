# Product Requirements Document (PRD)
# Admin Dashboard - Postora

**Version:** 1.0  
**Last Updated:** January 2026  
**Product:** Postora Admin Dashboard  
**URL:** https://postora.cloud/admin

---

## Table of Contents

1. [Overview](#overview)
2. [Access Control](#access-control)
3. [Navigation Structure](#navigation-structure)
4. [Dashboard Sections](#dashboard-sections)
5. [Detailed Feature Specifications](#detailed-feature-specifications)
6. [Database Tables](#database-tables)
7. [Edge Functions](#edge-functions)
8. [Security Requirements](#security-requirements)

---

## Overview

The Admin Dashboard is a comprehensive management interface for platform administrators to monitor, manage, and control all aspects of the Postora social media management platform.

### Key Objectives
- Centralized platform management
- User and subscription administration
- System monitoring and health checks
- Content and notification management
- Analytics and reporting
- Support ticket handling

---

## Access Control

### Authentication Requirements
- User must be authenticated via Supabase Auth
- User must have `admin` role in `user_roles` table
- Role verification via `useUserRole()` hook

### Admin User
- Primary Admin Email: `dr.vet.waleedtam@gmail.com`
- Full admin access with no subscription limits

### Route Protection
```typescript
// Redirect flow
if (!user) → redirect to /auth
if (!isAdmin) → redirect to /dashboard
```

---

## Navigation Structure

### Sidebar Menu Items

| Icon | Label | Route | Priority |
|------|-------|-------|----------|
| LayoutDashboard | Dashboard | /admin | 1 |
| BarChart3 | Analytics | /admin/analytics | 2 |
| Users | Users | /admin/users | 3 |
| CreditCard | Subscriptions | /admin/subscriptions | 4 |
| Package | Plans Builder | /admin/plans | 5 |
| Sliders | Plan Quotas | /admin/plan-quotas | 6 |
| Ticket | Coupons | /admin/coupons | 7 |
| Newspaper | Blog Posts | /admin/blog | 8 |
| Bell | Notifications | /admin/notifications | 9 |
| HeartPulse | Token Health | /admin/token-health | 10 |
| ScrollText | System Logs | /admin/logs | 11 |
| Youtube | OAuth Verification | /admin/oauth | 12 |
| Settings | Settings | /admin/settings | 13 |
| Inbox | Email Inbox | /admin/inbox | 14 |
| MessageSquare | Support Messages | /admin/messages | 15 |
| Gauge | Rate Limits | /admin/rate-limits | 16 |
| Trash2 | Media Cleanup | /admin/media-cleanup | 17 |
| Rocket | Launch Checklist | /admin/launch-checklist | 18 |

---

## Dashboard Sections

### 1. Dashboard (Home)
**Route:** `/admin`  
**Purpose:** Overview of key platform metrics and recent activity

#### Features
- **Statistics Cards:**
  - Total Users count
  - Active Subscribers count
  - Monthly Revenue (MRR)
  - Open Support Messages count

- **Recent Signups:**
  - Last 5 registered users
  - Display: Avatar, Name, Email, Signup Date

- **Quick Actions:**
  - Refresh All Tokens button
  - Navigate to other sections

#### Data Sources
- `profiles` table
- `user_subscriptions` table
- `support_messages` table

---

### 2. Analytics
**Route:** `/admin/analytics`  
**Purpose:** Comprehensive platform statistics and trends

#### Features
- **Time Range Filter:** 7 days, 30 days, 90 days, 1 year

- **User Statistics:**
  - Total Users
  - New Users (in period)
  - Active Users
  - Subscribers
  - Conversion Rate

- **Charts:**
  - User Signups Trend (Line Chart)
  - Platform Distribution (Pie Chart)
  - Top API Endpoints (Bar Chart)

- **Resource Usage:**
  - Total Posts
  - Social Accounts
  - Media Files
  - Storage Used
  - System Logs count

- **API Statistics:**
  - Total Requests
  - Successful Requests
  - Error Requests
  - Success Rate %

#### Data Sources
- `profiles` table
- `posts` table
- `social_accounts` table
- `media_files` table
- `api_logs` table

---

### 3. Users Management
**Route:** `/admin/users`  
**Purpose:** View and manage all platform users

#### Features
- User search and filtering
- User list with pagination
- User details view
- Subscription status
- Account actions (suspend, delete)
- Role assignment

#### Data Sources
- `profiles` table
- `user_roles` table
- `user_subscriptions` table

---

### 4. Subscriptions
**Route:** `/admin/subscriptions`  
**Purpose:** Manage user subscriptions and AI credits

#### Features
- **Tabs:** Subscriptions | AI Credits

- **Subscription Management:**
  - MRR display
  - Active subscribers count
  - New subscriptions this month
  - Search and filter by status
  - Edit subscription details
  - Stripe portal access
  - Backfill from Stripe

- **AI Credits Management:**
  - Total credit balance
  - Average credits per user
  - Search users
  - Adjust credits (add/subtract)
  - Add credits by email
  - View credit transactions

#### Statuses
- `active`, `canceled`, `past_due`, `trialing`, `incomplete`

#### Data Sources
- `user_subscriptions` table
- `user_credits` table
- `credit_transactions` table
- `subscription_plans` table

---

### 5. Plans Builder
**Route:** `/admin/plans`  
**Purpose:** Create and manage subscription plans

#### Features
- Create new plans
- Edit existing plans
- Toggle plan active status
- Mark plan as popular
- Delete plans
- Drag-and-drop reordering

#### Plan Properties
```typescript
interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billing_period: 'monthly' | 'yearly';
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  stripe_price_id: string;
  max_profiles: number;
  max_accounts: number;
  max_posts_per_month: number;
  max_posts_per_day: number;
  max_media_per_day: number;
}
```

#### Data Sources
- `subscription_plans` table

---

### 6. Plan Quotas
**Route:** `/admin/plan-quotas`  
**Purpose:** Configure quota limits for each plan tier

#### Features
- View quotas for Free, Pro, Business plans
- Edit quota limits per plan
- Quota types:
  - Max Profiles
  - Max Accounts
  - Max Posts/Month
  - Max Posts/Day
  - Max Media/Day
  - Storage Limit

#### Data Sources
- `app_settings` table (key: `plan_quotas`)

---

### 7. Coupons
**Route:** `/admin/coupons`  
**Purpose:** Create and manage discount coupons

#### Features
- Create new coupons
- Coupon list with details
- Toggle active status
- Delete coupons
- Copy coupon code
- Usage tracking

#### Coupon Properties
```typescript
interface Coupon {
  id: string;
  code: string;
  discount_percent: number | null;
  discount_amount: number | null;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
}
```

#### Data Sources
- `coupons` table

---

### 8. Blog Posts ("What's New")
**Route:** `/admin/blog`  
**Purpose:** Manage platform announcements and blog posts

#### Features
- Create new posts
- Edit existing posts
- Schedule posts for future
- Publish/Draft/Archive status
- Rich content editor
- Cover image support
- Excerpt for previews

#### Post Properties
```typescript
interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  status: 'draft' | 'published' | 'archived';
  scheduled_at: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
}
```

#### Data Sources
- `blog_posts` table

---

### 9. Notifications
**Route:** `/admin/notifications`  
**Purpose:** Send system-wide notifications to all users

#### Features
- Create new notifications
- View existing notifications
- Delete notifications
- Notification preview

#### Notification Properties
```typescript
interface AdminNotification {
  id: string;
  title: string;
  message: string;
  created_by: string;
  created_at: string;
}
```

#### Data Sources
- `admin_notifications` table
- `user_notification_reads` table

---

### 10. Token Health
**Route:** `/admin/token-health`  
**Purpose:** Monitor OAuth token status for all connected accounts

#### Features
- Token health score (%)
- Status distribution chart
- Platform breakdown
- Refresh history logs
- Force refresh capability
- CSV export
- Auto-cleanup of old records (7+ days)
- Alert if health < 70%

#### Token Statuses
- `valid`, `expiring`, `expired`, `invalid`, `unknown`

#### Data Sources
- `social_accounts` table
- `token_refresh_history` table

---

### 11. System Logs
**Route:** `/admin/logs`  
**Purpose:** View and manage system activity logs

#### Features
- Search logs
- Filter by category
- Filter by level
- Live mode (auto-refresh)
- Delete old logs (30+ days)
- View log metadata

#### Log Levels
- `info`, `warn`, `error`, `debug`

#### Log Categories
- `auth`, `post`, `media`, `subscription`, `system`, `api`, `oauth`

#### Data Sources
- `system_logs` table

---

### 12. OAuth Verification
**Route:** `/admin/oauth`  
**Purpose:** Track OAuth app verification requirements per platform

#### Features
- Platform-specific checklists:
  - Google (YouTube)
  - TikTok
  - Pinterest
  - LinkedIn
  - Facebook
  - Instagram
  - Twitter/X
  - Reddit
  - Bluesky

- Progress tracking per platform
- Resource links
- Documentation links
- Reset all progress

#### Data Persistence
- `localStorage` for checklist progress

---

### 13. Settings
**Route:** `/admin/settings`  
**Purpose:** Configure application-wide settings

#### Features

**General Settings:**
- App name configuration
- Maintenance mode toggle

**Feature Flags:**
| Flag | Description |
|------|-------------|
| feature_video_compress | Video Compression |
| feature_tiktok_transcode | TikTok Transcode |
| feature_image_crop | Image Cropping |
| feature_ai_caption | AI Caption Generation |
| feature_ai_hashtags | AI Hashtag Suggestions |
| feature_ai_thumbnails | AI Thumbnail Generation |
| feature_ai_image | AI Image Generation |

**AI Settings:**
- AI Provider selection (Google AI Studio, OpenRouter)
- AI Model selection
- Model testing

**Platform Integrations:**
- TikTok Sandbox Mode toggle

**Audit Log:**
- Feature flag change history
- Who changed, when, old/new values

**User Overrides:**
- Feature overrides per user
- AI model overrides per user
- Expiration dates

**Scheduling:**
- Schedule feature flag changes
- View pending schedules
- View executed schedules

#### Data Sources
- `app_settings` table
- `feature_flag_audit_log` table
- `feature_flag_schedules` table
- `user_feature_overrides` table
- `user_ai_overrides` table

---

### 14. Email Inbox
**Route:** `/admin/inbox`  
**Purpose:** Manage emails for admin@postora.cloud and support@postora.cloud

#### Features

**Inbox Tab:**
- View received emails
- Search messages
- Filter by direction (inbound/outbound)
- Threaded conversation view
- Mark as read/unread
- Reply to emails
- Sync status

**Drafts Tab:**
- Manage email drafts
- Edit drafts
- Send drafts
- Delete drafts

**Scheduled Tab:**
- View scheduled emails
- Edit scheduled emails
- Cancel scheduled emails

**Compose:**
- Rich text editor
- Email signatures
- Templates
- Attachments
- CC/BCC support
- Schedule send

#### Data Sources
- `admin_inbox_messages` table
- `email_drafts` table
- `scheduled_emails` table
- `email_signatures` table
- `email_templates` table
- `email_contacts` table

---

### 15. Support Messages
**Route:** `/admin/messages`  
**Purpose:** Handle user support requests

#### Features
- View all support messages
- Filter: Open vs Previous
- Reply to messages
- Close tickets
- Status management

#### Message Statuses
- `open`, `in_progress`, `resolved`, `closed`

#### Data Sources
- `support_messages` table
- `profiles` table

---

### 16. Rate Limits
**Route:** `/admin/rate-limits`  
**Purpose:** Configure API rate limiting

#### Features

**Tabs:**
1. **Subscription Tiers** - Rate limits per plan
2. **Global Defaults** - Default rate limits
3. **User Overrides** - Per-user custom limits

#### Rate Limit Properties
```typescript
interface RateLimitSetting {
  id: string;
  endpoint: string;
  display_name: string;
  max_requests: number;
  window_minutes: number;
  is_active: boolean;
}
```

#### Endpoints
- `generate-caption`
- `generate-hashtags`
- `generate-image`
- `process-post`

#### Data Sources
- `rate_limit_settings` table
- `tier_rate_limits` table
- `user_rate_limits` table

---

### 17. Media Cleanup
**Route:** `/admin/media-cleanup`  
**Purpose:** Find and remove orphaned media files

#### Features
- Scan for orphaned files in Cloudinary
- Dry run mode (preview only)
- Configure max files to scan
- Configure age threshold (days)
- Preview orphaned files
- Delete orphaned files
- View cleanup results

#### Settings
- `dryRun`: boolean
- `maxFiles`: number (default: 100)
- `olderThanDays`: number (default: 30)

#### Data Sources
- `media_files` table
- Cloudinary API (via Edge Function)

---

### 18. Launch Checklist
**Route:** `/admin/launch-checklist`  
**Purpose:** Track production readiness

#### Features
- Categorized checklist items
- Progress tracking
- Priority badges (critical, high, medium, low)
- Reset progress
- Documentation links

#### Categories
| Category | Icon | Items |
|----------|------|-------|
| Security | Shield | RLS, Auth, Secrets, CORS, 2FA |
| Database | Database | Backups, Indexes, Migrations |
| Infrastructure | Server | Edge Functions, Monitoring, CDN |
| Monitoring | Activity | Error tracking, Logging, Alerts |
| Payments | CreditCard | Stripe webhooks, Billing |
| Legal | Scale | Privacy Policy, Terms, GDPR |
| Performance | Zap | Load testing, Caching, Optimization |

#### Data Persistence
- `localStorage` for checklist progress

---

## Detailed Feature Specifications

### AI Usage Analytics
**Location:** Admin Settings → AI Settings

#### Features
- Daily usage charts (Captions, Hashtags)
- Monthly trends
- Cost estimation
- Token usage tracking
- Model comparison

#### Metrics
- Captions generated
- Hashtags generated
- Estimated tokens used
- Estimated costs (by model)

---

### Theme Selector
**Location:** Admin Settings → General

#### Dark Theme Variants
1. `black` - Classic Black
2. `dark-blue` - Futuristic Blue
3. `neon-purple` - Neon Purple
4. `neon-green` - Neon Green

---

## Database Tables

### Core Admin Tables

```sql
-- User roles for access control
user_roles (
  id, user_id, role, created_at
)

-- Application settings (key-value store)
app_settings (
  id, key, value, description, updated_by, created_at, updated_at
)

-- Feature flag audit trail
feature_flag_audit_log (
  id, feature_key, old_value, new_value, changed_by, change_type, notes, created_at
)

-- Scheduled feature flag changes
feature_flag_schedules (
  id, feature_key, scheduled_value, scheduled_at, status, executed_at, created_by, created_at
)

-- Admin notifications
admin_notifications (
  id, title, message, created_by, created_at
)

-- Support messages
support_messages (
  id, user_id, subject, message, status, admin_reply, created_at, updated_at
)

-- Email inbox
admin_inbox_messages (
  id, thread_id, from_email, to_email, subject, body, html_body, 
  direction, status, is_read, attachments, metadata, created_at
)

-- API logs
api_logs (
  id, user_id, endpoint, method, status_code, request_data, 
  response_data, ip_address, user_agent, created_at
)

-- System logs
system_logs (
  id, level, category, message, source, metadata, created_at
)
```

---

## Edge Functions

### Admin-Related Functions

| Function | Purpose |
|----------|---------|
| `refresh-tokens` | Force refresh all OAuth tokens |
| `send-admin-email` | Send emails from admin addresses |
| `generate-caption` | AI caption generation |
| `generate-hashtags` | AI hashtag generation |
| `scan-orphaned-media` | Find orphaned Cloudinary files |
| `cleanup-media` | Delete orphaned media files |
| `process-scheduled-emails` | Send scheduled emails |

---

## Security Requirements

### Authentication
- ✅ All admin routes require authentication
- ✅ Admin role verification on every request
- ✅ Session management via Supabase Auth

### Authorization
- ✅ Role-based access control (RBAC)
- ✅ Admin-only mutations
- ✅ RLS policies on all tables

### Data Protection
- ✅ Sensitive data encryption
- ✅ Secure API key storage
- ✅ Audit logging for all changes

### Rate Limiting
- ✅ API rate limiting per endpoint
- ✅ Per-tier rate limits
- ✅ Abuse prevention

---

## UI Components

### Layout
- `AdminLayout` - Main admin layout wrapper
- Sidebar navigation with icons
- Header with page title
- Theme toggle

### Common Components
- `Card` - Content containers
- `Table` - Data display
- `Dialog` - Modal dialogs
- `AlertDialog` - Confirmation dialogs
- `Tabs` - Tabbed content
- `Badge` - Status indicators
- `Button` - Actions
- `Input` - Form inputs
- `Select` - Dropdowns
- `Switch` - Toggles
- `ScrollArea` - Scrollable containers

### Charts (Recharts)
- `LineChart` - Trends
- `BarChart` - Comparisons
- `PieChart` - Distribution
- `AreaChart` - Cumulative data

---

## Technical Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query (data fetching)
- Framer Motion (animations)
- Recharts (data visualization)
- React Router v6 (routing)

### Backend
- Supabase (PostgreSQL + Auth + Storage)
- Edge Functions (Deno)
- Resend (email sending)

### External Services
- Stripe (payments)
- Cloudinary (media storage)
- OpenRouter / Google AI (AI features)

---

## Appendix

### Admin Email Addresses
- `admin@postora.cloud` - Primary admin
- `support@postora.cloud` - Support inbox

### Key Settings Keys
```
ai_provider
ai_model
maintenance_mode
feature_video_compress
feature_tiktok_transcode
feature_image_crop
feature_ai_caption
feature_ai_hashtags
feature_ai_thumbnails
feature_ai_image
tiktok_sandbox_mode
dark_theme_variant
plan_quotas
```

---

*Document maintained by Postora Development Team*
