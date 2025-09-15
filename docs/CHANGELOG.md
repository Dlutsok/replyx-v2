# ReplyX Platform - Changelog

All notable changes to the ReplyX platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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