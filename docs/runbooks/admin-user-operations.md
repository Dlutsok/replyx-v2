# Admin User Operations Runbook

## 🚨 Critical Issue Resolution: User Deletion

### Executive Summary

This runbook addresses the **critical ForeignKey constraint violation** that prevented admin users from deleting users in the ChatAI MVP 9 system. The issue has been resolved with a comprehensive 5-stage cascade deletion system.

**Status**: ✅ **RESOLVED** (2025-08-24)
**Severity**: Critical - Admin panel functionality blocked
**Root Cause**: Incomplete cascade deletion logic missing `user_balances` table cleanup

---

## 🔍 Problem Analysis

### Original Error
```
ForeignKeyViolation: update or delete on table "users" violates foreign key constraint "user_balances_user_id_fkey" on table "user_balances"
```

### Root Cause
The system has **28 database tables** with foreign key constraints to `users.id`, but the original deletion function only handled 6 of them, leaving critical dependencies unresolved.

### Impact
- Admin panel user deletion completely non-functional
- Database integrity violations
- Potential data corruption risks
- Admin workflow blocked

---

## 🛠️ Technical Solution

### Database Tables Affected (28 Total)

The complete list of tables with FK dependencies on `users.id`:

```sql
-- Core user data
integration_tokens (owner_id)
telegram_tokens (user_id)  
openai_tokens (user_id)
user_balances (user_id) ⭐ -- THIS WAS THE MAIN CULPRIT
balance_transactions (user_id)

-- Knowledge & AI
documents (user_id)
user_knowledge (user_id)
knowledge_embeddings (user_id)
ai_token_usage (user_id)

-- Assistants & Dialogs  
assistants (user_id)
dialogs (user_id, assigned_manager_id)
dialog_messages (via dialogs)
bot_instances (user_id)

-- Training & Analytics
training_datasets (user_id)
conversation_patterns (user_id)
dialog_feedback (via dialogs)
dialog_ratings (via dialogs)
message_ratings (via dialogs)
training_examples (via dialogs)

-- Financial System
organization_features (owner_id)
promo_codes (created_by)
promo_code_usage (user_id)
referral_codes (user_id)
referrals (referrer_id, referred_id)

-- Operational
operator_presence (user_id)
handoff_audit (user_id)
```

### 5-Stage Cascade Deletion Process

#### Stage 1: Dependency Cleanup
```python
# Remove records that depend on dialogs/messages first
DELETE FROM handoff_audit WHERE user_id = :user_id
DELETE FROM ai_token_usage WHERE user_id = :user_id
DELETE FROM message_ratings WHERE dialog_id IN (SELECT id FROM dialogs WHERE user_id = :user_id)
DELETE FROM dialog_ratings WHERE dialog_id IN (SELECT id FROM dialogs WHERE user_id = :user_id)
DELETE FROM dialog_feedback WHERE dialog_id IN (SELECT id FROM dialogs WHERE user_id = :user_id)
DELETE FROM training_examples WHERE dialog_id IN (SELECT id FROM dialogs WHERE user_id = :user_id)
DELETE FROM dialog_messages WHERE dialog_id IN (SELECT id FROM dialogs WHERE user_id = :user_id)
```

#### Stage 2: Core Data Cleanup  
```python
# Remove knowledge and document systems
DELETE FROM knowledge_embeddings WHERE user_id = :user_id
DELETE FROM user_knowledge WHERE user_id = :user_id
DELETE FROM bot_instances WHERE user_id = :user_id
DELETE FROM documents WHERE user_id = :user_id
DELETE FROM assistants WHERE user_id = :user_id
DELETE FROM dialogs WHERE user_id = :user_id OR assigned_manager_id = :user_id
```

#### Stage 3: Tokens & Settings
```python
# Remove integration tokens and training data
DELETE FROM telegram_tokens WHERE user_id = :user_id
DELETE FROM openai_tokens WHERE user_id = :user_id  
DELETE FROM integration_tokens WHERE owner_id = :user_id
DELETE FROM training_datasets WHERE user_id = :user_id
DELETE FROM conversation_patterns WHERE user_id = :user_id
DELETE FROM organization_features WHERE owner_id = :user_id
```

