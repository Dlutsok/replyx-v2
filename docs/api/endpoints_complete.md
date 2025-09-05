# Complete API Endpoints Reference

**Last Updated:** 2025-01-23  
**📊 Total Endpoints:** 133 endpoints across 14 API modules  
**🔄 Auto-generated:** From codebase analysis

Comprehensive reference for all ReplyX backend API endpoints.

**Base URL:** `https://api.replyx.ru` (production) / `http://localhost:8000` (development)

## Authentication

Most endpoints require JWT authentication via `Authorization: Bearer <token>` header.  
Admin endpoints additionally require admin role privileges.


### Authentication & Authorization (`/api/auth`)

#### POST /api/auth/change-password

**Description:** Change Password
**Authentication:** Yes

---

#### POST /api/forgot-password

**Description:** Forgot Password
**Authentication:** No

---

#### POST /api/login

**Description:** Login
**Authentication:** No

---

#### POST /api/logout

**Description:** Logout
**Authentication:** Yes

---

#### POST /api/register

**Description:** Register
**Authentication:** No
**Response Model:** schemas.UserRead

---

#### POST /api/reset-password

**Description:** Reset Password
**Authentication:** No

---

#### POST /api/validate-reset-token

**Description:** Validate Reset Token
**Authentication:** No

---


### User Management (`/api/users`)

#### POST /api/admin/users

**Description:** Create User
**Authentication:** Yes (Admin)
**Response Model:** schemas.UserRead

---

#### GET /api/admin/users/detailed

**Description:** Get Detailed Users
**Authentication:** Yes (Admin)
**Parameters:**
- `page` (query, str) - required
- `limit` (query, str) - required
- `search` (query, str) - required
- `status` (query, str) - required

---

#### DELETE /api/admin/users/{user_id}

**Description:** Delete User Endpoint
**Authentication:** Yes (Admin)

---

#### PATCH /api/admin/users/{user_id}

**Description:** Update User
**Authentication:** Yes (Admin)
**Response Model:** schemas.UserRead

---

#### GET /api/me

**Description:** Get Me
**Authentication:** Yes

---

#### PATCH /api/me

**Description:** Update Me
**Authentication:** Yes
**Parameters:**
- `data` (body, dict) - required

---

#### GET /api/me/rate-limits

**Description:** Get My Rate Limits
**Authentication:** Yes

---

#### POST /api/update-activity

**Description:** Update User Activity
**Authentication:** Yes

---

#### POST /api/users/onboarding/complete

**Description:** Complete Onboarding
**Authentication:** Yes

---

#### POST /api/users/onboarding/mark-bot-created

**Description:** Mark Bot Created
**Authentication:** Yes

---

#### POST /api/users/onboarding/mark-first-message

**Description:** Mark First Message Sent
**Authentication:** Yes

---

#### POST /api/users/onboarding/save-tip

**Description:** Save Tutorial Tip
**Authentication:** Yes

---

#### POST /api/users/onboarding/skip

**Description:** Skip Onboarding
**Authentication:** Yes

---

#### POST /api/users/onboarding/start

**Description:** Start Onboarding
**Authentication:** Yes

---

#### GET /api/users/onboarding/status

**Description:** Get Onboarding Status
**Authentication:** Yes

---

#### POST /api/users/onboarding/update-step

**Description:** Update Onboarding Step
**Authentication:** Yes

---


### Assistant Management (`/api/assistants`)

#### GET /api/assistants

**Description:** Get My Assistants
**Authentication:** Yes
**Response Model:** TypingList[schemas.AssistantRead]

---

#### POST /api/assistants

**Description:** Create My Assistant
**Authentication:** Yes
**Response Model:** schemas.AssistantRead

---

#### GET /api/assistants/stats

**Description:** Get Assistants Stats
**Authentication:** Yes

---

#### DELETE /api/assistants/{assistant_id}

**Description:** Delete My Assistant
**Authentication:** Yes

---

#### PATCH /api/assistants/{assistant_id}

**Description:** Update My Assistant
**Authentication:** Yes

