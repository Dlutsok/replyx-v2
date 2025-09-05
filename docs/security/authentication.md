# Authentication & Authorization

**Last Updated:** 2025-01-23  
**⚠️ SECURITY UPDATE:** Added CSRF warning

Comprehensive guide to authentication, authorization, and security mechanisms in ChatAI platform.

## Overview

ChatAI implements a multi-layered security system with:
- JWT-based authentication
- Role-based access control (RBAC)
- API rate limiting
- CSRF protection
- Security headers
- Input validation and sanitization

## Authentication System

### JWT Token Management

```python
class JWTManager:
    """Manages JWT token creation, validation, and refresh"""
    
    def __init__(self):
        self.secret_key = os.getenv("JWT_SECRET_KEY")
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30
        self.refresh_token_expire_days = 7
    
    def create_access_token(self, user_id: int, email: str, 
                          roles: List[str] = None) -> str:
        """Create JWT access token"""
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        payload = {
            "sub": str(user_id),
            "email": email,
            "roles": roles or [],
            "type": "access",
            "exp": expire,
            "iat": datetime.utcnow(),
            "jti": str(uuid.uuid4())  # Unique token ID
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(self, user_id: int) -> str:
        """Create JWT refresh token"""
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        
        payload = {
            "sub": str(user_id),
            "type": "refresh",
            "exp": expire,
            "iat": datetime.utcnow(),
            "jti": str(uuid.uuid4())
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str) -> dict:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Check if token is blacklisted
            if self.is_token_blacklisted(payload.get("jti")):
                raise JWTError("Token has been revoked")
            
            return payload
        
        except jwt.ExpiredSignatureError:
            raise JWTError("Token has expired")
        except jwt.InvalidTokenError:
            raise JWTError("Invalid token")
    
    def blacklist_token(self, jti: str):
        """Add token to blacklist"""
        # Store in Redis with expiration
        redis_client.setex(f"blacklist:{jti}", 
                          timedelta(days=self.refresh_token_expire_days).total_seconds(), 
                          "1")
    
    def is_token_blacklisted(self, jti: str) -> bool:
        """Check if token is blacklisted"""
        return redis_client.exists(f"blacklist:{jti}")
```

### User Authentication

```python
async def authenticate_user(email: str, password: str, db: Session) -> User:
    """Authenticate user with email and password"""
    
    # Check rate limiting
    if await is_login_rate_limited(email):
        raise AuthenticationError("Too many login attempts. Please try again later.")
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        await record_failed_login(email, "user_not_found")
        raise AuthenticationError("Invalid email or password")
    
    if not user.is_active:
        await record_failed_login(email, "account_disabled")
        raise AuthenticationError("Account is disabled")
    
    if not verify_password(password, user.password_hash):
        await record_failed_login(email, "invalid_password")
        raise AuthenticationError("Invalid email or password")
    
    # Update last login
    user.last_login = datetime.utcnow()
    user.login_count += 1
    db.commit()
    
    await record_successful_login(user.id)
    return user

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    """Hash password for storage"""
    return pwd_context.hash(password)
```

## Authorization System

### Role-Based Access Control

```python
class RoleManager:
    """Manages user roles and permissions"""
    
    ROLES = {
        "user": {
            "permissions": [
                "chat:read", "chat:write",
                "documents:upload", "documents:read",
                "balance:read", "profile:read", "profile:write"
            ]
        },
        "operator": {
            "permissions": [
                "chat:read", "chat:write",
                "handoff:accept", "handoff:transfer",
                "users:read", "analytics:read"
            ]
        },
        "admin": {
            "permissions": [
                "*"  # All permissions
            ]
        },
        "moderator": {
            "permissions": [
                "chat:read", "chat:moderate",
                "users:read", "users:suspend",
                "content:moderate", "reports:read"
            ]
        }
    }
    
    @classmethod
    def has_permission(cls, user_roles: List[str], required_permission: str) -> bool:
        """Check if user has required permission"""
        for role in user_roles:
            role_permissions = cls.ROLES.get(role, {}).get("permissions", [])
            
            if "*" in role_permissions:
                return True
            
            if required_permission in role_permissions:
                return True
            
            # Check wildcard permissions
            permission_prefix = required_permission.split(":")[0]
            if f"{permission_prefix}:*" in role_permissions:
                return True
        
        return False
    
    @classmethod
    def get_user_permissions(cls, user_roles: List[str]) -> Set[str]:
        """Get all permissions for user roles"""
        permissions = set()
        
        for role in user_roles:
            role_permissions = cls.ROLES.get(role, {}).get("permissions", [])
            permissions.update(role_permissions)
        
        return permissions

def require_permission(permission: str):
    """Decorator to require specific permission"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get current user from dependency injection
            current_user = kwargs.get("current_user")
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            user_roles = [role.name for role in current_user.roles]
            
            if not RoleManager.has_permission(user_roles, permission):
                raise HTTPException(
                    status_code=403, 
                    detail=f"Permission denied. Required: {permission}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator
```

