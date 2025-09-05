# 📡 ReplyX API Documentation

**Complete API reference for ReplyX platform integration**

This section contains all the documentation you need to integrate with the ReplyX API, from your first API call to advanced features.

---

## 🚀 **Start Here**

### **New to ReplyX API?**
1. **[Getting Started Guide](GETTING_STARTED.md)** - Your first API integration in 5 minutes
2. **[Complete API Reference](endpoints_complete.md)** - All 123 endpoints with examples
3. **[Analytics Examples](examples_analytics.md)** - Real analytics data examples

### **Quick Navigation:**
- 🔑 **Authentication** → [GETTING_STARTED.md#authentication](GETTING_STARTED.md#authentication-examples)
- 🤖 **Create Assistant** → [GETTING_STARTED.md#assistant-management](GETTING_STARTED.md#assistant-management)
- 💬 **Send Messages** → [GETTING_STARTED.md#dialog--messaging](GETTING_STARTED.md#dialog--messaging)
- 📊 **Analytics** → [examples_analytics.md](examples_analytics.md)

---

## 📚 **Documentation Files**

| File | Description | Use Case |
|------|-------------|----------|
| **[GETTING_STARTED.md](GETTING_STARTED.md)** | Practical API examples for developers | First integration, code examples |
| **[endpoints.md](endpoints.md)** | Manual API documentation | Reference, detailed descriptions |
| **[endpoints_complete.md](endpoints_complete.md)** | Auto-generated complete API reference | Complete endpoint list, quick lookup |
| **[examples_analytics.md](examples_analytics.md)** | Analytics API examples with real data | Admin analytics, reporting |
| **[openapi.json](openapi.json)** | OpenAPI 3.0 specification | API tools, Swagger UI, code generation |

---

## 🎯 **Common Integration Scenarios**

### **🤖 Chatbot Integration**
```javascript
// Quick chatbot setup
const client = new ReplyXClient(token);
const assistant = await client.createAssistant("Support Bot", "You are helpful");
const dialog = await client.createDialog(assistant.id, "Customer Chat");
const response = await client.sendMessage(dialog.id, "Hello!");
```
**Read more:** [GETTING_STARTED.md#assistant-management](GETTING_STARTED.md#assistant-management)

### **🌐 Website Integration**
```html
<!-- Add to your website -->
<script src="https://widget.replyx.com/embed.js" 
        data-assistant="456" 
        data-token="widget_token"></script>
```
**Read more:** [GETTING_STARTED.md#website-integration](GETTING_STARTED.md#website-integration)

### **📊 Analytics Dashboard**
```bash
# Get user analytics
curl -X GET "https://api.replyx.com/api/admin/analytics/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
**Read more:** [examples_analytics.md](examples_analytics.md)

### **📱 Mobile App Integration**
```python
# Python mobile backend
client = ReplyXClient(token)
response = client.send_message(dialog_id, user_message)
return {"ai_response": response['ai_response']['content']}
```
**Read more:** [GETTING_STARTED.md#complete-examples](GETTING_STARTED.md#complete-examples)

---

## 🔑 **Authentication Quick Reference**

### **Get Your Token:**
```bash
curl -X POST "https://api.replyx.com/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "password"}'
```

### **Use Token in Requests:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "https://api.replyx.com/api/assistants"
```

**Detailed auth guide:** [GETTING_STARTED.md#authentication-examples](GETTING_STARTED.md#authentication-examples)

---

## 📊 **API Overview**

### **Endpoint Statistics:**
- **Total Endpoints:** 123 across 14 modules
- **Authentication Required:** 99 endpoints  
- **Admin Only:** 21 endpoints
- **Public Endpoints:** 24 endpoints

### **Main Categories:**
| Category | Endpoints | Description |
|----------|-----------|-------------|
| **Authentication** | 7 | Login, register, password reset |
| **Assistants** | 16 | AI assistant management |
| **Dialogs** | 7 | Conversation management |
| **Documents** | 13 | Knowledge base, file uploads |
| **Bots** | 16 | Telegram bot management |
| **Admin** | 18 | Analytics, user management |
| **Balance** | 12 | Billing, payments, usage |
| **Real-time** | 8 | WebSockets, operator handoff |

**Complete breakdown:** [endpoints_complete.md](endpoints_complete.md)

---

## 🚀 **Quick Start Examples**

### **1. Register & Login (30 seconds)**
```bash
# Register
curl -X POST "https://api.replyx.com/api/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "secure123"}'

# Login
curl -X POST "https://api.replyx.com/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "secure123"}'
```

### **2. Create Assistant (1 minute)**
```bash
export TOKEN="your_jwt_token_here"

curl -X POST "https://api.replyx.com/api/assistants" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Assistant",
    "ai_model": "gpt-4o-mini",
    "system_prompt": "You are a helpful assistant"
  }'
```

### **3. Chat with AI (2 minutes)**
```bash
# Create dialog
curl -X POST "https://api.replyx.com/api/dialogs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"assistant_id": 456, "title": "Test Chat"}'

# Send message
curl -X POST "https://api.replyx.com/api/dialogs/789/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello AI!", "sender": "user"}'
```

**Full tutorial:** [GETTING_STARTED.md](GETTING_STARTED.md)

---

## ❌ **Error Handling**

### **Common HTTP Status Codes:**
- **200** - Success
- **401** - Unauthorized (invalid/expired token)
- **403** - Forbidden (insufficient permissions)
- **422** - Validation Error (bad request data)
- **429** - Rate Limited (too many requests)
- **500** - Server Error

### **Example Error Response:**
```json
{
  "detail": "Token expired or invalid. Please login again.",
  "error_code": "TOKEN_EXPIRED",
  "retry_after": null
}
```

**Complete error guide:** [GETTING_STARTED.md#error-handling](GETTING_STARTED.md#error-handling)

---

## 📱 **SDKs & Libraries**

### **Official Libraries:**
- **JavaScript/Node.js** - Examples in [GETTING_STARTED.md](GETTING_STARTED.md)
- **Python** - Complete client examples included
- **curl** - All examples provided

### **Community Libraries:**
- Submit your library to be featured here!

### **Code Generation:**
Use [openapi.json](openapi.json) with OpenAPI generators:
```bash
# Generate client for any language
npx @openapitools/openapi-generator-cli generate \
  -i docs/api/openapi.json \
  -g python \
  -o ./replyx-python-client
```

---

## 🔧 **Developer Tools**

### **Testing Tools:**
- **[Postman Collection](../tools/postman/)** - Import and test all endpoints
- **[Swagger UI](../tools/swagger/)** - Interactive API explorer  
- **[curl Examples](GETTING_STARTED.md)** - Copy-paste ready commands

### **Integration Helpers:**
- **[Authentication Helper](../tools/auth-helper.js)** - Token management
- **[Rate Limit Helper](../tools/rate-limiter.js)** - Handle rate limits
- **[Error Handler](../tools/error-handler.js)** - Standardized error handling

---

## 📈 **Rate Limits & Pricing**

### **Rate Limits:**
- **Free Tier:** 100 requests/hour
- **Paid Plans:** Up to 10,000 requests/hour
- **Admin Endpoints:** Separate limits apply

### **Pricing:**
- **AI Messages:** ₽0.001 per message
- **Document Upload:** ₽0.10 per document
- **Bot Messages:** ₽0.001 per message

**Complete pricing:** [../billing/model.md](../billing/model.md)

---

## 🔄 **Real-time Features**

### **WebSocket Connection:**
```javascript
const ws = new WebSocket('wss://api.replyx.com/ws/dialogs/789?token=' + token);
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('New message:', data.message);
};
```

**WebSocket guide:** [../realtime/websockets.md](../realtime/websockets.md)

---

## 🆘 **Support & Resources**

### **Getting Help:**
1. **Check [GETTING_STARTED.md](GETTING_STARTED.md)** for common solutions
2. **Review [endpoints_complete.md](endpoints_complete.md)** for API reference
3. **See [examples_analytics.md](examples_analytics.md)** for admin features
4. **Contact support** with your API request details

### **Useful Links:**
- **[Main Documentation](../README.md)** - Complete platform docs
- **[Architecture Overview](../architecture/overview.md)** - System design
- **[Security Guide](../security/authentication.md)** - Security best practices
- **[Deployment Guide](../deployment/текущее-состояние.md)** - Self-hosting

---

## 📅 **API Changelog**

### **Recent Updates:**
- **2025-01-23** - Complete API documentation overhaul
- **2025-01-23** - Added 123 endpoint auto-generation
- **2025-01-23** - Enhanced authentication examples
- **2025-01-23** - Added practical integration guides

### **Breaking Changes:**
- None currently - API is stable

**Full changelog:** [CHANGELOG.md](CHANGELOG.md) *(coming soon)*

---

**📅 Last Updated:** 2025-01-23  
**📊 API Version:** v1.0  
**🔧 Endpoints:** 123 documented  
**📚 Examples:** 50+ practical examples included