---

#### GET /api/assistants/{assistant_id}/dialogs

**Description:** List Assistant Dialogs
**Authentication:** Yes

---

#### GET /api/assistants/{assistant_id}/documents

**Description:** List Assistant Documents
**Authentication:** Yes
**Response Model:** TypingList[schemas.DocumentRead]

---

#### GET /api/assistants/{assistant_id}/embed-code

**Description:** Get Assistant Embed Code
**Authentication:** Yes

---

#### POST /api/assistants/{assistant_id}/ingest-website

**Description:** Ingest Website For Assistant
**Authentication:** Yes

---

#### GET /api/assistants/{assistant_id}/knowledge

**Description:** Get Assistant Knowledge
**Authentication:** Yes

---

#### GET /api/assistants/{assistant_id}/settings

**Description:** Get Assistant Settings
**Authentication:** Yes

---

#### POST /api/assistants/{assistant_id}/validate-knowledge

**Description:** Validate Assistant Knowledge
**Authentication:** Yes

---

#### POST /api/assistants/{assistant_id}/website-integration

**Description:** Toggle Website Integration
**Authentication:** Yes

---

#### GET /api/assistants/{assistant_id}/widget-settings

**Description:** Get Assistant Widget Settings
**Authentication:** Yes

---

#### POST /api/assistants/{assistant_id}/widget-settings

**Description:** Save Assistant Widget Settings
**Authentication:** Yes

---

#### GET /api/user-telegram-assistant/{user_id}

**Description:** Get User Telegram Assistant
**Authentication:** No

---


### Dialog Management (`/api/dialogs`)

#### GET /api/dialogs

**Description:** Get Dialogs
**Authentication:** Yes
**Parameters:**
- `user_id` (query, str) - required
- `all` (query, str) - required
- `page` (query, str) - required
- `limit` (query, str) - required

---

#### GET /api/dialogs/by-telegram-chat/{telegram_chat_id}

**Description:** Get Dialog By Telegram Chat
**Authentication:** No

---

#### GET /api/dialogs/{dialog_id}

**Description:** Get Dialog
**Authentication:** Yes

---

#### GET /api/dialogs/{dialog_id}/messages

**Description:** Get Dialog Messages
**Authentication:** Yes

---

#### POST /api/dialogs/{dialog_id}/release

**Description:** Release Dialog
**Authentication:** Yes

---

#### GET /api/dialogs/{dialog_id}/status

**Description:** Get Dialog Status For Bot
**Authentication:** No

---

#### POST /api/dialogs/{dialog_id}/takeover

**Description:** Takeover Dialog
**Authentication:** Yes

---


### Document Management (`/api/documents`)

#### POST /api/analyze-document/{doc_id}

**Description:** Analyze Document
**Authentication:** Yes

---

#### GET /api/documents

**Description:** Get Documents
**Authentication:** Yes
**Parameters:**
- `page` (query, str) - required
- `limit` (query, str) - required

---

#### POST /api/documents/import-website

**Description:** Import Website
**Authentication:** Yes
**Response Model:** schemas.DocumentRead

---

#### DELETE /api/documents/{doc_id}

**Description:** Delete Document
**Authentication:** Yes

---

#### GET /api/documents/{doc_id}/summary

**Description:** Get Document Summary
**Authentication:** Yes

---

#### GET /api/documents/{doc_id}/text

**Description:** Get Document Text
**Authentication:** Yes

---

#### POST /api/knowledge/confirm

**Description:** Confirm Knowledge
**Authentication:** Yes

---

#### GET /api/knowledge/confirmed

**Description:** Get Confirmed Knowledge
**Authentication:** Yes
**Parameters:**
- `assistant_id` (query, str) - required
- `page` (query, str) - required
- `limit` (query, str) - required

---

#### GET /api/knowledge/stats

**Description:** Get Knowledge Stats
**Authentication:** Yes

---

#### POST /api/knowledge/track-usage

**Description:** Track Document Usage
**Authentication:** Yes

---