### Protected Endpoints

```python
@app.post("/api/admin/users")
@require_permission("users:create")
async def create_user(user_data: UserCreate, 
                     current_user: User = Depends(get_current_admin)):
    """Create new user (admin only)"""
    pass

@app.get("/api/analytics/overview")
@require_permission("analytics:read")
async def get_analytics_overview(current_user: User = Depends(get_current_user)):
    """Get analytics overview (operators and admins)"""
    pass

@app.delete("/api/dialogs/{dialog_id}")
@require_permission("dialogs:delete")
async def delete_dialog(dialog_id: int, 
                       current_user: User = Depends(get_current_user)):
    """Delete dialog (moderators and admins)"""
    pass
```

## Security Dependencies

### Authentication Dependencies

```python
async def get_current_user(token: str = Depends(oauth2_scheme), 
                          db: Session = Depends(get_db)) -> User:
    """Get current authenticated user"""
    try:
        payload = jwt_manager.verify_token(token)
        user_id = int(payload.get("sub"))
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        if not user.is_active:
            raise HTTPException(status_code=401, detail="Inactive user")
        
        return user
        
    except JWTError as e:
        raise HTTPException(status_code=401, detail=str(e))

async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require admin role"""
    user_roles = [role.name for role in current_user.roles]
    
    if "admin" not in user_roles:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return current_user

async def get_current_operator(current_user: User = Depends(get_current_user)) -> User:
    """Require operator or admin role"""
    user_roles = [role.name for role in current_user.roles]
    
    if not any(role in user_roles for role in ["operator", "admin"]):
        raise HTTPException(status_code=403, detail="Operator access required")
    
    return current_user

async def get_optional_user(token: Optional[str] = Depends(oauth2_scheme_optional), 
                           db: Session = Depends(get_db)) -> Optional[User]:
    """Get current user if token provided (optional)"""
    if not token:
        return None
    
    try:
        return await get_current_user(token, db)
    except HTTPException:
        return None
```

## Rate Limiting

### Request Rate Limiting

```python
class RateLimiter:
    """Redis-based rate limiter"""
    
    def __init__(self, redis_client):
        self.redis = redis_client
    
    async def is_rate_limited(self, key: str, limit: int, 
                            window_seconds: int) -> bool:
        """Check if key is rate limited"""
        current_count = await self.redis.get(key)
        
        if current_count is None:
            # First request in window
            await self.redis.setex(key, window_seconds, 1)
            return False
        
        if int(current_count) >= limit:
            return True
        
        # Increment counter
        await self.redis.incr(key)
        return False
    
    async def get_rate_limit_info(self, key: str, limit: int) -> dict:
        """Get rate limit information"""
        current_count = await self.redis.get(key)
        ttl = await self.redis.ttl(key)
        
        return {
            "limit": limit,
            "remaining": max(0, limit - int(current_count or 0)),
            "reset_time": datetime.utcnow() + timedelta(seconds=ttl) if ttl > 0 else None
        }

def rate_limit(limit: int, window: int, per: str = "ip"):
    """Rate limiting decorator"""
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            # Determine rate limit key
            if per == "ip":
                key = f"rate_limit:ip:{request.client.host}"
            elif per == "user":
                current_user = kwargs.get("current_user")
                if current_user:
                    key = f"rate_limit:user:{current_user.id}"
                else:
                    key = f"rate_limit:ip:{request.client.host}"
            else:
                key = f"rate_limit:{per}:{request.client.host}"
            
            if await rate_limiter.is_rate_limited(key, limit, window):
                raise HTTPException(
                    status_code=429, 
                    detail="Rate limit exceeded",
                    headers={"Retry-After": str(window)}
                )
            
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

# Usage examples
@app.post("/api/auth/login")
@rate_limit(limit=5, window=300, per="ip")  # 5 attempts per 5 minutes per IP
async def login(request: Request, credentials: UserLogin):
    """Login endpoint with rate limiting"""
    pass

@app.post("/api/chat/message")
@rate_limit(limit=60, window=60, per="user")  # 60 messages per minute per user
async def send_message(request: Request, current_user: User = Depends(get_current_user)):
    """Send chat message with user rate limiting"""
    pass
```

## CSRF Protection

⚠️ **КРИТИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ О БЕЗОПАСНОСТИ:**

В текущем коде CSRF protection **ОТКЛЮЧЕНА ПО УМОЛЧАНИЮ**:

