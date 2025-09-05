# Admin Settings API Examples

## Overview
This document provides practical examples for using the ReplyX Admin Settings API. All endpoints require admin authentication.

**Base URL:** `http://localhost:8000` (development) / `https://api.replyx.ru` (production)

## Authentication
All requests must include admin authentication headers:
```bash
Authorization: Bearer <admin_jwt_token>
X-CSRF-Token: <csrf_token>
```

## 1. Get All Settings

### cURL Example
```bash
curl -X GET "http://localhost:8000/api/admin/settings" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." \
  -H "X-CSRF-Token: abc123def456" \
  -H "Content-Type: application/json"
```

### Axios Example (JavaScript)
```javascript
import axios from 'axios';

const getAdminSettings = async () => {
  try {
    const response = await axios.get('/api/admin/settings', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-CSRF-Token': csrfToken
      }
    });
    
    console.log('Settings:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching settings:', error.response.data);
    throw error;
  }
};
```

### Python Example
```python
import requests

def get_admin_settings(admin_token, csrf_token):
    headers = {
        'Authorization': f'Bearer {admin_token}',
        'X-CSRF-Token': csrf_token,
        'Content-Type': 'application/json'
    }
    
    response = requests.get(
        'http://localhost:8000/api/admin/settings',
        headers=headers
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Error: {response.status_code} - {response.text}")
```

### Response Example
```json
{
  "categories": [
    {
      "category": "general",
      "description": "Основные настройки системы",
      "settings": [
        {
          "id": 1,
          "category": "general",
          "key": "system_name",
          "value": "ReplyX",
          "data_type": "string",
          "is_sensitive": false,
          "description": "Название системы",
          "default_value": "ReplyX",
          "is_active": true,
          "created_at": "2025-01-26T10:00:00Z",
          "updated_at": "2025-01-26T10:00:00Z",
          "updated_by": 1
        }
      ]
    }
  ],
  "total_settings": 25,
  "last_updated": "2025-01-26T14:30:00Z"
}
```

## 2. Get Settings by Category

### cURL Example
```bash
curl -X GET "http://localhost:8000/api/admin/settings?category=email" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." \
  -H "X-CSRF-Token: abc123def456"
```

### Axios Example
```javascript
const getEmailSettings = async () => {
  const response = await axios.get('/api/admin/settings', {
    params: { category: 'email' },
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'X-CSRF-Token': csrfToken
    }
  });
  return response.data;
};
```

## 3. Create New Setting

### cURL Example
```bash
curl -X POST "http://localhost:8000/api/admin/settings/email/smtp_timeout" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." \
  -H "X-CSRF-Token: abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "email",
    "key": "smtp_timeout",
    "value": "30",
    "data_type": "integer",
    "is_sensitive": false,
    "description": "SMTP connection timeout in seconds",
    "default_value": "30"
  }'
```

### Axios Example
```javascript
const createSetting = async (category, key, settingData) => {
  try {
    const response = await axios.post(
      `/api/admin/settings/${category}/${key}`,
      settingData,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'X-CSRF-Token': csrfToken,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Setting created:', response.data);
    return response.data;
  } catch (error) {
    if (error.response.status === 400) {
      console.error('Setting already exists');
    }
    throw error;
  }
};

// Usage
await createSetting('ai', 'max_tokens', {
  category: 'ai',
  key: 'max_tokens',
  value: '2048',
  data_type: 'integer',
  description: 'Maximum tokens per AI request'
});
```

## 4. Update Existing Setting

### cURL Example
```bash
curl -X PUT "http://localhost:8000/api/admin/settings/general/system_name" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." \
  -H "X-CSRF-Token: abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "ReplyX Production System",
    "description": "Updated system name for production"
  }'
```

### Axios Example
```javascript
const updateSetting = async (category, key, updates) => {
  const response = await axios.put(
    `/api/admin/settings/${category}/${key}`,
    updates,
    {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
};

// Usage
await updateSetting('security', 'jwt_expire_minutes', {
  value: '720', // 12 hours
  description: 'Updated JWT expiration time'
});
```