#### DELETE /api/knowledge/{knowledge_id}

**Description:** Delete Knowledge
**Authentication:** Yes

---

#### PUT /api/knowledge/{knowledge_id}

**Description:** Update Knowledge
**Authentication:** Yes

---

#### GET /api/user-knowledge/{user_id}

**Description:** Get User Knowledge
**Authentication:** No
**Parameters:**
- `assistant_id` (query, str) - required

---


### Bot Management (`/api/bots`)

#### GET /api/admin/bot-instances/{user_id}

**Description:** Get User Bot Instances Admin
**Authentication:** Yes (Admin)

---

#### GET /api/bot-instances

**Description:** Get My Bot Instances
**Authentication:** Yes

---

#### POST /api/bot-instances

**Description:** Create Bot Instance
**Authentication:** Yes

---

#### GET /api/bot-instances-all

**Description:** Get All Bot Instances
**Authentication:** No

---

#### GET /api/bot-instances/by-assistant/{assistant_id}

**Description:** Get Bot Instance By Assistant
**Authentication:** No

---

#### DELETE /api/bot-instances/{bot_id}

**Description:** Delete Bot Instance
**Authentication:** Yes

---

#### PATCH /api/bot-instances/{bot_id}

**Description:** Update Bot Instance
**Authentication:** Yes

---

#### GET /api/bot-instances/{bot_id}/assistant

**Description:** Get Bot Assistant
**Authentication:** No

---

#### POST /api/bot/ai-response

**Description:** Get Bot Ai Response
**Authentication:** No

---

#### GET /api/bot/dialogs

**Description:** Get Bot Dialogs
**Authentication:** No
**Parameters:**
- `user_id` (query, str) - required
- `assistant_id` (query, str) - required
- `telegram_chat_id` (query, str) - required

---

#### POST /api/bot/dialogs

**Description:** Create Bot Dialog
**Authentication:** No

---

#### POST /api/bot/dialogs/{dialog_id}/messages

**Description:** Add Bot Dialog Message
**Authentication:** No

---

#### PATCH /api/bot/dialogs/{dialog_id}/user-info

**Description:** Update Dialog User Info
**Authentication:** No

---

#### POST /api/reload-bot

**Description:** Reload Bot Endpoint
**Authentication:** No

---

#### POST /api/start-bot/{bot_id}

**Description:** Start Bot
**Authentication:** Yes

---

#### POST /api/stop-bot/{bot_id}

**Description:** Stop Bot
**Authentication:** Yes

---


### Admin Operations (`/api/admin`)

#### GET /api/admin/advanced-analytics

**Description:** Get Advanced Analytics
**Authentication:** Yes (Admin)
**Parameters:**
- `period` (query, str) - required

---

#### GET /api/admin/ai-tokens

**Description:** Get Ai Tokens
**Authentication:** Yes (Admin)

---

#### POST /api/admin/ai-tokens

**Description:** Create Ai Token
**Authentication:** Yes (Admin)

---

#### DELETE /api/admin/ai-tokens/{token_id}

**Description:** Delete Ai Token
**Authentication:** Yes (Admin)

---

#### PUT /api/admin/ai-tokens/{token_id}

**Description:** Update Ai Token
**Authentication:** Yes (Admin)

---

#### GET /api/admin/ai-tokens/{token_id}/usage

**Description:** Get Ai Token Usage
**Authentication:** Yes (Admin)

---

#### GET /api/admin/bots-monitoring

**Description:** Get Bots Monitoring Data
**Authentication:** Yes (Admin)
**Parameters:**
- `status` (query, str) - required
- `search` (query, str) - required
- `period` (query, str) - required

---

#### GET /api/admin/bots-monitoring/stats

**Description:** Get Bots Monitoring Stats
**Authentication:** Yes (Admin)
**Parameters:**
- `period` (query, str) - required

---

#### POST /api/admin/bots/{bot_id}/action

**Description:** Execute Bot Action
**Authentication:** Yes (Admin)
**Parameters:**
- `action` (body, dict) - required

---