```python
# В backend/main.py (НЕБЕЗОПАСНО):
enable_csrf = os.getenv('ENABLE_CSRF_PROTECTION', 'false')  # ⚠️ DEFAULT = FALSE!
```

### 🔴 ОБЯЗАТЕЛЬНО для production:

```bash
# В .env файле или environment:
export ENABLE_CSRF_PROTECTION=true
```

### 🔧 Рекомендация: Исправить код

```python
# Изменить в backend/main.py на безопасный default:
enable_csrf = os.getenv('ENABLE_CSRF_PROTECTION', 'true')  # ✅ БЕЗОПАСНО
```

### CSRF Token Management

```python
class CSRFProtection:
    """CSRF token management"""
    
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.token_lifetime = 3600  # 1 hour
    
    def generate_csrf_token(self, user_id: int) -> str:
        """Generate CSRF token"""
        timestamp = int(time.time())
        token_data = f"{user_id}:{timestamp}"
        
        # Create HMAC signature
        signature = hmac.new(
            self.secret_key.encode(),
            token_data.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return f"{token_data}:{signature}"
    
    def verify_csrf_token(self, token: str, user_id: int) -> bool:
        """Verify CSRF token"""
        try:
            parts = token.split(":")
            if len(parts) != 3:
                return False
            
            token_user_id, timestamp, signature = parts
            
            # Check user ID
            if int(token_user_id) != user_id:
                return False
            
            # Check timestamp (token expiry)
            if int(time.time()) - int(timestamp) > self.token_lifetime:
                return False
            
            # Verify signature
            token_data = f"{token_user_id}:{timestamp}"
            expected_signature = hmac.new(
                self.secret_key.encode(),
                token_data.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
            
        except (ValueError, IndexError):
            return False

def require_csrf_token():
    """Decorator to require CSRF token for state-changing operations"""
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            # Skip CSRF for API requests with proper authentication
            if request.url.path.startswith("/api/"):
                auth_header = request.headers.get("Authorization")
                if auth_header and auth_header.startswith("Bearer "):
                    return await func(request, *args, **kwargs)
            
            # Get CSRF token from header or form
            csrf_token = request.headers.get("X-CSRF-Token")
            if not csrf_token:
                form_data = await request.form()
                csrf_token = form_data.get("csrf_token")
            
            if not csrf_token:
                raise HTTPException(status_code=403, detail="CSRF token missing")
            
            # Get current user
            current_user = kwargs.get("current_user")
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            # Verify CSRF token
            if not csrf_protection.verify_csrf_token(csrf_token, current_user.id):
                raise HTTPException(status_code=403, detail="Invalid CSRF token")
            
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator
```

## Security Headers

### Security Middleware

```python
class SecurityHeadersMiddleware:
    """Add security headers to all responses"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            async def send_wrapper(message):
                if message["type"] == "http.response.start":
                    headers = dict(message["headers"])
                    
                    # Add security headers
                    security_headers = {
                        b"x-content-type-options": b"nosniff",
                        b"x-frame-options": b"DENY",
                        b"x-xss-protection": b"1; mode=block",
                        b"strict-transport-security": b"max-age=31536000; includeSubDomains",
                        b"referrer-policy": b"strict-origin-when-cross-origin",
                        b"content-security-policy": self.get_csp_header(),
                        b"permissions-policy": b"geolocation=(), microphone=(), camera=()"
                    }
                    
                    headers.update(security_headers)
                    message["headers"] = list(headers.items())
                
                await send(message)
            
            await self.app(scope, receive, send_wrapper)
        else:
            await self.app(scope, receive, send)
    
    def get_csp_header(self) -> bytes:
        """Generate Content Security Policy header"""
        policy = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  # Adjust as needed
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self'",
            "connect-src 'self' wss: https:",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ]
        
        return "; ".join(policy).encode()
```

## Input Validation & Sanitization

### Request Validation

```python
class InputValidator:
    """Validate and sanitize user input"""
    
    @staticmethod
    def sanitize_html(content: str) -> str:
        """Sanitize HTML content"""
        allowed_tags = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li']
        
        return bleach.clean(
            content,
            tags=allowed_tags,
            attributes={},
            strip=True
        )
    
    @staticmethod
    def validate_email(email: str) -> str:
        """Validate email format"""
        email = email.strip().lower()
        
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            raise ValueError("Invalid email format")
        
        return email
    
    @staticmethod
    def validate_filename(filename: str) -> str:
        """Validate and sanitize filename"""
        # Remove path components
        filename = os.path.basename(filename)
        
        # Remove dangerous characters
        filename = re.sub(r'[^\w\s.-]', '', filename)
        
        # Limit length
        if len(filename) > 255:
            name, ext = os.path.splitext(filename)
            filename = name[:250] + ext
        
        if not filename:
            raise ValueError("Invalid filename")
        
        return filename
    
    @staticmethod
    def validate_user_input(content: str, max_length: int = 1000) -> str:
        """Validate general user input"""
        if not content or not content.strip():
            raise ValueError("Content cannot be empty")
        
        content = content.strip()
        
        if len(content) > max_length:
            raise ValueError(f"Content too long (max {max_length} characters)")
        
        # Check for SQL injection patterns
        sql_patterns = ['union', 'select', 'insert', 'update', 'delete', 'drop', '--', ';']
        content_lower = content.lower()
        
        for pattern in sql_patterns:
            if pattern in content_lower:
                logger.warning(f"Potential SQL injection attempt: {content[:100]}")
                raise ValueError("Invalid content detected")
        
        return content
```

