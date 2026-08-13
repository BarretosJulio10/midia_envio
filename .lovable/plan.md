# Plan: Social Media Posting Module Feasibility and Architecture

## Objective
Analyze the feasibility of adding a social media posting module (similar to mLabs) to the existing WhatsApp messaging architecture, allowing centralized management for multiple companies to post on Facebook and Instagram while maintaining the current WhatsApp functionality and blacklist rules.

## Analysis of Current Architecture
- **Tech Stack:** React (Vite), Supabase (Database, Storage, Edge Functions).
- **Current Flow:** Users upload media, add text, and send to WhatsApp clients (individual or groups) using various API drivers (FZAP, Evolution Go).
- **Data Model:** Centralized around messaging queues and client lists (with blacklists).
- **Multi-tenancy:** The system already supports multiple configurations (drivers/api keys) for different integrations.

## Proposed Module: Social Media Poster
A new independent module that leverages the existing media management and blacklist logic but targets Meta APIs (Facebook/Instagram).

### Technical Components
1. **Database Schema Extensions:**
   - `social_configs`: Store credentials (Page Access Tokens, Instagram Business Account IDs).
   - `social_posts`: Track status of posts (pending, scheduled, posted, failed).
   - Link existing `saved_lists` and `blacklists` to social posting logic.

2. **Backend (Supabase Edge Functions):**
   - New function `post-social-media`: Handles the OAuth-based posting to Facebook Graph API.
   - Reuse `media-type` helpers to ensure assets meet Meta's requirements.

3. **Frontend Additions:**
   - **Social Dashboard:** A separate view to manage posts and connect social accounts.
   - **Integrated Composer:** Extend `UploadSection` or create a variant that allows selecting "WhatsApp", "Facebook", "Instagram" as targets.

### Key Constraints & Security
- **Strict Separation:** The social module will be "opt-in" and run in parallel without modifying the critical `send-messages` path for WhatsApp.
- **Facebook/Instagram API Requirements:**
  - Requires a Facebook App with `pages_manage_posts`, `pages_read_engagement`, and `instagram_basic`, `instagram_content_publish` permissions.
  - Requires permanent Page Access Tokens for automated posting.

## Implementation Roadmap

### Phase 1: Foundation (Database & Auth)
- Create tables for social credentials and post history.
- Implement the "Connect with Facebook" flow to obtain tokens.

### Phase 2: Core Posting Logic
- Develop the Edge Function to handle media uploads to Facebook/Instagram.
- Implement logic to check against existing blacklists (e.g., if a post mentions a restricted term or is targeted at specific segments).

### Phase 3: UI Integration
- Add a "Social Media" tab in the Dashboard.
- Enable cross-posting: One upload, multiple targets (WhatsApp + Social).

## Feasibility Conclusion
**High Feasibility.** The current architecture using Supabase Edge Functions is ideal for this. We can treat "Facebook" and "Instagram" as new "Drivers" in the existing driver architecture or as a separate parallel service that consumes the same media/text assets.

---
*Note: This plan is for architectural analysis and approval. No code changes will be made to the production WhatsApp system during this phase.*