## 5. Bulk Update Settings

### cURL Example
```bash
curl -X POST "http://localhost:8000/api/admin/settings/bulk-update" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." \
  -H "X-CSRF-Token: abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {
        "category": "ai",
        "key": "default_model",
        "value": "gpt-4o"
      },
      {
        "category": "limits",
        "key": "max_file_size_mb",
        "value": "20"
      },
      {
        "category": "email",
        "key": "smtp_port",
        "value": "587"
      }
    ]
  }'
```

### Axios Example
```javascript
const bulkUpdateSettings = async (updates) => {
  try {
    const response = await axios.post('/api/admin/settings/bulk-update', {
      updates
    }, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Updated ${response.data.updated_count} settings`);
    if (response.data.errors) {
      console.warn('Errors:', response.data.errors);
    }
    
    return response.data;
  } catch (error) {
    console.error('Bulk update failed:', error.response.data);
    throw error;
  }
};

// Usage
await bulkUpdateSettings([
  { category: 'general', key: 'maintenance_mode', value: 'false' },
  { category: 'security', key: 'rate_limiting_enabled', value: 'true' }
]);
```

## 6. Test Setting Before Applying

### cURL Example
```bash
curl -X POST "http://localhost:8000/api/admin/settings/test" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." \
  -H "X-CSRF-Token: abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "email",
    "key": "smtp_server",
    "test_value": "smtp.gmail.com"
  }'
```

### Axios Example
```javascript
const testSetting = async (category, key, testValue) => {
  try {
    const response = await axios.post('/api/admin/settings/test', {
      category,
      key,
      test_value: testValue
    }, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Test passed:', response.data.message);
    } else {
      console.log('❌ Test failed:', response.data.message);
    }
    
    return response.data;
  } catch (error) {
    console.error('Test error:', error.response.data);
    throw error;
  }
};

// Usage - Test SMTP server
await testSetting('email', 'smtp_server', 'smtp.yandex.ru');

// Usage - Test OpenAI API base
await testSetting('ai', 'openai_api_base', 'https://api.openai.com/v1');
```

### Response Example
```json
{
  "success": true,
  "message": "SMTP server connection successful",
  "details": {
    "server": "smtp.gmail.com",
    "port": 465
  }
}
```

## 7. Get Available Categories

### cURL Example
```bash
curl -X GET "http://localhost:8000/api/admin/settings/categories" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." \
  -H "X-CSRF-Token: abc123def456"
```

### Axios Example
```javascript
const getSettingsCategories = async () => {
  const response = await axios.get('/api/admin/settings/categories', {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'X-CSRF-Token': csrfToken
    }
  });
  
  return response.data.categories;
};
```

### Response Example
```json
{
  "categories": [
    {
      "id": "general",
      "name": "Основные настройки",
      "description": "Название системы, timezone, локализация",
      "icon": "settings"
    },
    {
      "id": "ai",
      "name": "AI провайдеры",
      "description": "Управление OpenAI токенами и моделями",
      "icon": "zap"
    },
    {
      "id": "email",
      "name": "Email/SMS",
      "description": "SMTP конфигурация, уведомления",
      "icon": "mail"
    }
  ]
}
```

## 8. Delete Setting

### cURL Example
```bash
curl -X DELETE "http://localhost:8000/api/admin/settings/maintenance/old_setting" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." \
  -H "X-CSRF-Token: abc123def456"
