# ReplyX Security Threat Model & Baseline

**Last Updated:** 2025-09-14
**Classification:** Internal Use
**Version:** v1.3 - Complete Security Documentation

## Executive Summary

ReplyX employs a comprehensive multi-layered security architecture designed to protect against common web application vulnerabilities, data breaches, and unauthorized access. This document outlines the threat model, security controls, and mitigation strategies implemented across the platform.

## System Overview

ReplyX is a multi-tenant SaaS platform providing AI-powered customer support services. The system handles sensitive data including:
- User authentication credentials
- Customer conversation data
- AI model configurations and prompts
- Payment and billing information
- Business-critical operational data

## Security Architecture

### 1. Authentication & Authorization

#### Multi-Factor Authentication Framework
- **Primary:** JWT (JSON Web Tokens) with configurable expiration
- **Secondary:** CSRF tokens for state-changing operations
- **Session Management:** Redis-backed session storage with TTL
- **Role-Based Access Control (RBAC):** Three-tier permission system

**Roles & Permissions:**
```
┌─────────────┬─────────────────────────────────────────┐
│ Role        │ Permissions                             │
├─────────────┼─────────────────────────────────────────┤
│ user        │ Own assistants, dialogs, documents      │
│ operator    │ Handoff management, assigned dialogs    │
│ admin       │ Full system access, user management     │
└─────────────┴─────────────────────────────────────────┘
```

#### Implementation Details
```python
# JWT Configuration
ACCESS_TOKEN_EXPIRE_MINUTES = 24 * 60  # 24 hours
ALGORITHM = "HS256"
SECRET_KEY = file_based_secret("jwt_secret")

# CSRF Protection
X-CSRF-Token: required for POST/PUT/DELETE operations
Cookie-based CSRF validation with same-origin policy
```

### 2. Network Security

#### CORS (Cross-Origin Resource Sharing)
- **Dynamic CORS Policy:** Origin-based configuration
- **Main Application:** Strict same-origin policy
- **Widget Integration:** Configurable allowed origins
- **Development Mode:** Permissive localhost access

```python
# Dynamic CORS Configuration
CORS_MAIN_ORIGINS = ["https://app.replyx.ru"]
CORS_WIDGET_ORIGINS = ["*"]  # Customer websites
CORS_DEV_ORIGINS = ["http://localhost:3000"]
```

#### CSP (Content Security Policy)
- **Dynamic CSP Headers:** Context-aware policy generation
- **Iframe Embedding:** Secure widget embedding support
- **Script Sources:** Strict allowlist for trusted domains
- **Media Sources:** Controlled media loading policies

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://trusted-cdn.com;
  img-src 'self' data: blob:;
  connect-src 'self' wss: https:;
  frame-ancestors https://customer-domain.com;
```

### 3. Data Protection

#### Personally Identifiable Information (PII)
- **Data Minimization:** Collect only necessary user data
- **PII Redaction:** Automatic sensitive data masking in logs
- **Encryption at Rest:** Database field-level encryption for sensitive data
- **Encryption in Transit:** TLS 1.3 for all external communications

#### File Upload Security
```python
# File Upload Validation
ALLOWED_FILE_TYPES = [".pdf", ".docx", ".txt", ".md"]
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
UPLOAD_DIRECTORY = "/uploads"  # Isolated from execution paths

# Security Scanning
- MIME type validation
- File signature verification
- Antivirus scanning (production)
- Content analysis for malicious payloads
```

#### Data Retention & Privacy
- **GDPR Compliance:** Right to deletion and data portability
- **Data Anonymization:** User data anonymization on account deletion
- **Audit Logging:** Comprehensive security event tracking
- **Backup Encryption:** All database backups encrypted at rest

### 4. Application Security

#### Input Validation & Sanitization
```python
# Pydantic Models for Input Validation
class UserCreateRequest(BaseModel):
    email: EmailStr
    password: SecretStr = Field(min_length=8, max_length=128)
    first_name: str = Field(max_length=100)