#### GET /api/admin/embed-codes

**Description:** Get All Embed Codes
**Authentication:** Yes (Admin)
**Response Model:** schemas.OpenAITokenRead

---

#### GET /api/admin/openai-token/{user_id}

**Description:** Get Openai Token Admin
**Authentication:** Yes (Admin)
**Response Model:** schemas.OpenAITokenRead

---

#### POST /api/admin/openai-token/{user_id}

**Description:** Set Openai Token Admin
**Authentication:** Yes (Admin)
**Response Model:** schemas.OpenAITokenRead

---

#### GET /api/admin/realtime-stats

**Description:** Get Realtime Stats
**Authentication:** Yes (Admin)

---

#### GET /api/admin/settings

**Description:** Get Admin Settings
**Authentication:** Yes (Admin)
**Response Model:** schemas.AdminSettingsResponse

---

#### POST /api/admin/settings/bulk-update

**Description:** Bulk Update Settings
**Authentication:** Yes (Admin)

---

#### GET /api/admin/settings/categories

**Description:** Get Settings Categories
**Authentication:** Yes (Admin)

---

#### POST /api/admin/settings/test

**Description:** Test Admin Setting
**Authentication:** Yes (Admin)
**Response Model:** schemas.AdminSettingsTestResponse

---

#### DELETE /api/admin/settings/{category}/{key}

**Description:** Delete Admin Setting
**Authentication:** Yes (Admin)

---

#### POST /api/admin/settings/{category}/{key}

**Description:** Create Admin Setting
**Authentication:** Yes (Admin)
**Response Model:** schemas.SystemSettingRead

---

#### PUT /api/admin/settings/{category}/{key}

**Description:** Update Admin Setting
**Authentication:** Yes (Admin)
**Response Model:** schemas.SystemSettingRead

---

#### GET /api/admin/system-stats

**Description:** Get System Stats
**Authentication:** Yes (Admin)

---

#### GET /api/admin/tokens

**Description:** Get Tokens
**Authentication:** Yes (Admin)
**Response Model:** List[schemas.TokenRead]

---

#### POST /api/admin/tokens

**Description:** Create Token
**Authentication:** Yes (Admin)
**Response Model:** schemas.TokenRead

---

#### DELETE /api/admin/tokens/{token_id}

**Description:** Delete Token
**Authentication:** Yes (Admin)
**Response Model:** schemas.TokenRead

---

#### GET /api/admin/users

**Description:** Get Users
**Authentication:** Yes (Admin)

---

#### DELETE /api/admin/users/{user_id}

**Description:** Delete User Admin
**Authentication:** Yes (Admin)

---

#### PATCH /api/admin/users/{user_id}

**Description:** Update User
**Authentication:** Yes (Admin)
**Parameters:**
- `data` (body, dict) - required

---

#### POST /api/admin/users/{user_id}/balance/topup

**Description:** Adjust User Balance
**Authentication:** Yes (Admin)
**Parameters:**
- `data` (body, dict) - required

---


### AI Chat (`/api/ai_chat`)

#### POST /api/ai/clear-all-sessions

**Description:** Очистка всех активных сессий
**Authentication:** No

---

#### GET /api/ai/debug

**Description:** Debug информация о состоянии AI системы
**Authentication:** No

---

#### POST /api/ai/initialize-context

**Description:** Initialize Ai Context
**Authentication:** No

---

#### POST /api/ai/reload-config

**Description:** Перезагрузка конфигурации AI провайдеров
**Authentication:** No

---

#### DELETE /api/ai/session/{session_id}

**Description:** Clear Session
**Authentication:** No

---

#### GET /api/ai/session/{session_id}

**Description:** Get Session Info
**Authentication:** No

---


### Operator Handoff (`/api/handoff`)

#### POST /api/cancel

**Description:** Cancel Handoff
**Authentication:** No
**Response Model:** HandoffStatusOut

---

#### POST /api/force-reset

**Description:** Force Reset Handoff
**Authentication:** Yes

---

#### POST /api/release

