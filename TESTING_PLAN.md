# Social Media Connection Testing Plan

## Testing Order (Recommended)
Start with easier platforms, then move to more complex ones:

1. **Twitter/X** - Simplest OAuth
2. **Facebook/Instagram** - Paired together  
3. **LinkedIn** - Personal + Pages
4. **TikTok** - Requires app review
5. **YouTube** - Quota considerations
6. **Pinterest** - Boards selection

---

## Phase 1: Twitter/X Testing

### Connection Test
- [ ] Go to `/profiles` page
- [ ] Click "Connect Twitter/X"
- [ ] Complete OAuth authorization
- [ ] Verify account appears in connected list
- [ ] Check username displays correctly

### Posting Test
- [ ] Go to `/post` page
- [ ] Select Twitter platform
- [ ] Enter caption (≤280 chars)
- [ ] Post immediately → verify success
- [ ] Check post appears on Twitter

### Error Scenarios
- [ ] Test with expired token
- [ ] Test rate limiting (if applicable)
- [ ] Test disconnection and reconnection

---

## Phase 2: Facebook + Instagram Testing

### Facebook Connection
- [ ] Connect Facebook account
- [ ] Select Facebook Page (required)
- [ ] Verify page permissions

### Instagram Connection
- [ ] Connect Instagram (via Facebook)
- [ ] Verify Instagram Business/Creator account
- [ ] Check account is linked to Facebook Page

### Posting Tests
- [ ] Post text to Facebook Page
- [ ] Post image to Facebook
- [ ] Post Reel to Instagram
- [ ] Post photo to Instagram
- [ ] Test carousel (multiple images)

### Common Issues to Watch
- "Session expired" errors
- "Page not found" errors
- Instagram account not business type

---

## Phase 3: LinkedIn Testing

### Connection Test
- [ ] Connect LinkedIn personal profile
- [ ] (Optional) Connect LinkedIn Organization Page

### Posting Tests
- [ ] Post text to personal profile
- [ ] Post with image
- [ ] Post to Organization Page (if available)

### Common Issues
- "w_member_social" permission missing
- Organization page access denied

---

## Phase 4: TikTok Testing

### Prerequisites
- TikTok Developer App approved
- Creator account verified

### Connection Test
- [ ] Complete TikTok OAuth
- [ ] Verify scopes granted

### Posting Tests
- [ ] Upload video (DIRECT_POST mode)
- [ ] Upload to drafts (MEDIA_UPLOAD mode)
- [ ] Check video appears on TikTok

### Common Issues
- Unverified developer app
- Video format/size issues
- Content policy violations

---

## Phase 5: YouTube Testing

### Prerequisites
- YouTube channel exists
- Google Cloud quotas available

### Connection Test
- [ ] Connect YouTube via Google OAuth
- [ ] Verify channel linked

### Posting Tests
- [ ] Upload standard video
- [ ] Upload Short (≤60s vertical)
- [ ] Set privacy (public/unlisted/private)
- [ ] Test thumbnail upload

### Quota Issues
- Monitor daily quota usage
- Test with private videos first

---

## Phase 6: Pinterest Testing

### Connection Test
- [ ] Complete Pinterest OAuth
- [ ] Fetch and display boards

### Posting Tests
- [ ] Create image Pin
- [ ] Create video Pin
- [ ] Select target board

---

## Troubleshooting Checklist

| Issue | Solution |
|-------|----------|
| OAuth popup blocked | Enable popups for site |
| "Session expired" | Reconnect account |
| "Permission denied" | Re-authorize with full scopes |
| Redirect loop | Check callback URL config |
| Token refresh fails | Delete and reconnect |

---

## Test Data Template

For each platform, record:
```
Platform: [name]
Connected: [yes/no]
Username: [displayed username]
Post Types Tested: [text/image/video]
Issues Found: [list]
Status: [working/broken/partial]
```
