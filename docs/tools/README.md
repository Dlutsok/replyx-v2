# 🛠️ ChatAI Developer Tools

**Interactive tools and utilities for ChatAI API development and testing**

This directory contains helpful tools for developers working with the ChatAI API.

---

## 🚀 **Interactive API Explorer**

### **[Swagger UI](swagger-ui.html)**
Interactive API documentation that allows you to:
- 📖 **Explore all endpoints** with detailed specifications
- 🔑 **Test authentication** with your JWT tokens
- 🧪 **Try live API calls** directly from the browser
- 📊 **View request/response examples** for every endpoint
- 📝 **Generate code snippets** for different languages

**Usage:**
1. Open `swagger-ui.html` in your browser
2. Click **"Authorize"** and enter: `Bearer YOUR_JWT_TOKEN`
3. Get your token from `POST /api/login`
4. Try out any endpoint with the **"Try it out"** button

---

## 📚 **Quick Access Tools**

### **Authentication Helper**
```javascript
// auth-helper.js - Token management utility
class ChatAIAuth {
    constructor(baseUrl = 'http://localhost:8000') {
        this.baseUrl = baseUrl;
        this.token = localStorage.getItem('chatai_token');
    }
    
    async login(email, password) {
        const response = await fetch(`${this.baseUrl}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            this.token = data.access_token;
            localStorage.setItem('chatai_token', this.token);
            return this.token;
        }
        
        throw new Error('Login failed');
    }
    
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }
}
```

### **Rate Limit Helper**
```javascript
// rate-limiter.js - Handle API rate limits
class RateLimiter {
    constructor() {
        this.requests = [];
        this.maxRequests = 100; // per hour
        this.timeWindow = 3600000; // 1 hour in ms
    }
    
    async makeRequest(url, options) {
        await this.checkRateLimit();
        
        try {
            const response = await fetch(url, options);
            
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After') || 60;
                console.warn(`Rate limited. Waiting ${retryAfter} seconds...`);
                await this.sleep(retryAfter * 1000);
                return this.makeRequest(url, options);
            }
            
            return response;
        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        }
    }
    
    async checkRateLimit() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        
        if (this.requests.length >= this.maxRequests) {
            const waitTime = this.timeWindow - (now - this.requests[0]);
            await this.sleep(waitTime);
        }
        
        this.requests.push(now);
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

### **Error Handler**
```javascript
// error-handler.js - Standardized error handling
class APIErrorHandler {
    static handle(error, response) {
        const status = response?.status || 0;
        
        switch (status) {
            case 401:
                console.error('Authentication failed. Please login again.');
                // Redirect to login or refresh token
                window.location.href = '/login';
                break;
                
            case 403:
                console.error('Access denied. Insufficient permissions.');
                this.showError('You don\'t have permission for this action.');
                break;
                
            case 422:
                console.error('Validation error:', error);
                this.showValidationErrors(error.detail);
                break;
                
            case 429:
                console.warn('Rate limit exceeded. Please wait and try again.');
                this.showError('Too many requests. Please wait a moment.');
                break;
                
            case 500:
                console.error('Server error:', error);
                this.showError('Internal server error. Please try again later.');
                break;
                
            default:
                console.error('Unknown error:', error);
                this.showError('An unexpected error occurred.');
        }
    }
    
    static showError(message) {
        // Implementation depends on your UI framework
        alert(message); // Replace with your notification system
    }
    
    static showValidationErrors(errors) {
        if (Array.isArray(errors)) {
            errors.forEach(error => {
                console.error(`${error.loc.join('.')}: ${error.msg}`);
            });
        }
    }
}
```

---

## 📱 **Postman Collection**

