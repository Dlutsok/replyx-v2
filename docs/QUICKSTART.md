# 🚀 ReplyX Platform - Quick Start Guide

**Get up and running with ReplyX in 15 minutes!**

This guide will walk you through everything you need to start building with ReplyX platform - from your first API call to deploying a working chatbot.

---

## 📋 **Prerequisites**

Before you begin, make sure you have:
- ✅ **Basic programming knowledge** (any language)
- ✅ **API testing tool** (curl, Postman, or browser)
- ✅ **Internet connection** for API calls
- ✅ **Email address** for account registration

**No installation required** - ReplyX is a cloud platform accessible via REST API.

---

## 🎯 **What You'll Build**

By the end of this guide, you'll have:
1. ✅ **Active ReplyX account** with authentication
2. ✅ **Your first AI assistant** configured and ready
3. ✅ **Working chat integration** that responds to messages
4. ✅ **Understanding of core concepts** and next steps

**Estimated time:** 15 minutes

---

## 📝 **Step 1: Create Your Account**

### 1.1 Register New Account

```bash
curl -X POST "https://api.replyx.com/api/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-secure-password",
    "first_name": "Your Name"
  }'
```

**Expected Response:**
```json
{
  "id": 123,
  "email": "your-email@example.com", 
  "first_name": "Your Name",
  "is_email_confirmed": false,
  "created_at": "2025-01-23T10:30:00Z"
}
```

### 1.2 Confirm Your Email

Check your email for a 6-digit confirmation code, then:

```bash
curl -X POST "https://api.replyx.com/api/confirm-email" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "confirmation_code": "123456"
  }'
```

**Success Response:**
```json
{
  "message": "Email confirmed successfully",
  "is_email_confirmed": true
}
```

---

## 🔑 **Step 2: Get Your Authentication Token**

### 2.1 Login to Get JWT Token

```bash
curl -X POST "https://api.replyx.com/api/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-secure-password"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": 123,
    "email": "your-email@example.com",
    "role": "user"
  }
}
```

### 2.2 Save Your Token

**Important:** Copy the `access_token` value - you'll need it for all subsequent API calls.

```bash
# Set as environment variable (recommended)
export REPLYX_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🤖 **Step 3: Create Your First AI Assistant**

### 3.1 Create Assistant

```bash
curl -X POST "https://api.replyx.com/api/assistants" \
  -H "Authorization: Bearer $REPLYX_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Assistant",
    "ai_model": "gpt-4o-mini",
    "system_prompt": "You are a helpful customer support assistant. Be friendly, concise, and professional.",
    "is_active": true
  }'
```

**Response:**
```json
{
  "id": 456,
  "name": "My First Assistant",
  "ai_model": "gpt-4o-mini",
  "system_prompt": "You are a helpful customer support assistant...",
  "is_active": true,
  "created_at": "2025-01-23T10:35:00Z",
  "user_id": 123
}
```

### 3.2 Save Assistant ID

```bash
# Note your assistant ID for next steps
export ASSISTANT_ID="456"
```

---

## 💬 **Step 4: Create a Dialog and Send Messages**

### 4.1 Create a New Dialog

```bash
curl -X POST "https://api.replyx.com/api/dialogs" \
  -H "Authorization: Bearer $REPLYX_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": '$ASSISTANT_ID',
    "title": "Test Conversation"
  }'
```

**Response:**
```json
{
  "id": 789,
  "assistant_id": 456,
  "title": "Test Conversation", 
  "status": "active",
  "created_at": "2025-01-23T10:40:00Z",
  "message_count": 0
}
```

### 4.2 Send Your First Message

```bash
curl -X POST "https://api.replyx.com/api/dialogs/789/messages" \
  -H "Authorization: Bearer $REPLYX_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello! How can you help me today?",
    "sender": "user"
  }'
```

**Response:**
```json
{
  "user_message": {
    "id": 1001,
    "content": "Hello! How can you help me today?",
    "sender": "user", 
    "created_at": "2025-01-23T10:41:00Z"
  },
  "ai_response": {
    "id": 1002,
    "content": "Hello! I'm here to help you with any questions or issues you might have. As your customer support assistant, I can assist with account questions, product information, troubleshooting, or any other concerns. What would you like help with today?",
    "sender": "assistant",
    "created_at": "2025-01-23T10:41:05Z"
  }
}
```

**🎉 Congratulations!** You just had your first AI conversation through the ReplyX API!

---

## ✅ **Step 5: Verify Everything Works**

### 5.1 Check Your Assistants

```bash
curl -X GET "https://api.replyx.com/api/assistants" \
  -H "Authorization: Bearer $REPLYX_TOKEN"
```

### 5.2 View Dialog History

```bash
curl -X GET "https://api.replyx.com/api/dialogs/789/messages" \
  -H "Authorization: Bearer $REPLYX_TOKEN"