**Description:** Release Handoff
**Authentication:** Yes
**Response Model:** HandoffStatusOut

---

#### POST /api/request

**Description:** Request Handoff
**Authentication:** No
**Response Model:** HandoffStatusOut

---

#### GET /api/status

**Description:** Get Handoff Status
**Authentication:** No
**Response Model:** HandoffStatusOut

---

#### POST /api/takeover

**Description:** Takeover Handoff
**Authentication:** Yes
**Response Model:** HandoffStatusOut

---


### Site Integration (`/api/site`)

#### GET /api/chat-iframe

**Description:** Chat Iframe
**Authentication:** No
**Parameters:**
- `user_id` (query, str) - required

---

#### GET /api/embed-code

**Description:** Get Embed Code
**Authentication:** Yes
**Parameters:**
- `theme` (query, str) - required

---

#### POST /api/embed-code

**Description:** Generate Site Token
**Authentication:** Yes

---

#### POST /api/embed-code

**Description:** Generate Site Token
**Authentication:** Yes

---

#### GET /api/site-token

**Description:** Get Site Token
**Authentication:** Yes

---

#### GET /api/site/dialogs

**Description:** Site Get Dialogs
**Authentication:** No
**Parameters:**
- `guest_id` (query, str) - required

---

#### POST /api/site/dialogs

**Description:** Site Create Dialog
**Authentication:** No
**Parameters:**
- `guest_id` (query, str) - required

---

#### GET /api/site/dialogs/{dialog_id}/messages

**Description:** Site Get Dialog Messages
**Authentication:** No
**Parameters:**
- `guest_id` (query, str) - required

---

#### GET /api/widget/dialogs

**Description:** Widget Get Dialogs
**Authentication:** No
**Parameters:**
- `guest_id` (query, str) - required

---

#### POST /api/widget/dialogs

**Description:** Widget Create Dialog
**Authentication:** No
**Parameters:**
- `guest_id` (query, str) - required

---

#### GET /api/widget/dialogs/{dialog_id}/messages

**Description:** Widget Get Dialog Messages
**Authentication:** No
**Parameters:**
- `guest_id` (query, str) - required

---


### System & Health (`/api/system`)

#### GET /api/metrics

**Description:** Get Metrics
**Authentication:** Yes (Admin)
**Parameters:**
- `period` (query, str) - required
- `date` (query, str) - required
- `user_id` (query, str) - required
- `all` (query, str) - required

---


### Email Services (`/api/email`)

#### POST /api/confirm_email

**Description:** Confirm Email
**Authentication:** No
**Response Model:** ConfirmEmailResponse

---

#### POST /api/resend_email_code

**Description:** Resend Email Code
**Authentication:** No

---

#### POST /api/test_send

**Description:** Test Send Email
**Authentication:** No

---


### Support System (`/api/support`)

#### POST /api/support/send-to-admins

**Description:** Send Message To Admins
**Authentication:** No

---


### Token Management (`/api/tokens`)

#### GET /api/telegram-token

**Description:** Get My Telegram Token
**Authentication:** Yes
**Response Model:** schemas.TelegramTokenRead

---

#### POST /api/telegram-token

**Description:** Set My Telegram Token
**Authentication:** Yes
**Response Model:** schemas.TelegramTokenRead

---


## API Statistics

| Module | Endpoints | Auth Required | Admin Only |
|--------|-----------|---------------|------------|
| auth | 7 | 2 | 0 |
| system | 1 | 1 | 1 |
| support | 1 | 0 | 0 |
| assistants | 16 | 15 | 0 |
| ai_chat | 6 | 0 | 0 |
| users | 16 | 16 | 4 |
| handoff | 6 | 3 | 0 |
| bots | 16 | 7 | 1 |
| documents | 13 | 12 | 0 |
| tokens | 2 | 2 | 0 |
| site | 11 | 4 | 0 |
| admin | 28 | 28 | 28 |
| email | 3 | 0 | 0 |
| dialogs | 7 | 5 | 0 |

**Total:** 133 endpoints