#### Stage 4: Financial Records ⭐ CRITICAL
```python
# THIS WAS THE MISSING PIECE!
DELETE FROM balance_transactions WHERE user_id = :user_id
DELETE FROM promo_code_usage WHERE user_id = :user_id
DELETE FROM referrals WHERE referrer_id = :user_id OR referred_id = :user_id
DELETE FROM referral_codes WHERE user_id = :user_id
DELETE FROM user_balances WHERE user_id = :user_id  -- MAIN CULPRIT!
DELETE FROM operator_presence WHERE user_id = :user_id
```

#### Stage 5: Final User Deletion
```python
# Safe to delete user now
DELETE FROM users WHERE id = :user_id
```

---

## 📋 Admin Operations Procedures

### Safe User Deletion Checklist

Before deleting any user, administrators should:

- [ ] **Verify user account** - Confirm user ID and email
- [ ] **Check business impact** - Is this an active paying customer?
- [ ] **Backup consideration** - Critical user data backup if needed
- [ ] **Admin confirmation** - Cannot delete yourself (built-in protection)
- [ ] **Cascade verification** - Ensure no external dependencies

### Admin Panel Operations

#### Access Admin Panel
1. Navigate to: `http://localhost:3003/admin-users`
2. Login with admin credentials
3. Select "User Management" section

#### Delete User via UI
1. **Find user** in the user table
2. **Click delete button** (🗑️ icon)  
3. **Confirm deletion** in modal dialog
4. **Monitor logs** for successful completion

#### Delete User via API

```bash
# Get admin token first
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your_admin_password"}'

# Use token to delete user  
curl -X DELETE http://localhost:8000/api/admin/users/{user_id} \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Expected response:
{
  "message": "User deleted successfully",
  "deleted_user_id": 123,
  "deleted_user_email": "user@example.com", 
  "admin_action": "Deleted by admin@example.com"
}
```

### Logging & Audit Trail

All user deletions are logged with:
- **Admin details**: Who performed the deletion
- **User details**: Which user was deleted
- **Timestamp**: When the deletion occurred
- **Cascade details**: Which records were cleaned up

#### Log Locations
- **Application logs**: `/backend/logs/api.log`
- **Audit logs**: `/backend/logs/audit.log`  
- **Database logs**: PostgreSQL logs

#### Sample Log Entry
```
2025-08-24 16:02:34,123 - api.admin - INFO - Admin admin@example.com (ID: 1) initiating deletion of user test@example.com (ID: 42)
2025-08-24 16:02:34,145 - database.crud - INFO - [CRUD] Начинаем удаление пользователя 42 (test@example.com)
2025-08-24 16:02:34,167 - database.crud - INFO - [CRUD] Этап 1: Очистка записей без FK зависимостей...
2025-08-24 16:02:34,189 - database.crud - INFO - [CRUD] Этап 2: Удаление основных связанных записей...
2025-08-24 16:02:34,201 - database.crud - INFO - [CRUD] Этап 3: Удаление токенов и настроек...
2025-08-24 16:02:34,223 - database.crud - INFO - [CRUD] Этап 4: Удаление финансовых записей...
2025-08-24 16:02:34,245 - database.crud - INFO - [CRUD] Этап 5: Финальное удаление пользователя...
2025-08-24 16:02:34,267 - database.crud - INFO - [CRUD] Пользователь 42 успешно удален со всеми связанными записями
2025-08-24 16:02:34,289 - api.admin - INFO - Successfully deleted user test@example.com (ID: 42) by admin admin@example.com
```

---

## 🚨 Troubleshooting Guide

### Common Issues & Solutions

#### 1. ForeignKey Violations Still Occur
**Symptoms**: `ForeignKeyViolation` errors during deletion
**Diagnosis**: New table added without updating deletion logic
**Solution**: 
- Identify new table with FK to users.id
- Add to appropriate deletion stage in `crud.delete_user()`
- Test thoroughly

#### 2. Partial Deletion Success
**Symptoms**: User deleted but orphaned records remain
**Diagnosis**: Transaction rollback occurred mid-process
**Solution**:
- Check logs for specific error
- Manually clean orphaned records
- Fix underlying issue
- Re-attempt deletion

