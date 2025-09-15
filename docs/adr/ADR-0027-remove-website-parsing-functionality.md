# ADR-0027: Removal of Website Parsing Functionality

## Status
**ACCEPTED** - 2025-09-15

## Context

ReplyX platform included website parsing functionality that allowed users to extract content from websites and index it into their AI assistants' knowledge base. This functionality was implemented across multiple components:

### Backend Components (Removed)
- **API Endpoints:**
  - `POST /api/documents/import-website` - Import single website page as document
  - `POST /api/assistants/{assistant_id}/ingest-website` - Index website content into assistant knowledge

- **Service Layer:**
  - `backend/services/website_crawler.py` - Website content extraction service
  - Functions: `_crawl_and_index_single_page`, `_bg_crawl_and_index`, `_crawl_and_index_sync`
  - Functions: `_make_site_filename`, `_make_single_page_filename`, `_save_site_content_to_s3`
  - Functions: `_clean_single_page_via_gpt`, `_clean_website_text_via_gpt`, `_analyze_website_type`

- **Data Models:**
  - `IngestWebsiteRequest` schema for API requests

### Frontend Components (Removed)
- **React Components:**
  - `WebsiteSetupWizard.js` - Website configuration wizard
  - Website indexing functionality in `QuickAssistantWizard.js`
  - Website upload feature in `KnowledgeTab.js`
  - Website ingestion in `AssistantDetails.js`

- **State Management:**
  - `showWebsiteSetupWizard` modal state in `useModalState.js`

## Decision

**REMOVE** all website parsing functionality from the ReplyX platform.

### Reasons for Removal

1. **Low Utility Value**: User feedback indicated that "website parsing is useless - there's not much useful information that can be extracted from there"

2. **Limited Information Quality**: Website parsing typically extracts only surface-level content and often misses the contextual information that would be valuable for AI assistants

3. **Alternative Solutions Available**: Users can achieve better results by:
   - Uploading specific documents (PDF, DOCX, TXT, MD)
   - Manually curating relevant content
   - Using more targeted knowledge sources

4. **Maintenance Overhead**: The functionality required ongoing maintenance for handling different website structures, authentication, rate limiting, and content cleaning

5. **Resource Optimization**: Removing unused functionality reduces system complexity and frees up resources for core features

## Implementation

### Backend Changes
1. **Removed API endpoints** from FastAPI application:
   - `/api/documents/import-website`
   - `/api/assistants/{assistant_id}/ingest-website`

2. **Removed service layer** components:
   - Deleted `backend/services/website_crawler.py`
   - Removed all associated crawling and content extraction functions

3. **Removed data schemas**:
   - `IngestWebsiteRequest` model

4. **Updated API documentation**:
   - Removed endpoints from OpenAPI specification
   - Updated endpoint counts in documentation

### Frontend Changes
1. **Removed UI components**:
   - `WebsiteSetupWizard.js` component and styles
   - Website-related functionality from existing components

2. **Removed state management**:
   - Website wizard modal states

3. **Updated user flows**:
   - Removed website option from assistant setup wizards
   - Updated knowledge management interfaces

### Documentation Updates
1. **API Documentation**:
   - Updated `docs/api/openapi.json` (removed 2 endpoints)
   - Updated `docs/api/endpoints.md` and `docs/api/endpoints_complete.md`
   - Corrected endpoint counts from 133 to 131 endpoints

2. **Backend Structure Guide**:
   - Removed `website_crawler.py` from service layer documentation

3. **Feature Documentation**:
   - Removed website parsing from feature lists
   - Updated capability descriptions

## Consequences

### Positive Consequences
- **Simplified Architecture**: Reduced complexity in both backend and frontend
- **Better Resource Allocation**: Development resources can focus on core valuable features
- **Cleaner User Experience**: Removal of confusing/low-value options
- **Reduced Maintenance**: Less code to maintain and test

### Negative Consequences
- **Feature Reduction**: Some users who did use website parsing will lose this capability
- **Documentation Debt**: Existing user guides mentioning website parsing need updates

### Mitigation Strategies
- **Clear Communication**: Document the removal in changelog and user notifications
- **Alternative Workflows**: Provide clear guidance on using document upload instead
- **Gradual Migration**: Existing website-parsed content remains accessible

## Compliance and Standards

This change maintains compliance with:
- **API Versioning**: Removed endpoints cleanly without breaking existing functionality
- **Data Consistency**: No database migrations required as website content was stored as regular documents
- **Security**: Reduces attack surface by removing web scraping capabilities

## Monitoring and Success Metrics

### Metrics to Track
- **User Adoption**: Monitor usage of alternative document upload features
- **Support Requests**: Track reduction in website parsing related support tickets
- **System Performance**: Monitor resource usage improvements

### Success Criteria
- Zero user complaints about missing core functionality
- Successful migration to document upload workflows
- Improved system performance metrics

## Future Considerations

If website parsing becomes valuable in the future:
1. **Requirements Analysis**: Conduct thorough user research first
2. **Alternative Approaches**: Consider browser extension or user-guided extraction
3. **Quality Focus**: Implement with emphasis on content quality over quantity
4. **Selective Implementation**: Target specific use cases rather than general website parsing

## References

- **Related ADRs**: None directly related
- **Issue Tracker**: Website parsing functionality review
- **User Feedback**: "парсер с сайта бесполезен; оттуда не так много информации можно взять"

---

**Decision Made By**: Product Team & Engineering
**Documented By**: RAD Agent
**Review Date**: 2025-09-15
**Next Review**: Not scheduled (feature permanently removed)