### **Import ChatAI API Collection**
```json
// chatai-postman-collection.json
{
    "info": {
        "name": "ChatAI API",
        "description": "Complete ChatAI API collection with examples",
        "version": "1.0.0"
    },
    "auth": {
        "type": "bearer",
        "bearer": [
            {
                "key": "token",
                "value": "{{jwt_token}}",
                "type": "string"
            }
        ]
    },
    "variable": [
        {
            "key": "base_url",
            "value": "http://localhost:8000",
            "type": "string"
        },
        {
            "key": "jwt_token",
            "value": "",
            "type": "string"
        }
    ],
    "item": [
        {
            "name": "Authentication",
            "item": [
                {
                    "name": "Login",
                    "request": {
                        "method": "POST",
                        "header": [
                            {
                                "key": "Content-Type",
                                "value": "application/json"
                            }
                        ],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\"\n}"
                        },
                        "url": {
                            "raw": "{{base_url}}/api/login",
                            "host": ["{{base_url}}"],
                            "path": ["api", "login"]
                        }
                    }
                }
            ]
        }
    ]
}
```

**To use:**
1. Import the collection into Postman
2. Set the `base_url` variable (localhost:8000 or production URL)
3. Login to get a JWT token
4. Set the `jwt_token` variable with your token
5. All requests will automatically use the token

---

## 🧪 **Testing Utilities**

### **API Test Suite**
```bash
#!/bin/bash
# api-test.sh - Quick API health check

BASE_URL="http://localhost:8000"
TOKEN=""

echo "🧪 ChatAI API Test Suite"
echo "========================"

# Test 1: Health Check
echo "1. Testing health endpoint..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
if [ "$HEALTH" = "200" ]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed (HTTP $HEALTH)"
    exit 1
fi

# Test 2: Authentication
echo "2. Testing authentication..."
if [ -z "$TOKEN" ]; then
    echo "⚠️ No token provided. Set TOKEN environment variable."
else
    ME=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/me")
    if [ "$ME" = "200" ]; then
        echo "✅ Authentication test passed"
    else
        echo "❌ Authentication test failed (HTTP $ME)"
    fi
fi

# Test 3: Database connectivity
echo "3. Testing database connectivity..."
DB=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/assistants" | jq -r 'type')
if [ "$DB" = "array" ]; then
    echo "✅ Database connectivity test passed"
else
    echo "❌ Database connectivity test failed"
fi

echo "✅ API tests completed"
```

### **Load Testing**
```javascript
// load-test.js - Simple load testing with Node.js
const https = require('https');
const http = require('http');

class LoadTester {
    constructor(baseUrl, token) {
        this.baseUrl = baseUrl;
        this.token = token;
        this.results = [];
    }
    
    async testEndpoint(endpoint, method = 'GET', concurrency = 10, requests = 100) {
        console.log(`🧪 Load testing ${method} ${endpoint}`);
        console.log(`📊 ${requests} requests with ${concurrency} concurrent users`);
        
        const promises = [];
        const startTime = Date.now();
        
        for (let i = 0; i < requests; i++) {
            if (promises.length >= concurrency) {
                await Promise.race(promises);
                promises.splice(promises.findIndex(p => p.finished), 1);
            }
            
            const promise = this.makeRequest(endpoint, method);
            promise.finished = false;
            promise.then(() => promise.finished = true);
            promises.push(promise);
        }
        
        await Promise.all(promises);
        
        const duration = Date.now() - startTime;
        const rps = (requests / duration) * 1000;
        
        console.log(`⏱️ Completed in ${duration}ms (${rps.toFixed(2)} req/sec)`);
        
        return {
            endpoint,
            method,
            requests,
            duration,
            rps,
            results: this.results
        };
    }
    
    async makeRequest(endpoint, method) {
        return new Promise((resolve, reject) => {
            const url = new URL(endpoint, this.baseUrl);
            const module = url.protocol === 'https:' ? https : http;
            
            const options = {
                method,
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            };
            
            const startTime = Date.now();
            const req = module.request(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const duration = Date.now() - startTime;
                    this.results.push({
                        status: res.statusCode,
                        duration,
                        success: res.statusCode < 400
                    });
                    resolve({ status: res.statusCode, duration, data });
                });
            });
            
            req.on('error', reject);
            req.end();
        });
    }
}

// Usage example
async function runLoadTest() {
    const tester = new LoadTester('http://localhost:8000', 'your_jwt_token');
    
    await tester.testEndpoint('/api/assistants', 'GET', 10, 100);
    await tester.testEndpoint('/health', 'GET', 20, 200);
}
```

