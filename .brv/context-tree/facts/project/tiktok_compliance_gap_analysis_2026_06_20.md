---
title: tiktok_compliance_gap_analysis_2026_06_20
summary: Identifies key gaps between Postora TikTok integration and current TikTok compliance requirements as of 2026-06-20.
tags: []
related: []
keywords: []
createdAt: '2026-06-20T12:12:42.373Z'
updatedAt: '2026-06-20T12:12:42.373Z'
---
## Reason
Document TikTok compliance gaps for Postora as of 2026-06-20

## Raw Concept
**Task:**
Analyze compliance gaps between Postora TikTok integration and TikTok platform requirements

**Changes:**
- Compared Postora OAuth usage versus TikTok scope requirements
- Evaluated risk assessment obligations
- Checked for automated compliance reporting
- Reviewed data retention policy against TikTok 30-day rule

**Files:**
- docs/TIKTOK-COMPLIANCE-GAP-ANALYSIS.md

**Flow:**
Review TikTok policy -> Map to Postora implementation -> Identify deltas -> Recommend remediations

**Timestamp:** 2026-06-20

**Author:** compliance team

## Narrative
### Structure
Analysis covers TikTok OAuth scope granularity, risk assessment mandates, need for automated compliance reporting, and data retention rule alignment.

### Dependencies
Dependent on TikTok API documentation, Postora OAuth implementation details, compliance automation capabilities.

### Highlights
Missing granular consent, lack of automated reporting, manual policy review needed for TikTok compliance.

### Rules
TikTok 30-day data retention rule applies to user data. Apps must conduct periodic risk assessments and obtain explicit user consent for each access scope.

## Facts
- **tiktok_api_consent**: TikTok API requires granular user consent for specific scopes. [project]
- **oauth_scope_usage**: Postora currently uses broad OAuth scopes for TikTok integration. [project]
- **tiktok_risk_assessment**: TikTok mandates periodic risk assessments for apps accessing user data. [project]
- **compliance_reporting**: Current Postora implementation lacks automated compliance reporting for TikTok integration. [project]
- **data_retention_policy**: Manual review is needed to align data retention policies with TikTok's 30-day rule. [project]
