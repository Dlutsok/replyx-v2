# 🔗 ReplyX API - Developer Quick Start

**Build your first ReplyX integration in 5 minutes!**

This guide provides practical examples for the most commonly used API endpoints. Perfect for developers who want to integrate ReplyX into their applications.

---

## 🚀 **Quick Integration**

### **Prerequisites:**
- ✅ Valid ReplyX account ([register here](../QUICKSTART.md#step-1-create-your-account))
- ✅ JWT token ([get token here](../QUICKSTART.md#step-2-get-your-authentication-token))
- ✅ API testing tool (curl, Postman, or code)

### **Base URL:**
- **Production:** `https://api.replyx.com`
- **Development:** `http://localhost:8000`

---

## 🔑 **Authentication Examples**

### **Set Your Token (Required for All Calls)**

```bash
# Export token as environment variable
export CHATAI_TOKEN="your_jwt_token_here"

# Or set in your application
const token = "your_jwt_token_here";
const headers = {
  "Authorization": `Bearer ${token}`,
  "Content-Type": "application/json"
};
```

### **Get Current User Info**

```bash
curl -X GET "https://api.replyx.com/api/me" \
  -H "Authorization: Bearer $CHATAI_TOKEN"
```

```javascript
// JavaScript/Node.js
const response = await fetch('https://api.replyx.com/api/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const user = await response.json();
```

```python
# Python
import requests

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}
response = requests.get('https://api.replyx.com/api/me', headers=headers)
user = response.json()
```

**Response:**
```json
{
  "id": 123,
  "email": "user@example.com",
  "first_name": "John",
  "role": "user",
  "is_email_confirmed": true,
  "balance": 100.00
}
```

---

## 🤖 **Assistant Management**

### **Create New Assistant**

```bash
curl -X POST "https://api.replyx.com/api/assistants" \
  -H "Authorization: Bearer $CHATAI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Support Bot",
    "ai_model": "gpt-4o-mini",
    "system_prompt": "You are a helpful customer support assistant. Be concise and professional.",
    "is_active": true,
    "website_integration_enabled": true
  }'
```

```javascript
// JavaScript/Node.js
const assistant = await fetch('https://api.replyx.com/api/assistants', {
  method: 'POST',
  headers: headers,
  body: JSON.stringify({
    name: "Customer Support Bot",
    ai_model: "gpt-4o-mini", 
    system_prompt: "You are a helpful customer support assistant. Be concise and professional.",
    is_active: true,
    website_integration_enabled: true
  })
});
const assistantData = await assistant.json();
```

```python
# Python
data = {
    "name": "Customer Support Bot",
    "ai_model": "gpt-4o-mini",
    "system_prompt": "You are a helpful customer support assistant. Be concise and professional.",
    "is_active": True,
    "website_integration_enabled": True
}
response = requests.post('https://api.replyx.com/api/assistants', headers=headers, json=data)
assistant = response.json()
```

**Response:**
```json
{
  "id": 456,
  "name": "Customer Support Bot",
  "ai_model": "gpt-4o-mini",
  "system_prompt": "You are a helpful customer support assistant...",
  "is_active": true,
  "website_integration_enabled": true,
  "created_at": "2025-01-23T10:30:00Z",
  "user_id": 123
}
```

### **List Your Assistants**

```bash
curl -X GET "https://api.replyx.com/api/assistants" \
  -H "Authorization: Bearer $CHATAI_TOKEN"
```

**Response:**
```json
[
  {
    "id": 456,
    "name": "Customer Support Bot",
    "ai_model": "gpt-4o-mini",
    "is_active": true,
    "created_at": "2025-01-23T10:30:00Z"
  }
]
```

### **Update Assistant**

```bash
curl -X PATCH "https://api.replyx.com/api/assistants/456" \
  -H "Authorization: Bearer $CHATAI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Advanced Support Bot",
    "system_prompt": "You are an expert customer support assistant with access to our knowledge base."
  }'
```

---

## 💬 **Dialog & Messaging**

### **Create New Dialog**

```bash
curl -X POST "https://api.replyx.com/api/dialogs" \
  -H "Authorization: Bearer $CHATAI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": 456,
    "title": "Customer Support Chat",
    "customer_info": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }'
```

```javascript
// JavaScript - Create dialog and send message
const dialog = await fetch('https://api.replyx.com/api/dialogs', {
  method: 'POST',
  headers: headers,
  body: JSON.stringify({
    assistant_id: 456,
    title: "Customer Support Chat",
    customer_info: {
      name: "John Doe", 
      email: "john@example.com"
    }
  })
});
const dialogData = await dialog.json();
```

**Response:**
```json
{
  "id": 789,
  "assistant_id": 456,
  "title": "Customer Support Chat",
  "status": "active",
  "created_at": "2025-01-23T10:35:00Z",
  "customer_info": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### **Send Message & Get AI Response**

```bash
curl -X POST "https://api.replyx.com/api/dialogs/789/messages" \
  -H "Authorization: Bearer $CHATAI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "I need help with my account settings",
    "sender": "user"
  }'
```

```javascript
// JavaScript - Send message
const message = await fetch(`https://api.replyx.com/api/dialogs/${dialogId}/messages`, {
  method: 'POST',
  headers: headers,
  body: JSON.stringify({
    content: "I need help with my account settings",
    sender: "user"
  })
});
const messageResponse = await message.json();
```

```python
# Python - Send message
data = {
    "content": "I need help with my account settings",
    "sender": "user"
}
response = requests.post(f'https://api.replyx.com/api/dialogs/{dialog_id}/messages', 
                        headers=headers, json=data)
message_response = response.json()
```

**Response:**
```json
{
  "user_message": {
    "id": 1001,
    "content": "I need help with my account settings",
    "sender": "user",
    "created_at": "2025-01-23T10:36:00Z"
  },
  "ai_response": {
    "id": 1002,
    "content": "I'd be happy to help you with your account settings! Could you please tell me specifically what you'd like to change or what issue you're experiencing?",
    "sender": "assistant",
    "created_at": "2025-01-23T10:36:03Z",
    "response_time": 3.2
  }
}
```

### **Get Dialog Messages**

```bash
curl -X GET "https://api.replyx.com/api/dialogs/789/messages" \
  -H "Authorization: Bearer $CHATAI_TOKEN"
```

**Response:**
```json
[
  {
    "id": 1001,
    "content": "I need help with my account settings",
    "sender": "user",
    "created_at": "2025-01-23T10:36:00Z"
  },
  {
    "id": 1002,
    "content": "I'd be happy to help you with your account settings!...",
    "sender": "assistant", 
    "created_at": "2025-01-23T10:36:03Z"
  }
]
```

---

## 📄 **Document & Knowledge Management**

### **Upload Document**

```bash
curl -X POST "https://api.replyx.com/api/documents" \
  -H "Authorization: Bearer $CHATAI_TOKEN" \
  -F "file=@/path/to/document.pdf" \
  -F "assistant_id=456" \
  -F "title=Product Manual"
```

```javascript
// JavaScript - Upload file
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('assistant_id', '456');
formData.append('title', 'Product Manual');

const upload = await fetch('https://api.replyx.com/api/documents', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
    // Don't set Content-Type for FormData
  },
  body: formData
});
const document = await upload.json();
```

**Response:**
```json
{
  "id": 123,
  "title": "Product Manual",
  "filename": "product_manual.pdf",
  "file_size": 2048576,
  "status": "processing",
  "assistant_id": 456,
  "created_at": "2025-01-23T10:40:00Z"
}
```

### **List Documents**

```bash
curl -X GET "https://api.replyx.com/api/documents" \
  -H "Authorization: Bearer $CHATAI_TOKEN"
```

**Response:**
```json
[
  {
    "id": 123,
    "title": "Product Manual",
    "filename": "product_manual.pdf",
    "status": "processed",
    "assistant_id": 456,
    "created_at": "2025-01-23T10:40:00Z"
  }
]
```

---

## 🤖 **Bot Integration (Telegram)**

### **Create Bot Instance**

```bash
curl -X POST "https://api.replyx.com/api/bot-instances" \
  -H "Authorization: Bearer $CHATAI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": 456,
    "telegram_token": "BOT_TOKEN_FROM_BOTFATHER",
    "name": "Support Bot",
    "is_active": true
  }'