#### 3. Permission Denied Errors
**Symptoms**: HTTP 403 when trying to delete
**Diagnosis**: User lacks admin role
**Solution**:
- Verify user has `role = 'admin'` in database
- Check authentication token validity
- Ensure proper admin authentication

#### 4. Cannot Delete Admin Users
**Symptoms**: Self-deletion blocked
**Diagnosis**: Built-in protection working correctly
**Solution**:
- Use different admin account
- Or modify user role first, then delete

### Emergency Recovery Procedures

#### If User Partially Deleted
```sql
-- Check for orphaned records
SELECT 'balance_transactions' as table_name, count(*) as orphans 
FROM balance_transactions bt 
LEFT JOIN users u ON bt.user_id = u.id 
WHERE u.id IS NULL AND bt.user_id = :deleted_user_id

UNION ALL

SELECT 'dialog_messages' as table_name, count(*) as orphans
FROM dialog_messages dm
JOIN dialogs d ON dm.dialog_id = d.id
LEFT JOIN users u ON d.user_id = u.id
WHERE u.id IS NULL AND d.user_id = :deleted_user_id;

-- Clean up orphaned records manually if found
DELETE FROM balance_transactions 
WHERE user_id = :deleted_user_id 
  AND user_id NOT IN (SELECT id FROM users);
```

#### Database Integrity Check
```sql
-- Verify no broken FK constraints remain
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'users';
```

---

## 🔧 Maintenance & Monitoring

### Regular Maintenance Tasks

#### Weekly
- [ ] Review deletion logs for any errors
- [ ] Check for orphaned records
- [ ] Verify admin panel functionality

#### Monthly  
- [ ] Update deletion procedure if new tables added
- [ ] Review and archive old audit logs
- [ ] Test deletion process in staging environment

#### When Adding New Tables
- [ ] Check if new table has FK to users.id
- [ ] Update `crud.delete_user()` if needed
- [ ] Add table to documentation
- [ ] Test deletion with new table

### Monitoring Queries

```sql
-- Find users with high data footprint (expensive to delete)
SELECT 
    u.id, 
    u.email,
    COUNT(DISTINCT d.id) as dialog_count,
    COUNT(DISTINCT dm.id) as message_count,
    COUNT(DISTINCT doc.id) as document_count,
    COUNT(DISTINCT bt.id) as transaction_count
FROM users u
LEFT JOIN dialogs d ON u.id = d.user_id
LEFT JOIN dialog_messages dm ON d.id = dm.dialog_id  
LEFT JOIN documents doc ON u.id = doc.user_id
LEFT JOIN balance_transactions bt ON u.id = bt.user_id
GROUP BY u.id, u.email
HAVING COUNT(DISTINCT d.id) > 100 OR COUNT(DISTINCT dm.id) > 1000
ORDER BY message_count DESC;

-- Check for users with high financial activity (review before deletion)
SELECT 
    u.id,
    u.email, 
    ub.balance,
    ub.total_spent,
    ub.total_topped_up
FROM users u
JOIN user_balances ub ON u.id = ub.user_id
WHERE ub.total_topped_up > 1000 OR ub.balance > 100
ORDER BY ub.total_topped_up DESC;
```

---

## 🔗 Related Documentation

- [Database Schema](../db/schema.md) - Complete database table relationships
- [Admin Architecture](../admin/architecture.md) - Admin panel technical overview  
- [API Documentation](../api/endpoints.md) - Complete API endpoint reference
- [Backend Runbook](./backend.md) - General backend operations
- [Security Threat Model](../security/threat_model.md) - Security considerations

---

## 📞 Escalation Contacts

| Issue Type | Contact | Response Time |
|------------|---------|---------------|
| Critical DB Issues | Database Team | 15 minutes |
| Admin Panel Bugs | Frontend Team | 2 hours |
| User Deletion Failures | Backend Team | 1 hour |
| Data Recovery | DevOps Team | 30 minutes |

---

**Last Updated**: 2025-08-24  
**Document Owner**: Database Team  
**Review Schedule**: Monthly  
**Version**: 1.0  

---

*This runbook is part of the ChatAI MVP 9 Operations Documentation Suite*