# Meta Permissions Analysis — Postora

## Overview

Postora has **33 Meta permissions** across Facebook, Instagram, and WhatsApp platforms. This document categorizes each permission by purpose and tracks implementation status.

---

## Permission Categories

### 1. Publishing (3 permissions)

| Permission | Platform | Status |
|-----------|----------|--------|
| `pages_manage_posts` | Facebook | ✅ Fully Implemented |
| `instagram_content_publish` | Instagram (Classic) | ✅ Fully Implemented |
| `instagram_business_content_publish` | Instagram (Business) | ✅ Fully Implemented |

**Notes**: Full multi-platform publishing with scheduling, media uploads, and platform-specific settings (carousel, Reels, Stories).

---

### 2. Messaging (6 permissions)

| Permission | Platform | Status |
|-----------|----------|--------|
| `pages_messaging` | Facebook Messenger | ✅ Fully Implemented |
| `instagram_manage_messages` | Instagram DMs (Classic) | ✅ Fully Implemented |
| `instagram_business_manage_messages` | Instagram DMs (Business) | ✅ Fully Implemented |
| `whatsapp_business_messaging` | WhatsApp | ✅ Fully Implemented |
| `whatsapp_business_management` | WhatsApp | ✅ Fully Implemented |
| `Human Agent` | Messenger | ❌ Unused |

**Notes**: Full messaging inbox for FB/IG/WA with conversations, templates, broadcasts, auto-replies. Human Agent mode (extends 24hr window to 7 days) is not yet implemented.

---

### 3. Analytics / Insights (5 permissions)

| Permission | Platform | Status |
|-----------|----------|--------|
| `read_insights` | Facebook Pages | ✅ Fully Implemented |
| `pages_read_engagement` | Facebook Pages | ✅ Fully Implemented |
| `instagram_business_manage_insights` | Instagram | ✅ Fully Implemented |
| `instagram_basic` | Instagram (Classic) | ✅ Fully Implemented |
| `instagram_business_basic` | Instagram (Business) | ✅ Fully Implemented |

**Notes**: Analytics dashboard with post performance, reach, engagement metrics for both FB and IG.

---

### 4. Comments / Engagement (4 permissions)

| Permission | Platform | Status |
|-----------|----------|--------|
| `instagram_manage_comments` | Instagram (Classic) | ⚠️ Partial — first-comment auto-post only |
| `instagram_business_manage_comments` | Instagram (Business) | ⚠️ Partial — first-comment auto-post only |
| `pages_manage_engagement` | Facebook Pages | ⚠️ Partial — first-comment auto-post only |
| `pages_read_user_content` | Facebook Pages | ❌ Unused |

**Notes**: Currently used only for automated first-comment posting during publish. No comment inbox, reply management, or engagement dashboard exists. **High-value opportunity** for a Comment Manager feature.

---

### 5. Page / Account Management (4 permissions)

| Permission | Platform | Status |
|-----------|----------|--------|
| `pages_show_list` | Facebook | ✅ Fully Implemented |
| `pages_manage_metadata` | Facebook | ✅ Fully Implemented |
| `business_management` | Meta Business | ✅ Fully Implemented |
| `Business Asset User Profile Access` | Meta Business | ✅ Used |
| `Page Public Content Access` | Facebook | ❌ Unused |

**Notes**: OAuth flow lists pages, manages metadata, accesses business assets. Page Public Content Access (search/read public pages) is not used.

---

### 6. User Identity (5 permissions)

| Permission | Platform | Status |
|-----------|----------|--------|
| `public_profile` | Facebook | ✅ Fully Implemented |
| `email` | Facebook | ✅ Fully Implemented |
| `pages_user_locale` | Facebook | ❌ Unused |
| `pages_user_timezone` | Facebook | ❌ Unused |
| `pages_user_gender` | Facebook | ❌ Unused |

**Notes**: `public_profile` and `email` used for OAuth login. Demographic permissions (locale, timezone, gender) could enhance smart scheduling by optimizing post times based on audience location/demographics.

---

### 7. Advertising (2 permissions)

| Permission | Platform | Status |
|-----------|----------|--------|
| `ads_read` | Meta Ads | ❌ Unused |
| `ads_management` | Meta Ads | ❌ Unused |

**Notes**: No advertising features implemented. Could power an Ad Analytics Dashboard (read-only) and eventually a full Ad Campaign Manager.

---

### 8. Leads (1 permission)

| Permission | Platform | Status |
|-----------|----------|--------|
| `leads_retrieval` | Facebook | ❌ Unused |

**Notes**: No lead forms feature. Could sync Facebook Lead Ads form submissions into a built-in CRM with status pipeline and notifications.

---

### 9. Commerce (1 permission)

| Permission | Platform | Status |
|-----------|----------|--------|
| `catalog_management` | Meta Commerce | ⚠️ Partial — WhatsApp catalog only |

**Notes**: WhatsApp catalog browsing exists. Missing Facebook/Instagram Shop integration for product tagging in posts.

---

## Summary

| Status | Count | Permissions |
|--------|-------|-------------|
| ✅ Fully Implemented | 19 | Publishing, Messaging (5/6), Analytics, Account Mgmt, Identity (2/5) |
| ⚠️ Partially Implemented | 5 | Comments (3), Engagement (1), Commerce (1) |
| ❌ Completely Unused | 9 | Human Agent, Demographics (3), Ads (2), Leads (1), Page Public Content |

---

## Revenue-Generating Opportunities

| # | Feature | Permissions Used | Revenue Model | Effort |
|---|---------|-----------------|---------------|--------|
| 1 | **Comment Manager** | `instagram_manage_comments`, `instagram_business_manage_comments`, `pages_manage_engagement`, `pages_read_user_content` | Pro/Business tier | Medium |
| 2 | **Lead Forms CRM** | `leads_retrieval`, `pages_manage_metadata` | $10-30/mo add-on | Medium |
| 3 | **Ad Analytics Dashboard** | `ads_read` | Pro tier or $15/mo standalone | Medium |
| 4 | **Ad Campaign Manager** | `ads_management`, `ads_read` | Premium $30-50/mo | Large |
| 5 | **Instagram/Facebook Shop** | `catalog_management` | Business tier | Medium |
| 6 | **Smart Scheduling** | `pages_user_locale`, `pages_user_timezone`, `pages_user_gender` | Pro tier enhancement | Small |
| 7 | **Human Agent Mode** | `Human Agent` | Business tier / per-seat | Small |

### Priority Order (Highest ROI First)

1. Comment Manager — most requested, uses 4 partial permissions
2. Lead Forms CRM — high-value B2B, unique differentiator
3. Ad Analytics Dashboard — read-only, low risk
4. Smart Scheduling — small effort, enhances existing feature
5. Instagram/Facebook Shop — extends existing catalog work
6. Human Agent Mode — quick win for support teams
7. Ad Campaign Manager — highest revenue but largest effort

---

*Last updated: 2026-04-14*