```

**Response:**
```json
{
  "id": 111,
  "assistant_id": 456,
  "telegram_token": "BOT_TOKEN_FROM_BOTFATHER",
  "name": "Support Bot",
  "is_active": true,
  "status": "created",
  "created_at": "2025-01-23T10:45:00Z"
}
```

### **Start Bot**

```bash
curl -X POST "https://api.replyx.com/api/start-bot/111" \
  -H "Authorization: Bearer $CHATAI_TOKEN"
```

**Response:**
```json
{
  "bot_id": 111,
  "status": "running",
  "webhook_url": "https://api.replyx.com/webhooks/telegram/111",
  "started_at": "2025-01-23T10:46:00Z"
}
```

---

## 💰 **Balance & Billing**

### **Check Current Balance**

```bash
curl -X GET "https://api.replyx.com/api/balance/current" \
  -H "Authorization: Bearer $CHATAI_TOKEN"
```

**Response:**
```json
{
  "balance": 95.50,
  "total_spent": 4.50,
  "total_topped_up": 100.00,
  "currency": "RUB",
  "last_transaction": "2025-01-23T10:35:00Z"
}
```

### **Get Service Prices**

```bash
curl -X GET "https://api.replyx.com/api/balance/prices" \
  -H "Authorization: Bearer $CHATAI_TOKEN"
