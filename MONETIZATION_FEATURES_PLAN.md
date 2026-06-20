# Monetization Features — Detailed Implementation Plan

This document provides the full technical implementation plan for 7 new revenue-generating features that leverage Postora's existing 33 Meta permissions.

---

## Feature 1: Comment Manager (Unified Inbox)

### Overview
A unified inbox for managing Facebook Page comments and Instagram post comments — reply, hide, delete, and analyze sentiment.

### Permissions Used
- `instagram_manage_comments` / `instagram_business_manage_comments`
- `pages_manage_engagement`
- `pages_read_user_content`

### Revenue Model
- Pro/Business tier feature
- Free tier: view-only (no reply/hide/delete)

### New Files

| File | Purpose |
|------|---------|
| `src/pages/messaging/CommentInbox.tsx` | Page with FB + IG comment streams |
| `src/components/comments/CommentList.tsx` | Threaded comment view with reply/hide/delete actions |
| `src/components/comments/CommentFilters.tsx` | Filter by platform, sentiment, date, post |
| `src/hooks/useCommentInbox.ts` | Fetch/reply/hide/delete mutations via TanStack Query |
| `supabase/functions/comment-manager/index.ts` | Edge function with Graph API actions |

### Edge Function Actions

| Action | Graph API Endpoint | Method |
|--------|-------------------|--------|
| `get_page_comments` | `GET /{page_id}/feed?fields=comments{...}` | Fetch all page post comments |
| `get_ig_comments` | `GET /{ig_user_id}/media?fields=comments{...}` | Fetch all IG post comments |
| `reply_comment` | `POST /{comment_id}/replies` | Reply to a comment |
| `hide_comment` | `POST /{comment_id}?is_hidden=true` | Hide a comment |
| `delete_comment` | `DELETE /{comment_id}` | Delete a comment |

### Database Migration

```sql
CREATE TABLE public.comment_inbox_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform TEXT NOT NULL, -- 'facebook' or 'instagram'
  social_account_id UUID NOT NULL,
  post_id TEXT NOT NULL,
  comment_id TEXT NOT NULL UNIQUE,
  author_name TEXT,
  author_id TEXT,
  message TEXT,
  sentiment TEXT, -- 'positive', 'negative', 'neutral'
  is_hidden BOOLEAN DEFAULT false,
  is_reply BOOLEAN DEFAULT false,
  parent_comment_id TEXT,
  comment_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Routing
- Add `/comments` route in App.tsx
- Add sidebar menu item under "Engagement" section

---

## Feature 2: Lead Forms CRM

### Overview
Sync Facebook Lead Ads form submissions into a built-in CRM with a status pipeline (New → Contacted → Qualified → Won/Lost), notes, and export.

### Permissions Used
- `leads_retrieval`
- `pages_manage_metadata`

### Revenue Model
- $10-30/mo add-on or Business tier exclusive
- Free trial: first 50 leads free

### New Files

| File | Purpose |
|------|---------|
| `src/pages/LeadsCRM.tsx` | Leads list with Kanban pipeline view |
| `src/components/leads/LeadCard.tsx` | Individual lead card with form data, status, notes |
| `src/components/leads/LeadFilters.tsx` | Filter by form, date range, status |
| `src/hooks/useLeadsCRM.ts` | CRUD hook for leads and forms |
| `supabase/functions/leads-api/index.ts` | Edge function for Graph API lead retrieval |

### Edge Function Actions

| Action | Graph API Endpoint | Method |
|--------|-------------------|--------|
| `sync_lead_forms` | `GET /{page_id}/leadgen_forms` | List all lead ad forms |
| `get_leads` | `GET /{form_id}/leads` | Get leads from a specific form |
| `get_lead_form_fields` | `GET /{form_id}?fields=questions` | Get form field definitions |

### Database Migration

```sql
-- Lead forms table
CREATE TABLE public.lead_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  social_account_id UUID NOT NULL,
  page_id TEXT NOT NULL,
  form_id TEXT NOT NULL UNIQUE,
  form_name TEXT,
  form_status TEXT DEFAULT 'active',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  form_id UUID REFERENCES public.lead_forms(id) ON DELETE CASCADE,
  meta_lead_id TEXT UNIQUE,
  lead_data JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'new', -- new, contacted, qualified, won, lost
  notes TEXT,
  assigned_to UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Routing
- Add `/leads` route
- Add sidebar menu item under "Marketing" section

---

## Feature 3: Ad Analytics Dashboard (Read-Only)

### Overview
Read-only dashboard showing campaign performance, spend tracking, ROAS, and trend charts across all connected ad accounts.

### Permissions Used
- `ads_read`

