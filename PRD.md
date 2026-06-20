# Postora - Product Requirements Document (PRD)

## Product Overview

**Postora** is a comprehensive social media management platform that enables users to create, schedule, and publish content across multiple social media platforms with AI-powered assistance.

**Live URL**: https://postora.cloud  
**Framework**: React 18 + TypeScript + Vite  
**Backend**: Supabase (PostgreSQL + Edge Functions)

---

## User Personas

### 1. Content Creator
- Manages multiple social media accounts
- Needs to schedule posts in advance
- Uses AI to generate captions and hashtags

### 2. Social Media Manager
- Handles multiple client profiles
- Needs analytics and post history
- Requires team collaboration features

### 3. Admin
- Manages platform users and subscriptions
- Creates announcements and blog posts
- Monitors system health

---

## Core Features & User Flows

### 1. Authentication Flow (`/auth`)

**Requirements:**
- Email/password sign up and sign in
- Google OAuth integration
- Password reset functionality
- Redirect to dashboard after successful auth

**Expected UI Elements:**
- Email input field
- Password input field
- Sign In / Sign Up toggle
- Google OAuth button
- "Forgot Password" link
- Error messages for invalid credentials

### 2. Dashboard (`/dashboard`)

**Requirements:**
- Display key statistics (total posts, scheduled, completed, failed)
- Quick access to create post
- Overview of recent activity
- AI credits balance display

**Expected UI Elements:**
- Stats cards with icons and numbers
- "Create Post" button
- Recent posts list
- Navigation sidebar

### 3. Create Post (`/post`)

**Requirements:**
- Multi-platform selection (Facebook, Instagram, TikTok, Pinterest, YouTube)
- Caption input with character count
- Media upload (images/videos)
- AI caption generator
- AI hashtag generator
- Schedule date/time picker
- Platform-specific settings for TikTok

**Expected UI Elements:**
- Platform toggle buttons
- Rich text editor for caption
- Media upload dropzone
- AI assist buttons (sparkle icons)
- Date/time picker for scheduling
- "Post Now" and "Schedule" buttons
- TikTok privacy controls (when TikTok selected)

### 4. Social Profiles (`/profiles`)

**Requirements:**
- List all connected social profiles
- Connect new social accounts via OAuth
- Disconnect accounts
- Group accounts under profiles
- Health check status for each connection

**Expected UI Elements:**
- Profile cards with account avatars
- "Connect Account" buttons per platform
- Connection status indicators (green/red)
- Disconnect button
- Profile renaming

### 5. Post History (`/history`)

**Requirements:**
- List all posts with status
- Filter by status (pending, completed, failed)
- Filter by platform
- Search by caption
- View post details
- Retry failed posts

**Expected UI Elements:**
- Posts table/list
- Status badges (color-coded)
- Platform icons
- Search input
- Filter dropdowns
- Retry button for failed posts
- Delete button

### 6. Scheduled Posts (`/scheduled`)

**Requirements:**
- View upcoming scheduled posts
- Edit scheduled posts
- Cancel scheduled posts
- Reschedule posts

**Expected UI Elements:**
- Calendar or list view
- Post preview cards
- Edit/Delete/Reschedule buttons
- Status indicators

### 7. Media Library (`/media`)

**Requirements:**
- Upload images and videos
- Browse uploaded media
- Delete media files
- Select media for posts
- Search/filter media

**Expected UI Elements:**
- Grid view of media thumbnails
- Upload button/dropzone
- Selection checkboxes
- Delete button
- Search input
- Filter by type (image/video)

### 8. Settings (`/settings`)

**Requirements:**
- Update user profile
- Enable/disable 2FA
- Manage backup codes
- Account preferences
- Notification settings

**Expected UI Elements:**
- Profile form (name, avatar)
- 2FA toggle with QR code
- Download backup codes button
- Save button
- Preference toggles

### 9. Pricing (`/pricing`)

**Requirements:**
- Display subscription plans
- Highlight popular plan
- Show features per plan
- Checkout flow

**Expected UI Elements:**
- Plan cards with prices
- Feature lists
- "Subscribe" buttons
- Monthly/yearly toggle

---

## Admin Features

### 10. Admin Dashboard (`/admin`)

**Requirements:**
- Users count overview
- Recent signups
- System health status
- Quick navigation to admin sections

### 11. User Management (`/admin/users`)

**Requirements:**
- List all users
- Search users
- View user details
- Change user roles
- View subscription status

### 12. Subscription Management (`/admin/subscriptions`)

**Requirements:**
- View all subscriptions
- Filter by plan
- Cancel subscriptions
- View payment history

### 13. Plan Builder (`/admin/plans`)

**Requirements:**
- Create new plans
- Edit existing plans
- Set pricing (monthly/yearly)
- Configure features
- Set limits (profiles, posts)

### 14. Blog/Announcements (`/admin/blog`)

**Requirements:**
- Create blog posts (What's New)
- Publish/unpublish posts
- Edit existing posts
- Track read status

---

## Platform-Specific Features

### Facebook
- Page posts with text and photos
- Multi-photo albums
- Scheduled publishing

### Instagram
- Feed posts
- Carousel posts (2-10 images)
- Via Facebook Graph API

### TikTok
- Video posts
- Photo slideshows (up to 35 photos)
- Privacy level selection (required)
- Interaction toggles (comments, duet, stitch)
- Commercial content disclosure
- Legal consent checkbox

### Pinterest
- Pin creation
- Board selection
- Link attachment

### YouTube
- Video uploads
- Title and description
- Privacy settings

---

## Testing Priorities

### Critical (Must Test)
1. Authentication (login, logout, signup)
2. Create Post flow
3. Social account connection
4. Post publishing
5. Scheduled posts processing

### High Priority
6. Media upload
7. AI caption/hashtag generation
8. Profile management
9. Settings/2FA

### Medium Priority
10. Analytics
11. Admin dashboard
12. Pricing page
13. History filtering

---

## Technical Notes

- **Local Dev Server**: Port 5173 (Vite default)
- **Test Accounts**: Contact admin for test credentials
- **API Base URL**: `/api/` endpoints via Supabase Edge Functions

---

## Accessibility Requirements

- All interactive elements must be keyboard accessible
- Forms must have proper labels
- Error states must be clearly indicated
- Loading states must be visible