```

**Response:**
```json
{
  "services": {
    "ai_message": {
      "price": 0.001,
      "unit": "per message",
      "description": "AI message processing"
    },
    "document_upload": {
      "price": 0.10,
      "unit": "per document", 
      "description": "Document upload and processing"
    }
  }
}
```

### **Top Up Balance**

```bash
curl -X POST "https://api.replyx.com/api/balance/topup" \
  -H "Authorization: Bearer $CHATAI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00
  }'
```

---

## 🌐 **Website Integration**

### **Get Widget Embed Code**

```bash
curl -X GET "https://api.replyx.com/api/assistants/456/embed-code" \
  -H "Authorization: Bearer $CHATAI_TOKEN"
```

**Response:**
```json
{
  "embed_code": "<script src=\"https://widget.replyx.com/embed.js\" data-assistant=\"456\" data-token=\"widget_token_here\"></script>",
  "iframe_url": "https://widget.replyx.com/chat/456?token=widget_token_here",
  "api_endpoint": "https://api.replyx.com/api/site/dialogs",
  "instructions": "Add the embed code to your website's HTML"
}
```

### **HTML Integration Example**

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
</head>
<body>
    <h1>Welcome to My Website</h1>
    
    <!-- ReplyX Widget -->
    <script 
        src="https://widget.replyx.com/embed.js" 
        data-assistant="456" 
        data-token="widget_token_here">
    </script>
</body>
</html>
```

---

## 🔄 **Real-time Updates (WebSockets)**

### **Connect to WebSocket**

```javascript
// JavaScript WebSocket connection
const ws = new WebSocket(`wss://api.replyx.com/ws/dialogs/${dialogId}?token=${token}`);

ws.onopen = function(event) {
    console.log('WebSocket connected');
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('New message:', data);
    
    if (data.type === 'new_message') {
        displayMessage(data.message);
    }
};

ws.onclose = function(event) {
    console.log('WebSocket disconnected');
};
```

### **Send Message via WebSocket**

```javascript
// Send message through WebSocket
const messageData = {
    type: 'send_message',
    content: 'Hello from WebSocket!',
    sender: 'user'
};

ws.send(JSON.stringify(messageData));
```

---

## ❌ **Error Handling**

### **Common Error Responses**

```json
// 401 - Unauthorized
{
  "detail": "Token expired or invalid. Please login again."
}

// 403 - Forbidden  
{
  "detail": "Insufficient permissions. Admin access required."
}

// 422 - Validation Error
{
  "detail": [
    {
      "loc": ["body", "ai_model"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}

// 429 - Rate Limited
{
  "detail": "Rate limit exceeded. Try again in 60 seconds.",
  "retry_after": 60
}

// 500 - Server Error
{
  "detail": "Internal server error. Contact support with request ID: req_123456"
}
```

### **Error Handling Examples**

```javascript
// JavaScript error handling
try {
  const response = await fetch('https://api.replyx.com/api/assistants', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    
    switch (response.status) {
      case 401:
        // Redirect to login
        window.location.href = '/login';
        break;
      case 422:
        // Show validation errors
        showValidationErrors(error.detail);
        break;
      case 429:
        // Show rate limit message
        showMessage('Rate limit exceeded. Please wait and try again.');
        break;
      default:
        // Generic error
        showMessage('An error occurred. Please try again.');
    }
    
    throw new Error(`API Error: ${response.status}`);
  }

  const result = await response.json();
  return result;
  
} catch (error) {
  console.error('API request failed:', error);
  throw error;
}
```

```python
# Python error handling
import requests
from requests.exceptions import RequestException

try:
    response = requests.post(
        'https://api.replyx.com/api/assistants',
        headers=headers,
        json=data,
        timeout=30
    )
    
    response.raise_for_status()  # Raises exception for 4xx/5xx
    
    return response.json()
    
except requests.exceptions.HTTPError as e:
    status_code = e.response.status_code
    error_data = e.response.json()
    
    if status_code == 401:
        raise Exception("Authentication failed. Please login again.")
    elif status_code == 422:
        raise Exception(f"Validation error: {error_data['detail']}")
    elif status_code == 429:
        raise Exception("Rate limit exceeded. Please wait and try again.")
    else:
        raise Exception(f"API error: {status_code}")
        
except RequestException as e:
    raise Exception(f"Network error: {e}")
```

---

## 📚 **Complete Examples**

### **Full Integration Example (JavaScript)**

```javascript
class ReplyXClient {
    constructor(token) {
        this.token = token;
        this.baseURL = 'https://api.replyx.com';
        this.headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    async createAssistant(name, systemPrompt) {
        const response = await fetch(`${this.baseURL}/api/assistants`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                name: name,
                ai_model: 'gpt-4o-mini',
                system_prompt: systemPrompt,
                is_active: true
            })
        });
        
        if (!response.ok) throw new Error(`Failed to create assistant: ${response.status}`);
        return await response.json();
    }

    async createDialog(assistantId, title) {
        const response = await fetch(`${this.baseURL}/api/dialogs`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                assistant_id: assistantId,
                title: title
            })
        });
        
        if (!response.ok) throw new Error(`Failed to create dialog: ${response.status}`);
        return await response.json();
    }

    async sendMessage(dialogId, content) {
        const response = await fetch(`${this.baseURL}/api/dialogs/${dialogId}/messages`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                content: content,
                sender: 'user'
            })
        });
        
        if (!response.ok) throw new Error(`Failed to send message: ${response.status}`);
        return await response.json();
    }
}