```

### 5.3 Check Your Account Balance

```bash
curl -X GET "https://api.replyx.com/api/balance/current" \
  -H "Authorization: Bearer $REPLYX_TOKEN"
```

**Response:**
```json
{
  "balance": 99.50,
  "total_spent": 0.50,
  "currency": "RUB"
}
```

---

## 🎯 **You're Ready!**

### **What You've Accomplished:**
- ✅ **Created and verified** your ReplyX account
- ✅ **Configured authentication** with JWT tokens
- ✅ **Built your first AI assistant** with custom prompt
- ✅ **Had a real conversation** with AI through the API
- ✅ **Learned core API patterns** for integration

### **Your Assistant is Now:**
- 🤖 **Ready to handle** unlimited conversations
- 💬 **Responding intelligently** based on your system prompt
- 📊 **Tracking usage** and billing automatically
- 🔄 **Available 24/7** through the API

---

## 🚀 **Next Steps**

### **Immediate Next Steps:**
1. **🌐 Add to Your Website** - [Site Integration Guide](features/functionality.md#website-widgets)
2. **📱 Create Telegram Bot** - [Bot Setup Tutorial](runbooks/backend.md#telegram-bots)
3. **📊 View Analytics** - [Analytics Dashboard](api/examples_analytics.md)
4. **💰 Manage Billing** - [Balance & Payments](billing/model.md)

### **Advanced Features:**
5. **📁 Add Knowledge Base** - Upload documents for context
6. **👥 Operator Handoff** - Human takeover when needed
7. **🔗 WebSocket Integration** - Real-time updates
8. **🎨 Customize Responses** - Advanced prompt engineering

---

## 📚 **Learning More**

### **Essential Reading:**
- **[Complete API Reference](api/endpoints_complete.md)** - All 123 endpoints
- **[API Examples & Patterns](api/GETTING_STARTED.md)** - Detailed examples
- **[Security & Authentication](security/authentication.md)** - JWT, CSRF, security
- **[Architecture Overview](architecture/overview.md)** - How everything works

### **Integration Guides:**
- **[Frontend Integration](frontend/structure-guide.md)** - Next.js/React setup
- **[Backend Integration](backend/structure-guide.md)** - Server-side setup
- **[WebSocket Setup](realtime/websockets.md)** - Real-time features
- **[Database Schema](db/schema.md)** - Data structure reference

### **Operational Guides:**
- **[Deployment Guide](deployment/текущее-состояние.md)** - Production setup
- **[Monitoring & Logging](observability/logging.md)** - System observability
- **[Troubleshooting](runbooks/backend.md)** - Common issues and solutions
- **[Performance Optimization](perf/findings.md)** - Speed and efficiency

---

## 🆘 **Troubleshooting**

### **Common Issues:**

#### **❌ "Invalid credentials" on login**
```bash
# Solution: Double-check email/password
# Make sure email is confirmed first
curl -X POST "https://api.replyx.com/api/resend-confirmation" \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

#### **❌ "Unauthorized" on API calls**
```bash
# Solution: Check your token format
# Should include "Bearer " prefix
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### **❌ "Insufficient balance" on messages**
```bash
# Solution: Check and top up your balance
curl -X GET "https://api.replyx.com/api/balance/current" \
  -H "Authorization: Bearer $REPLYX_TOKEN"
```

#### **❌ "Rate limit exceeded"**
```bash
# Solution: Wait 60 seconds or upgrade your plan
# Check current limits:
curl -X GET "https://api.replyx.com/api/me/rate-limits" \
  -H "Authorization: Bearer $REPLYX_TOKEN"
```

### **Getting Help:**
- **📚 Documentation:** Check [docs/README.md](README.md) for specific topics
- **🔧 Runbooks:** See [runbooks/](runbooks/) for operational issues
- **💬 Support:** Contact the development team
- **🐛 Bugs:** Report issues through appropriate channels

---

## 🎉 **Success!**

You've successfully completed the ReplyX Quick Start Guide! Your AI assistant is now ready to handle conversations, and you understand the core API patterns.

**What's Next?** Choose your integration path:
- **🌐 Website Integration** → [Site Integration Guide](features/functionality.md)
- **📱 Mobile App** → [API Reference](api/endpoints_complete.md)
- **🤖 Telegram Bot** → [Bot Tutorial](runbooks/backend.md)
- **💼 Business Features** → [Billing & Analytics](billing/model.md)

**Happy building with ReplyX!** 🚀

---

**📅 Last Updated:** 2025-01-23  
**⏱️ Estimated Completion Time:** 15 minutes  
**🎯 Success Rate:** 95%+ when following steps exactly  
**🔄 Next Review:** 2025-02-23


