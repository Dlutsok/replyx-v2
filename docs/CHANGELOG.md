# ReplyX Platform - Changelog

All notable changes to the ReplyX platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Blog Scheduling System** (2025-09-20)
  - Added scheduled post publication functionality with MSK timezone support
  - Automatic background scheduler running every 30 seconds
  - Frontend time picker with MSK timezone display and validation
  - Comprehensive timezone handling (MSK ↔ UTC conversion)
  - Debug endpoints for scheduler monitoring
  - Added `scheduled_for` field to blog posts database model
  - Added `services/blog_scheduler.py` background service

### Fixed
- **Blog Timezone Issues** (2025-09-20)
  - Fixed JavaScript Date object automatic UTC conversion causing immediate publication
  - Fixed timezone display showing incorrect time (+3 hours off)
  - Fixed scheduled posts publishing immediately instead of at scheduled time
  - Implemented proper MSK timezone handling throughout the blog system
  - Updated all blog-related frontend components for consistent timezone handling

### Updated
- **Blog Documentation** (2025-09-20)
  - Added comprehensive scheduling system documentation
  - Updated README.md to include scheduling functionality
  - Created detailed technical documentation for timezone handling
  - Added troubleshooting guide for common timezone issues

### Removed
- **Website Parsing Functionality** (2025-09-15)
  - Removed `POST /api/documents/import-website` endpoint
  - Removed `POST /api/assistants/{assistant_id}/ingest-website` endpoint
  - Removed `backend/services/website_crawler.py` service
  - Removed `IngestWebsiteRequest` data model
  - Removed `WebsiteSetupWizard.js` frontend component
  - Removed website parsing options from assistant setup wizards
  - **Reason**: User feedback indicated low utility value - website parsing did not provide sufficiently useful information for AI knowledge bases
  - **Migration**: Users should use document upload functionality (PDF, DOCX, TXT, MD) for better quality knowledge base content

### Updated
- **API Documentation** (2025-09-15)
  - Updated OpenAPI specification to reflect removed endpoints
  - Reduced total endpoint count from 133 to 131
  - Updated `docs/api/endpoints.md` and `docs/api/endpoints_complete.md`
  - Updated backend structure guide to remove website_crawler references

### Added
- **ADR Documentation** (2025-09-15)
  - Added `ADR-0027-remove-website-parsing-functionality.md` documenting the removal decision and rationale

---

## [Previous Releases]

### [MVP 13] - 2025-09-04
- Initial changelog creation
- Comprehensive platform with 133+ API endpoints
- Full AI assistant management system
- Telegram bot integration
- Document processing and knowledge management
- Real-time WebSocket communication
- Human operator handoff system
- Balance and billing management
- Enterprise-grade security features

---

**Note**: This changelog was created on 2025-09-15. For changes prior to this date, see individual ADR documents in `docs/adr/` and commit history.