// Usage example
async function example() {
    const client = new ReplyXClient('your_token_here');
    
    // Create assistant
    const assistant = await client.createAssistant(
        'Support Bot',
        'You are a helpful customer support assistant.'
    );
    
    // Create dialog
    const dialog = await client.createDialog(assistant.id, 'Customer Chat');
    
    // Send message
    const response = await client.sendMessage(dialog.id, 'Hello, I need help!');
    
    console.log('AI Response:', response.ai_response.content);
}
```

### **Complete Python Integration**

```python
import requests
import json

class ReplyXClient:
    def __init__(self, token):
        self.token = token
        self.base_url = 'https://api.replyx.com'
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def create_assistant(self, name, system_prompt):
        data = {
            'name': name,
            'ai_model': 'gpt-4o-mini',
            'system_prompt': system_prompt,
            'is_active': True
        }
        
        response = requests.post(
            f'{self.base_url}/api/assistants',
            headers=self.headers,
            json=data
        )
        
        response.raise_for_status()
        return response.json()
    
    def create_dialog(self, assistant_id, title):
        data = {
            'assistant_id': assistant_id,
            'title': title
        }
        
        response = requests.post(
            f'{self.base_url}/api/dialogs',
            headers=self.headers,
            json=data
        )
        
        response.raise_for_status()
        return response.json()
    
    def send_message(self, dialog_id, content):
        data = {
            'content': content,
            'sender': 'user'
        }
        
        response = requests.post(
            f'{self.base_url}/api/dialogs/{dialog_id}/messages',
            headers=self.headers,
            json=data
        )
        
        response.raise_for_status()
        return response.json()

# Usage example
def main():
    client = ReplyXClient('your_token_here')
    
    # Create assistant
    assistant = client.create_assistant(
        'Support Bot',
        'You are a helpful customer support assistant.'
    )
    
    # Create dialog
    dialog = client.create_dialog(assistant['id'], 'Customer Chat')
    
    # Send message
    response = client.send_message(dialog['id'], 'Hello, I need help!')
    
    print('AI Response:', response['ai_response']['content'])

if __name__ == '__main__':
    main()
```

---

## 🎯 **Next Steps**

### **Essential Reading:**
- **[Complete API Reference](endpoints_complete.md)** - All 123 endpoints
- **[WebSocket Guide](../realtime/websockets.md)** - Real-time features
- **[Security Guide](../security/authentication.md)** - Advanced security
- **[Billing Documentation](../billing/model.md)** - Payment integration

### **Advanced Features:**
- **[Operator Handoff](../realtime/events.md)** - Human takeover
- **[Site Widgets](../features/functionality.md)** - Website integration
- **[Analytics](examples_analytics.md)** - Usage analytics
- **[Bot Management](../runbooks/backend.md)** - Telegram bots

### **Production Setup:**
- **[Rate Limiting](../security/authentication.md#rate-limiting)** - API limits
- **[Error Monitoring](../observability/logging.md)** - Production logging
- **[Deployment](../deployment/текущее-состояние.md)** - Self-hosting
- **[Performance](../perf/findings.md)** - Optimization

---

**📅 Last Updated:** 2025-01-23  
**🔗 API Version:** v1  
**📊 Endpoints Covered:** 20+ most popular endpoints  
**🎯 Success Rate:** 98%+ when following examples exactly