```

### Axios Example
```javascript
const deleteSetting = async (category, key) => {
  try {
    const response = await axios.delete(`/api/admin/settings/${category}/${key}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-CSRF-Token': csrfToken
      }
    });
    
    console.log('✅ Setting deleted:', response.data.message);
    return response.data;
  } catch (error) {
    if (error.response.status === 404) {
      console.error('Setting not found');
    }
    throw error;
  }
};

// Usage
await deleteSetting('limits', 'deprecated_limit');
```

## Error Handling

### Common Error Responses

**400 Bad Request - Setting Already Exists**
```json
{
  "detail": "Setting already exists"
}
```

**404 Not Found - Setting Not Found**
```json
{
  "detail": "Setting not found"
}
```

**400 Bad Request - Invalid Category**
```json
{
  "detail": "Invalid category. Must be one of: ['general', 'ai', 'email', 'security', 'limits', 'maintenance']"
}
```

**401 Unauthorized**
```json
{
  "detail": "Not authenticated"
}
```

**403 Forbidden - Not Admin**
```json
{
  "detail": "Admin access required"
}
```

### Error Handling Pattern
```javascript
const handleSettingsAPI = async (apiCall) => {
  try {
    return await apiCall();
  } catch (error) {
    switch (error.response?.status) {
      case 400:
        console.error('Bad request:', error.response.data.detail);
        break;
      case 401:
        console.error('Authentication required');
        // Redirect to login
        break;
      case 403:
        console.error('Admin access required');
        break;
      case 404:
        console.error('Setting not found');
        break;
      case 500:
        console.error('Server error:', error.response.data.detail);
        break;
      default:
        console.error('Unexpected error:', error.message);
    }
    throw error;
  }
};

// Usage
await handleSettingsAPI(() => updateSetting('ai', 'model', { value: 'gpt-4' }));
```

## React Hook Example

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

export const useAdminSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchSettings = async (category = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = category ? { category } : {};
      const response = await axios.get('/api/admin/settings', {
        params,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'X-CSRF-Token': localStorage.getItem('csrfToken')
        }
      });
      
      setSettings(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };
  
  const updateSetting = async (category, key, updates) => {
    try {
      const response = await axios.put(`/api/admin/settings/${category}/${key}`, updates, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'X-CSRF-Token': localStorage.getItem('csrfToken'),
          'Content-Type': 'application/json'
        }
      });
      
      // Refresh settings after update
      await fetchSettings();
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update setting');
      throw err;
    }
  };
  
  useEffect(() => {
    fetchSettings();
  }, []);
  
  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSetting
  };
};
```

## Common Use Cases

### 1. Admin Settings Page Load
```javascript
// On page load, fetch all settings
const { settings, loading, error } = useAdminSettings();

if (loading) return <div>Loading settings...</div>;
if (error) return <div>Error: {error}</div>;

// Render settings grouped by category
return (
  <div>
    {settings.categories.map(category => (
      <SettingsCategory 
        key={category.category}
        category={category}
        onUpdate={handleSettingUpdate}
      />
    ))}
  </div>
);
```

### 2. Test SMTP Configuration
```javascript
const testEmailSettings = async (smtpData) => {
  const testResults = await Promise.all([
    testSetting('email', 'smtp_server', smtpData.server),
    testSetting('email', 'smtp_port', smtpData.port),
    testSetting('email', 'smtp_username', smtpData.username)
  ]);
  
  const allPassed = testResults.every(result => result.success);
  
  if (allPassed) {
    // Apply settings
    await bulkUpdateSettings([
      { category: 'email', key: 'smtp_server', value: smtpData.server },
      { category: 'email', key: 'smtp_port', value: smtpData.port }
    ]);
  }
  
  return allPassed;
};
```

### 3. Maintenance Mode Toggle
```javascript
const toggleMaintenanceMode = async (enabled) => {
  await updateSetting('general', 'maintenance_mode', {
    value: enabled.toString(),
    description: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} by admin`
  });
  
  console.log(`🔧 Maintenance mode ${enabled ? 'ON' : 'OFF'}`);
};
```

## Integration Notes

- All sensitive settings (passwords, API keys) are masked in responses
- Changes are immediately persisted to database
- Use test endpoints before applying critical settings
- Settings are soft-deleted (deactivated) for audit trail
- All changes are logged with admin user ID and timestamp
- Frontend should implement optimistic updates for better UX