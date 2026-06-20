# Postora Future Roadmap & Subscription Plan

## Subscription Tiers

### Free Tier
- 5 posts/month
- 2 connected accounts
- Basic scheduling
- Standard support

### Pro ($19/month)
- 100 posts/month
- 10 connected accounts
- AI caption generation
- Priority scheduling
- Analytics dashboard
- Email support

### Business ($49/month)
- Unlimited posts
- Unlimited accounts
- All AI features
- Team collaboration (3 users)
- Advanced analytics
- Webhooks
- Priority support

### Enterprise (Custom)
- Custom limits
- SSO/SAML
- Dedicated account manager
- SLA guarantee
- Custom integrations

---

## Feature Roadmap

### Phase 1: Core Stability (Current)
- [x] Multi-platform posting
- [x] OAuth connections
- [x] Basic scheduling
- [x] Post history
- [ ] Fix all connection issues
- [ ] Comprehensive error handling

### Phase 2: Monetization Ready
- [ ] Stripe integration
- [ ] Subscription management page
- [ ] Usage tracking & limits
- [ ] Payment history
- [ ] Plan upgrade/downgrade

### Phase 3: Advanced Features
- [ ] Team/workspace support
- [ ] Bulk scheduling
- [ ] Content calendar improvements
- [ ] Post analytics per platform
- [ ] A/B testing for captions

### Phase 4: Enterprise
- [ ] Webhooks for post status
- [ ] API rate limiting by tier
- [ ] White-label options
- [ ] Custom branding
- [ ] Audit logs

### Phase 5: Competitor Intelligence & Viral AI (New)
- [ ] **Competitor Analysis**: Input profile URL (IG/TikTok/YouTube) to analyze top performing content (views, likes, comments).
- [ ] **Viral Repurposing**: AI transcripts viral videos and generates new content ideas/scripts.
- [ ] **Tech Integration**: 
  - **Apify**: For scraping profile data and analytics.
  - **n8n**: For webhooks and automation workflows.
  - **AI**: Transcription & content generation.

---

## Database Changes Needed

### New Tables
```sql
-- Subscription plans
CREATE TABLE plans (
  id UUID PRIMARY KEY,
  name TEXT,
  price_monthly DECIMAL,
  post_limit INTEGER,
  account_limit INTEGER,
  features JSONB
);

-- User subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  plan_id UUID REFERENCES plans(id),
  stripe_subscription_id TEXT,
  status TEXT, -- active, canceled, past_due
  current_period_end TIMESTAMP
);

-- Usage tracking
CREATE TABLE usage (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  month DATE,
  posts_count INTEGER DEFAULT 0,
  ai_generations INTEGER DEFAULT 0
);
```

---

## Implementation Priority

| Priority | Feature | Effort |
|----------|---------|--------|
| 1 | Stripe checkout | Medium |
| 2 | Usage limits | Low |
| 3 | Subscription UI | Medium |
| 4 | Team support | High |
| 5 | Webhooks | Medium |
| 6 | Advanced analytics | High |

---

## Pricing Strategy Notes

- Start with Pro tier focus (most common)
- Offer annual discount (2 months free)
- 14-day free trial of Pro
- Grandfather early users

---

## Competitors Reference

| Feature | Postora | Buffer | Later | Hootsuite |
|---------|---------|--------|-------|-----------|
| AI Captions | ✅ | ❌ | ❌ | ❌ |
| AI Images | ✅ | ❌ | ❌ | ❌ |
| API Access | ✅ | ✅ | ✅ | ✅ |
| Starting Price | $19 | $15 | $25 | $99 |