## Security Monitoring

### Security Event Logging

```python
class SecurityLogger:
    """Log security-related events"""
    
    @staticmethod
    async def log_authentication_event(event_type: str, user_id: Optional[int], 
                                     ip_address: str, user_agent: str, 
                                     details: dict = None):
        """Log authentication events"""
        event_data = {
            "event_type": event_type,
            "user_id": user_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details or {}
        }
        
        logger.info(f"SECURITY_EVENT: {event_type}", extra=event_data)
        
        # Store in security audit table
        await store_security_event(event_data)
    
    @staticmethod
    async def log_authorization_failure(user_id: int, required_permission: str, 
                                      endpoint: str, ip_address: str):
        """Log authorization failures"""
        await SecurityLogger.log_authentication_event(
            "authorization_failure",
            user_id=user_id,
            ip_address=ip_address,
            user_agent="",
            details={
                "required_permission": required_permission,
                "endpoint": endpoint
            }
        )
    
    @staticmethod
    async def log_rate_limit_exceeded(identifier: str, limit_type: str, 
                                    ip_address: str):
        """Log rate limit violations"""
        await SecurityLogger.log_authentication_event(
            "rate_limit_exceeded",
            user_id=None,
            ip_address=ip_address,
            user_agent="",
            details={
                "identifier": identifier,
                "limit_type": limit_type
            }
        )

# Usage in endpoints
@app.post("/api/auth/login")
async def login(request: Request, credentials: UserLogin):
    """Login with security logging"""
    try:
        user = await authenticate_user(credentials.email, credentials.password, db)
        
        await SecurityLogger.log_authentication_event(
            "login_success",
            user_id=user.id,
            ip_address=request.client.host,
            user_agent=request.headers.get("User-Agent", "")
        )
        
        return {"access_token": jwt_manager.create_access_token(user.id, user.email)}
        
    except AuthenticationError as e:
        await SecurityLogger.log_authentication_event(
            "login_failure",
            user_id=None,
            ip_address=request.client.host,
            user_agent=request.headers.get("User-Agent", ""),
            details={"error": str(e)}
        )
        
        raise HTTPException(status_code=401, detail=str(e))
```

## Configuration

### Security Settings

```python
# Environment variables for security configuration
SECURITY_CONFIG = {
    "JWT_SECRET_KEY": os.getenv("JWT_SECRET_KEY"),
    "JWT_ACCESS_TOKEN_EXPIRE_MINUTES": int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30")),
    "JWT_REFRESH_TOKEN_EXPIRE_DAYS": int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7")),
    
    "CSRF_SECRET_KEY": os.getenv("CSRF_SECRET_KEY"),
    "CSRF_TOKEN_LIFETIME": int(os.getenv("CSRF_TOKEN_LIFETIME", "3600")),
    
    "RATE_LIMIT_ENABLED": os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true",
    "RATE_LIMIT_STORAGE": os.getenv("RATE_LIMIT_STORAGE", "redis://localhost:6379"),
    
    "SECURITY_HEADERS_ENABLED": os.getenv("SECURITY_HEADERS_ENABLED", "true").lower() == "true",
    "CSP_ENABLED": os.getenv("CSP_ENABLED", "true").lower() == "true",
    
    "PASSWORD_MIN_LENGTH": int(os.getenv("PASSWORD_MIN_LENGTH", "8")),
    "PASSWORD_REQUIRE_SPECIAL": os.getenv("PASSWORD_REQUIRE_SPECIAL", "true").lower() == "true",
    
    "SESSION_COOKIE_SECURE": os.getenv("SESSION_COOKIE_SECURE", "true").lower() == "true",
    "SESSION_COOKIE_HTTPONLY": os.getenv("SESSION_COOKIE_HTTPONLY", "true").lower() == "true",
    "SESSION_COOKIE_SAMESITE": os.getenv("SESSION_COOKIE_SAMESITE", "strict")
}
```

This authentication and authorization system provides enterprise-grade security for the ChatAI platform with comprehensive protection against common web vulnerabilities and attack vectors.

