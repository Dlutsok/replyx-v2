# Admin Analytics API Examples

## Overview Analytics

### GET /api/admin/analytics/overview

**Basic Request:**
```bash
curl -X GET "http://localhost:8000/api/admin/analytics/overview" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**With Period Parameter:**
```bash
curl -X GET "http://localhost:8000/api/admin/analytics/overview?period=30d" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response Example (with real calculations):**
```json
{
  "total_users": 1250,
  "active_users_today": 87,
  "total_dialogs": 15420,
  "total_messages": 89340,
  "total_revenue": 12580.50,
  "growth_metrics": {
    "user_growth": 5.2,
    "dialog_growth": -2.1,
    "revenue_growth": 15.3,
    "activity_growth": 12.8
  }
}
```

**Note:** Growth metrics are now calculated from real database comparisons:
- `user_growth`: Today vs yesterday new user registrations
- `dialog_growth`: This week vs previous week active dialogs  
- `revenue_growth`: Current period vs previous period revenue
- `activity_growth`: This week vs previous week active users

## User Analytics

### GET /api/admin/analytics/users

**Basic Request:**
```bash
curl -X GET "http://localhost:8000/api/admin/analytics/users" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**With Pagination and Sorting:**
```bash
curl -X GET "http://localhost:8000/api/admin/analytics/users?page=1&limit=25&sort_by=balance&order=desc&period=7d" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**JavaScript/Axios Example:**
```javascript
const response = await axios.get('/api/admin/analytics/users', {
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  params: {
    page: 1,
    limit: 50,
    sort_by: 'last_activity',
    order: 'desc',
    period: '30d'
  }
});

console.log('User Analytics:', response.data);
```

## Dialog Analytics

### GET /api/admin/analytics/dialogs

**Basic Request:**
```bash
curl -X GET "http://localhost:8000/api/admin/analytics/dialogs" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**With Period Filter:**
```bash
curl -X GET "http://localhost:8000/api/admin/analytics/dialogs?period=7d" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**JavaScript/Axios Example:**
```javascript
const getDialogAnalytics = async (period = '7d') => {
  try {
    const response = await axios.get('/api/admin/analytics/dialogs', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
      params: { period }
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to fetch dialog analytics:', error);
    throw error;
  }
};
```

## Revenue Analytics

### GET /api/admin/analytics/revenue

**Basic Request:**
```bash
curl -X GET "http://localhost:8000/api/admin/analytics/revenue" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Quarterly Revenue Analysis:**
```bash
curl -X GET "http://localhost:8000/api/admin/analytics/revenue?period=90d" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response Example (with real data):**
```json
{
  "total_revenue": 12580.50,
  "revenue_by_period": {
    "current_period": 3750.00,
    "previous_period": 2980.50
  },
  "balance_stats": {
    "total_user_balance": 5430.25,
    "total_spent": 8150.25,
    "average_balance": 4.34
  },
  "transaction_stats": {
    "total_transactions": 2340,
    "transactions_period": 456,
    "topup_transactions": 267,
    "spend_transactions": 189
  },
  "top_paying_users": [
    {
      "user_id": 456,
      "email": "premium_user@example.com",
      "total_paid": 500.00,
      "transaction_count": 12
    }
  ],
  "revenue_growth": {
    "current_period": 3750.00,
    "previous_period": 2980.50,
    "growth_rate": 25.8,
    "growth_absolute": 769.50
  }
}
```

**Revenue Analytics Features:**
- All financial data calculated from `BalanceTransaction` table
- Growth rates computed using real period comparisons
- Top paying users ranked by actual transaction amounts
- Supports multiple transaction types: `topup`, `payment_received`, `ai_message`, etc.

## Error Handling

### 401 Unauthorized
```json
{
  "detail": "Ошибка валидации токена: Signature has expired"
}
```

### 403 Forbidden
```json
{
  "detail": "Недостаточно прав доступа"
}
```

### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["query", "period"],
      "msg": "value is not a valid enumeration member; permitted: '24h', '7d', '30d', '90d', '1y'",
      "type": "type_error.enum",
      "ctx": {"enum_values": ["24h", "7d", "30d", "90d", "1y"]}
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "detail": "Analytics error: Database connection failed"
}
```

## AI Response Times & Performance

### Real AI Metrics

All AI performance metrics are now calculated from the `AITokenUsage` table:

```json
{
  "ai_usage": {
    "active_tokens": 3,
    "total_requests_today": 247,
    "successful_requests_today": 241,
    "success_rate": 97.6,
    "average_response_time": 1.34,
    "total_tokens_today": 45230
  },
  "response_times": {
    "average_response_time": 1.28,
    "median_response_time": 1.15,
    "p95_response_time": 2.85
  }
}
```

**AI Metrics Features:**
- Response times calculated from actual API calls
- Success rates based on real request outcomes  
- Token usage tracking for cost analysis
- Percentile calculations for performance monitoring
- Historical data for trend analysis

## Performance Considerations

1. **Real-time Data**: All metrics calculated from live database queries
2. **Caching**: Analytics service uses LRU cache for performance optimization
3. **Optimized Queries**: Database queries use indexed columns and aggregations
4. **Pagination**: User analytics supports pagination to handle large datasets
5. **Growth Rate Calculation**: Compares real periods (today vs yesterday, week vs week)
6. **AI Performance**: Uses PostgreSQL percentile functions for accurate response time analysis

## Integration Notes

- All endpoints require admin-level authentication (`is_admin=True`)
- Responses use consistent error format across all endpoints
- Date/time fields are in ISO 8601 format
- All monetary values are in rubles with 2 decimal precision
- Growth rates are calculated as percentages with 2 decimal precision