# SQL Injection Prevention
- SQLAlchemy ORM with parameterized queries
- No dynamic SQL construction
- Database user with minimal privileges
```

#### Output Encoding & XSS Prevention
- **HTML Encoding:** All user content properly escaped
- **JSON Response Encoding:** UTF-8 with proper headers
- **Content-Type Headers:** Explicit content type specification
- **X-Content-Type-Options:** nosniff header

#### Rate Limiting
```python
# API Rate Limiting (per endpoint)
RATE_LIMITS = {
    "auth": "100/hour",           # Authentication endpoints
    "registration": "50/hour",     # Account registration
    "password_reset": "5/hour",    # Password reset requests
    "file_upload": "20/hour",      # Document uploads
    "ai_messages": "1000/hour",    # AI interactions
    "general": "3600/hour"         # General API access
}
```

### 5. Infrastructure Security

#### Secret Management
```bash
# Production Secret Management
/secrets/
├── jwt_secret              # JWT signing key
├── database_password       # Database credentials
├── openai_api_keys        # AI provider tokens
├── email_password         # SMTP credentials
└── payment_webhook_secret # Payment gateway verification

# Development (.env file)
SECRET_KEY=dev-secret-key-change-in-production
DATABASE_URL=postgresql://user:pass@localhost/db
OPENAI_API_KEY=sk-development-key
```

#### Database Security
- **Connection Security:** TLS-encrypted database connections
- **User Privileges:** Separate database users for different services
- **Query Monitoring:** Slow query logging and analysis
- **Backup Security:** Encrypted backups with separate storage credentials

#### Redis Security
- **Authentication:** Redis password protection
- **Network Isolation:** Firewall rules limiting Redis access
- **Data Encryption:** Sensitive session data encrypted before storage
- **Memory Security:** Automatic memory clearing for sensitive operations

### 6. Monitoring & Incident Response

#### Security Monitoring
```python
# Fail2ban Configuration
[chatai-backend]
enabled = true
filter = chatai-backend
logpath = /var/log/chatai/backend.log
maxretry = 5
findtime = 600
bantime = 3600
action = iptables-multiport[name=chatai, port="http,https"]
```

#### Audit Logging
- **Authentication Events:** Login/logout, failed attempts
- **Authorization Events:** Permission escalations, role changes
- **Data Access Events:** Sensitive data access, modifications
- **System Events:** Configuration changes, security incidents

#### Intrusion Detection
- **Fail2ban Integration:** Automatic IP blocking for suspicious behavior
- **Log Analysis:** Real-time log monitoring for attack patterns
- **Anomaly Detection:** Unusual access pattern identification
- **Alert System:** Immediate notification for critical security events

## Threat Analysis

### High-Risk Threats

#### 1. Authentication Bypass (OWASP A07:2021)
**Risk Level:** HIGH
**Attack Vectors:**
- JWT token manipulation or forgery
- Session hijacking through XSS
- Brute force attacks on login endpoints
- CSRF attacks on authenticated actions

**Mitigations:**
- Strong JWT secret management with regular rotation
- CSRF tokens for all state-changing operations
- Rate limiting on authentication endpoints
- Secure cookie configuration (HttpOnly, Secure, SameSite)

#### 2. SQL Injection (OWASP A03:2021)
**Risk Level:** HIGH
**Attack Vectors:**
- Direct SQL injection through input fields
- Second-order SQL injection through stored data
- Time-based blind SQL injection attacks

**Mitigations:**
- SQLAlchemy ORM with parameterized queries exclusively
- Input validation using Pydantic models
- Database user with minimal privileges
- Regular security testing and code reviews

#### 3. Sensitive Data Exposure (OWASP A02:2021)
**Risk Level:** HIGH
**Attack Vectors:**
- Unencrypted data transmission
- Weak encryption implementation
- Data leakage through logs or error messages
- Unauthorized database access

**Mitigations:**
- TLS 1.3 for all external communications
- Field-level encryption for PII data
- PII redaction in logs and error messages
- Database access controls and monitoring

#### 4. Cross-Site Scripting (XSS) (OWASP A03:2021)
**Risk Level:** MEDIUM
**Attack Vectors:**
- Stored XSS through user-generated content
- Reflected XSS through URL parameters
- DOM-based XSS in frontend components

**Mitigations:**
- Content Security Policy (CSP) headers
- Output encoding for all user content
- Input validation and sanitization
- Modern framework protections (React, FastAPI)

### Medium-Risk Threats

#### 5. Broken Access Control (OWASP A01:2021)
**Risk Level:** MEDIUM
**Attack Vectors:**
- Horizontal privilege escalation (accessing other users' data)
- Vertical privilege escalation (gaining admin access)
- Direct object reference attacks

**Mitigations:**
- Comprehensive RBAC implementation
- Object-level authorization checks
- Regular access control auditing
- Principle of least privilege

#### 6. Security Misconfiguration (OWASP A05:2021)
**Risk Level:** MEDIUM
**Attack Vectors:**
- Default credentials usage
- Unnecessary services enabled
- Verbose error messages
- Missing security headers

**Mitigations:**
- Infrastructure as Code (IaC) with security baselines
- Regular security configuration audits
- Automated security header implementation
- Production-specific error handling

### Low-Risk Threats

#### 7. Insufficient Logging & Monitoring (OWASP A09:2021)
**Risk Level:** LOW
**Current Status:** Well-mitigated through comprehensive audit logging

#### 8. Server-Side Request Forgery (SSRF) (OWASP A10:2021)
**Risk Level:** LOW
**Current Status:** Limited external API calls with strict validation

## Incident Response Plan

### 1. Detection & Assessment (0-15 minutes)
- Automated alert triggers security team notification
- Initial assessment of threat severity and scope
- Isolation of affected systems if necessary

### 2. Containment & Mitigation (15-60 minutes)
- Implement temporary mitigation measures
- Block malicious IP addresses or user accounts
- Deploy emergency patches if available

### 3. Investigation & Forensics (1-24 hours)
- Detailed log analysis and forensic investigation
- Determine root cause and attack methodology
- Document evidence for potential legal proceedings

### 4. Recovery & Restoration (24-72 hours)
- Implement permanent fixes for identified vulnerabilities
- Restore affected services and verify system integrity
- Conduct additional security testing

### 5. Post-Incident Review (72+ hours)
- Comprehensive incident analysis and lessons learned
- Update security procedures and controls
- Communicate findings to stakeholders

## Security Testing & Validation

### Regular Security Activities
- **Quarterly:** Penetration testing by external security firm
- **Monthly:** Automated vulnerability scanning
- **Weekly:** Dependency vulnerability assessments
- **Daily:** Security log review and analysis

### Compliance & Standards
- **OWASP Top 10:** Regular assessment against current threats
- **GDPR Compliance:** Privacy by design implementation
- **SOC 2 Type II:** Annual security audit preparation
- **ISO 27001:** Information security management alignment

## Security Metrics & KPIs

### Key Security Indicators
```python
# Security Metrics Dashboard
SECURITY_METRICS = {
    "failed_login_attempts": "< 100/day",
    "successful_attacks": "0",
    "security_incidents": "< 1/month",
    "vulnerability_remediation": "< 48 hours",
    "uptime_availability": "> 99.9%",
    "backup_success_rate": "> 99%"
}
```

### Monitoring Endpoints
- **Security Health:** `GET /api/security/health`
- **Threat Intelligence:** `GET /api/admin/security/threats`
- **Audit Logs:** `GET /api/admin/security/audit`

This comprehensive threat model provides a robust security foundation for the ReplyX platform, addressing current threats while remaining adaptable to emerging security challenges.