### Revenue Model
- Pro tier feature or standalone $15/mo
- Free tier: last 7 days only

### New Files

| File | Purpose |
|------|---------|
| `src/pages/AdAnalytics.tsx` | Dashboard with campaign cards and charts |
| `src/components/ads/CampaignTable.tsx` | Sortable table: name, status, spend, impressions, clicks, CTR, ROAS |
| `src/components/ads/AdSpendChart.tsx` | Recharts line chart for spend/impressions over time |
| `src/hooks/useAdAnalytics.ts` | Fetch hook for ad accounts, campaigns, insights |
| `supabase/functions/ads-analytics/index.ts` | Edge function for Marketing API calls |

### Edge Function Actions

| Action | Graph API Endpoint | Method |
|--------|-------------------|--------|
| `get_ad_accounts` | `GET /me/adaccounts?fields=name,account_status,currency` | List ad accounts |
| `get_campaigns` | `GET /act_{ad_account_id}/campaigns?fields=name,status,objective,...` | List campaigns |
| `get_campaign_insights` | `GET /{campaign_id}/insights?fields=spend,impressions,clicks,...` | Get performance data |
| `get_adsets` | `GET /{campaign_id}/adsets?fields=name,status,targeting,...` | List ad sets |

### Database
- **No database needed** — all data fetched live from Meta Marketing API
- Optional: cache layer for performance (future enhancement)

### Routing
- Add `/ad-analytics` route
- Add sidebar menu item under "Marketing" section

---

## Feature 4: Ad Campaign Manager

### Overview
Full CRUD interface for creating, editing, pausing, and managing Meta ad campaigns directly from Postora.

### Permissions Used
- `ads_management`
- `ads_read`

### Revenue Model
- Premium add-on $30-50/mo
- Business tier exclusive

### New Files

| File | Purpose |
|------|---------|
| `src/pages/AdManager.tsx` | Campaign CRUD interface with tabs |
| `src/components/ads/CampaignBuilder.tsx` | Create/edit campaign (objective, budget, schedule) |
| `src/components/ads/AdSetBuilder.tsx` | Ad set with audience targeting configuration |
| `src/components/ads/AdCreativeBuilder.tsx` | Ad creative with media upload + copy |
| `src/hooks/useAdManager.ts` | CRUD mutations for campaigns/adsets/ads |

### Edge Function Extensions (extend `ads-analytics/index.ts`)

| Action | Graph API Endpoint | Method |
|--------|-------------------|--------|
| `create_campaign` | `POST /act_{ad_account_id}/campaigns` | Create new campaign |
| `update_campaign` | `POST /{campaign_id}` | Update campaign settings |
| `toggle_campaign_status` | `POST /{campaign_id}?status=PAUSED/ACTIVE` | Pause/resume campaign |
| `create_adset` | `POST /act_{ad_account_id}/adsets` | Create ad set with targeting |
| `create_ad` | `POST /act_{ad_account_id}/ads` | Create ad with creative |
| `delete_campaign` | `DELETE /{campaign_id}` | Delete campaign |

### Database Migration