---

## 📊 **Performance Monitoring**

### **Response Time Monitor**
```javascript
// performance-monitor.js - Monitor API performance
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            requests: 0,
            errors: 0,
            totalTime: 0,
            responseTimes: []
        };
    }
    
    async monitorEndpoint(url, interval = 30000) {
        console.log(`📊 Monitoring ${url} every ${interval/1000} seconds`);
        
        setInterval(async () => {
            try {
                const startTime = Date.now();
                const response = await fetch(url);
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                this.metrics.requests++;
                this.metrics.totalTime += responseTime;
                this.metrics.responseTimes.push(responseTime);
                
                if (!response.ok) {
                    this.metrics.errors++;
                }
                
                // Keep only last 100 measurements
                if (this.metrics.responseTimes.length > 100) {
                    this.metrics.responseTimes.shift();
                }
                
                this.logMetrics(responseTime, response.status);
                
            } catch (error) {
                this.metrics.errors++;
                console.error('❌ Monitor request failed:', error.message);
            }
        }, interval);
    }
    
    logMetrics(responseTime, status) {
        const avgTime = this.metrics.totalTime / this.metrics.requests;
        const errorRate = (this.metrics.errors / this.metrics.requests) * 100;
        
        console.log(`📈 ${new Date().toISOString()} | ${status} | ${responseTime}ms | Avg: ${avgTime.toFixed(0)}ms | Errors: ${errorRate.toFixed(1)}%`);
    }
    
    getStats() {
        const times = this.metrics.responseTimes;
        const sorted = [...times].sort((a, b) => a - b);
        
        return {
            requests: this.metrics.requests,
            errors: this.metrics.errors,
            errorRate: (this.metrics.errors / this.metrics.requests) * 100,
            avgResponseTime: this.metrics.totalTime / this.metrics.requests,
            minResponseTime: Math.min(...times),
            maxResponseTime: Math.max(...times),
            p50: sorted[Math.floor(sorted.length * 0.5)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)]
        };
    }
}
```

---

## 🔗 **Integration Examples**

### **React Hook for API Calls**
```typescript
// useChatAI.ts - React hook for ChatAI API
import { useState, useEffect } from 'react';

interface ChatAIConfig {
    baseUrl?: string;
    token?: string;
}

export function useChatAI(config: ChatAIConfig = {}) {
    const [token, setToken] = useState(config.token || localStorage.getItem('chatai_token'));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const baseUrl = config.baseUrl || 'http://localhost:8000';
    
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
    
    const apiCall = async (endpoint: string, options: RequestInit = {}) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch(`${baseUrl}${endpoint}`, {
                headers,
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            throw err;
        } finally {
            setLoading(false);
        }
    };
    
    const login = async (email: string, password: string) => {
        const data = await apiCall('/api/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        setToken(data.access_token);
        localStorage.setItem('chatai_token', data.access_token);
        return data;
    };
    
    const createAssistant = async (assistant: any) => {
        return apiCall('/api/assistants', {
            method: 'POST',
            body: JSON.stringify(assistant)
        });
    };
    
    const sendMessage = async (dialogId: number, content: string) => {
        return apiCall(`/api/dialogs/${dialogId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content, sender: 'user' })
        });
    };
    
    return {
        token,
        loading,
        error,
        login,
        createAssistant,
        sendMessage,
        apiCall
    };
}
```

---

## 📚 **Related Documentation**

- **[API Getting Started](../api/GETTING_STARTED.md)** - Complete API examples
- **[Complete API Reference](../api/endpoints_complete.md)** - All 123 endpoints  
- **[Authentication Guide](../security/authentication.md)** - Security setup
- **[Main Documentation](../README.md)** - Documentation home

---

**📅 Last Updated:** 2025-01-23  
**🛠️ Tools:** Interactive Swagger UI, testing utilities, helper scripts  
**🚀 Ready to Use:** Copy-paste examples for immediate integration