```sql
CREATE TABLE public.ad_campaign_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  social_account_id UUID NOT NULL,
  ad_account_id TEXT NOT NULL,
  campaign_name TEXT,
  campaign_data JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'draft', -- draft, published, archived
  meta_campaign_id TEXT, -- null until published
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Routing
- Add `/ad-manager` route
- Add sidebar menu item under "Marketing" section

---

## Feature 5: Instagram/Facebook Shop Integration

### Overview
Manage product catalogs and tag products in Instagram/Facebook posts during creation.

### Permissions Used
- `catalog_management`

### Revenue Model
- Business tier feature
- E-commerce add-on

### New Files

| File | Purpose |
|------|---------|
| `src/pages/ShopManager.tsx` | Product catalog grid for FB/IG |
| `src/components/shop/ProductGrid.tsx` | Browse/search products with images and prices |
| `src/components/shop/ProductTagging.tsx` | Tag products in posts during creation |
| `src/hooks/useShopCatalog.ts` | Fetch products/catalogs from Meta |
| `supabase/functions/shop-api/index.ts` | Edge function for Catalog API |

### Edge Function Actions

| Action | Graph API Endpoint | Method |
|--------|-------------------|--------|
| `get_catalogs` | `GET /{business_id}/owned_product_catalogs` | List product catalogs |
| `get_products` | `GET /{catalog_id}/products?fields=name,price,image_url,...` | List products in catalog |
| `search_products` | `GET /{catalog_id}/products?filter=...` | Search products |
| `tag_product_in_post` | `POST /{ig_media_id}/product_tags` | Tag products in IG post |

### Integration Points
- **CreatePost.tsx**: Add "Tag Products" step for Instagram posts
- **Extend existing WhatsApp catalog**: Share catalog browsing UI components

### Database
- **No database needed** — products fetched from Meta Catalog API

### Routing
- Add `/shop` route
- Add sidebar menu item under "Commerce" section

---

## Feature 6: Smart Scheduling with Audience Insights

### Overview
Enhance the existing best-times suggestion system with real audience demographic data (locale, timezone, gender) for more accurate post timing recommendations.

### Permissions Used
- `pages_user_locale`
- `pages_user_timezone`
- `pages_user_gender`

### Revenue Model
- Pro tier enhancement (justifies Pro upgrade)
- Free tier: basic suggestions without demographics

### Changes

| File | Change |
|------|--------|
| `supabase/functions/suggest-best-times/index.ts` | Fetch audience demographics from Graph API and include in AI prompt |
| `src/components/scheduling/AudienceInsights.tsx` | New component showing audience locale/timezone/gender charts |
| Scheduling UI (existing) | Show "AI-optimized" badge on suggestions using demographic data |

### Graph API Calls (added to suggest-best-times)

| Metric | Endpoint |
|--------|----------|
| Audience locale | `GET /{page_id}/insights?metric=page_fans_locale` |
| Audience timezone | `GET /{page_id}/insights?metric=page_fans_city` (approximates timezone) |
| Audience gender/age | `GET /{page_id}/insights?metric=page_fans_gender_age` |

### AI Prompt Enhancement
Add audience data to the existing prompt:
```
Audience demographics:
- Top locales: {locale_data} (e.g., en_US: 45%, es_ES: 20%)
- Top cities/timezones: {city_data}
- Gender breakdown: {gender_data}

Optimize posting times based on when the majority of the audience is awake and active.
```

### Database
- **No new tables** — audience data fetched live from Meta API

---

## Feature 7: Human Agent Mode

### Overview
Implement the `Human Agent` message tag for Messenger conversations, extending the standard 24-hour messaging window to 7 days for customer support interactions.

### Permissions Used
- `Human Agent` tag (granted via Meta)

### Revenue Model
- Business tier or per-seat pricing
- Essential for customer support teams

### Changes

| File | Change |
|------|--------|
| `supabase/functions/messaging-api/index.ts` | Add `message_tag: "HUMAN_AGENT"` to Messenger send when enabled |
| `src/components/messaging/ConversationDetail.tsx` | Add "Human Agent" toggle in conversation header |
| `src/components/messaging/HumanAgentBadge.tsx` | New visual badge component |

### Messenger API Change
When Human Agent mode is enabled for a conversation:
```json
POST /{page_id}/messages
{
  "recipient": { "id": "user_id" },
  "message": { "text": "..." },
  "messaging_type": "MESSAGE_TAG",
  "tag": "HUMAN_AGENT"
}
```

### Database Migration

```sql
ALTER TABLE public.messaging_cache
ADD COLUMN human_agent_enabled BOOLEAN DEFAULT false;
```

### UI Components
- Toggle switch in conversation header (Messenger only)
- Green "Human Agent" badge when active
- Tooltip explaining: "Extends messaging window from 24 hours to 7 days"

---

## Implementation Order

| Phase | Feature | Effort | Estimated Files |
|-------|---------|--------|----------------|
| 1 | Comment Manager | Medium | 5 new + 1 migration |
| 2 | Lead Forms CRM | Medium | 5 new + 1 migration |
| 3 | Ad Analytics Dashboard | Medium | 5 new + 0 migrations |
| 4 | Smart Scheduling | Small | 1 new + 1 edit |
| 5 | Human Agent Mode | Small | 1 new + 2 edits + 1 migration |
| 6 | Shop Integration | Medium | 5 new + 1 edit |
| 7 | Ad Campaign Manager | Large | 5 new + 1 migration |

### Total Impact
- **~27 new files** across components, hooks, pages, and edge functions
- **4 database migrations**
- **4 new edge functions** + 2 edited
- **7 new routes** + sidebar menu items

---

## Feature Flags

Each feature should have a corresponding feature flag:

| Feature | Flag Key | Default |
|---------|----------|---------|
| Comment Manager | `featureCommentManager` | `false` |
| Lead Forms CRM | `featureLeadsCRM` | `false` |
| Ad Analytics | `featureAdAnalytics` | `false` |
| Ad Campaign Manager | `featureAdManager` | `false` |
| Shop Integration | `featureShop` | `false` |
| Smart Scheduling | `featureSmartScheduling` | `false` |
| Human Agent | `featureHumanAgent` | `false` |

---

*Last updated: 2026-04-14*
