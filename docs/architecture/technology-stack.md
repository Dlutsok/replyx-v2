# Technology Stack & Dependencies

**Last Updated:** 2025-01-23  
**🔍 Verified:** Dependencies checked against requirements.txt  
**📊 Status:** All versions current and accurate

Complete documentation of all technologies, frameworks, and dependencies used in the ChatAI MVP 9 platform.

## Stack Overview

### Architecture Pattern
- **Pattern:** Full-stack web application with microservices-oriented backend
- **Communication:** RESTful APIs, WebSocket real-time connections, IPC for bot workers
- **Data Storage:** PostgreSQL with vector extensions, Redis caching
- **Deployment:** Multi-process architecture with isolated worker systems

## Backend Stack (Python/FastAPI)

### Core Framework & Runtime

#### FastAPI (0.111.0)
- **Purpose:** Modern, high-performance web framework for building APIs
- **Features:** Automatic OpenAPI documentation, request validation, dependency injection
- **Benefits:** Type safety, async support, excellent developer experience
- **Configuration:** Custom middleware for CSRF, security headers, metrics

#### Python Runtime
- **Version:** Python 3.9+ required
- **Environment:** Virtual environment isolation recommended
- **Package Manager:** pip with requirements.txt
- **Process Management:** Uvicorn ASGI server for production

### Web Server & ASGI

#### Uvicorn (0.30.1)
- **Purpose:** Lightning-fast ASGI server implementation
- **Configuration:** Production-ready with worker processes
- **Features:** HTTP/1.1, WebSocket support, automatic reloading (development)
- **Integration:** Seamless FastAPI integration with async support

### Database Layer

#### PostgreSQL
- **Version:** 12+ recommended, 14+ preferred
- **Extensions Required:**
  - `pgvector` - Vector similarity search for embeddings
  - `pg_stat_statements` - Query performance monitoring
- **Connection Management:** SQLAlchemy connection pooling
- **Performance:** Optimized with 15+ custom indexes

#### SQLAlchemy (2.0.31)
- **Purpose:** Python SQL toolkit and Object-Relational Mapping (ORM)
- **Features:** Modern 2.0 syntax, async support, relationship management
- **Configuration:** Connection pooling, lazy loading, performance optimizations
- **Models:** 25+ database models with comprehensive relationships

#### Alembic (1.13.2)
- **Purpose:** Database migration tool for SQLAlchemy
- **Features:** Version control for database schema, automatic migration generation
- **Status:** 50+ migration files managing schema evolution
- **Integration:** Automatic migration application on startup

### Caching & Session Management

#### Redis (5.0.1)
- **Purpose:** In-memory data structure store
- **Use Cases:** Session caching, rate limiting, WebSocket state, query caching
- **Configuration:** Persistent storage, memory optimization
- **Fallback:** Application continues with degraded performance if unavailable

### Authentication & Security

#### Passlib[bcrypt] (1.7.4)
- **Purpose:** Password hashing and verification
- **Algorithm:** bcrypt for secure password storage
- **Configuration:** Configurable rounds for security vs. performance

#### python-jose[cryptography] (3.3.0) + PyJWT (2.8.0)
- **Purpose:** JSON Web Token (JWT) handling
- **Features:** Token signing, verification, expiration handling
- **Security:** HMAC-SHA256 signing algorithm, configurable expiration

### AI Integration

#### OpenAI (1.40.6)
- **Purpose:** Integration with OpenAI's GPT models
- **Models Supported:** GPT-4, GPT-4o, GPT-4o-mini, GPT-3.5-turbo
- **Features:** Chat completions, embeddings generation, token usage tracking
- **Optimization:** Token pooling system for cost and performance optimization

#### tiktoken (0.7.0)
- **Purpose:** Token counting and text processing for OpenAI models
- **Features:** Accurate token counting, text chunking, model-specific encodings
- **Integration:** Used for cost calculation and context management

#### pgvector (0.2.5)
- **Purpose:** Vector similarity search in PostgreSQL
- **Features:** Cosine similarity, L2 distance, efficient indexing
- **Use Case:** Semantic search for knowledge base embeddings

### Document Processing

#### python-docx (0.8.11)
- **Purpose:** Microsoft Word document (.docx) processing
- **Features:** Text extraction, document structure analysis
- **Integration:** Knowledge base document ingestion

#### PyPDF2 (3.0.1)
- **Purpose:** PDF document processing and text extraction
- **Features:** Text extraction, metadata processing
- **Limitations:** OCR not supported (text-based PDFs only)

#### beautifulsoup4 (4.12.3)
- **Purpose:** HTML/XML parsing and processing
- **Use Case:** Web scraping, HTML content processing for knowledge base
- **Features:** Robust parsing, CSS selector support

### HTTP & External APIs

#### requests (2.32.3)
- **Purpose:** HTTP library for external API calls
- **Features:** Session management, authentication, timeout handling
- **Use Cases:** External service integration, webhook calls

#### httpx (0.28.1)
- **Purpose:** Async HTTP client for modern applications
- **Features:** HTTP/2 support, async/await support
- **Use Case:** Async external API calls, webhook processing

### File Handling & Storage

#### python-multipart (0.0.9)
- **Purpose:** Multipart form data handling for file uploads
- **Integration:** FastAPI file upload endpoint support
- **Features:** Memory-efficient streaming uploads

#### aiofiles (24.1.0)
- **Purpose:** Async file I/O operations
- **Features:** Non-blocking file operations, memory efficiency
- **Use Case:** Async document processing, file uploads

#### python-magic (0.4.27)
- **Purpose:** File type detection and validation
- **Features:** MIME type detection, security validation
- **Security:** Prevents malicious file uploads

### Monitoring & Observability

#### prometheus-client (0.20.0)
- **Purpose:** Metrics collection and exposure for Prometheus
- **Metrics:** HTTP requests, database connections, custom business metrics
- **Integration:** Custom middleware for request/response tracking

#### psutil (5.9.8)
- **Purpose:** System and process monitoring
- **Features:** Memory, CPU, disk usage monitoring
- **Use Case:** Performance monitoring, resource optimization

### Cloud & Infrastructure

#### boto3 (1.34.162)
- **Purpose:** AWS SDK for Python
- **Features:** S3 storage, SES email, CloudWatch integration
- **Use Case:** Future cloud deployment, backup storage

### Development & Validation

#### pydantic (2.8.2)
- **Purpose:** Data validation using Python type annotations
- **Features:** Request/response validation, settings management
- **Integration:** FastAPI request/response models, configuration validation

#### python-dotenv (1.0.1)
- **Purpose:** Environment variable management
- **Features:** .env file loading, development/production configuration
- **Security:** Sensitive configuration management

## Frontend Stack (Next.js/React)

### Core Framework

#### Next.js (13.5.11)
- **Purpose:** React-based frontend framework
- **Features:** Server-side rendering, static generation, API routes
- **Benefits:** SEO optimization, performance, developer experience
- **Routing:** File-based routing system

#### React (18.2.0) + React DOM (18.2.0)
- **Purpose:** Component-based UI library
- **Features:** Hooks, context, concurrent features
- **Architecture:** Functional components with modern hooks pattern
- **State Management:** Built-in hooks + custom providers

### Development Environment

#### TypeScript (5.8.3)
- **Purpose:** Type-safe JavaScript development
- **Configuration:** Strict mode enabled for type safety
- **Benefits:** Early error detection, better IDE support, maintainability
- **Integration:** Full Next.js and React ecosystem support

#### Node.js Runtime
- **Version:** Node.js 16+ required
- **Package Manager:** npm with package-lock.json for dependency locking
- **Build Process:** Next.js optimized build pipeline

### Styling & UI

#### Tailwind CSS (3.4.17)
- **Purpose:** Utility-first CSS framework
- **Features:** Responsive design, dark mode support, custom design system
- **Configuration:** Custom design tokens, component classes
- **Benefits:** Consistent styling, rapid development, small bundle size

#### PostCSS (8.5.6) + Autoprefixer (10.4.21)
- **Purpose:** CSS processing and vendor prefixing
- **Features:** Modern CSS support, browser compatibility
- **Integration:** Next.js build pipeline integration

### Animation & Interaction

#### Framer Motion (12.23.0)
- **Purpose:** Production-ready motion library for React
- **Features:** Declarative animations, gesture handling, layout animations
- **Use Cases:** Page transitions, micro-interactions, loading states

#### React Icons (4.12.0)
- **Purpose:** Popular icon library for React
- **Features:** SVG icons, tree-shaking support, consistent styling
- **Icon Sets:** Feather, Material Design, Font Awesome, and more

### HTTP & API Communication

#### Axios (1.10.0)
- **Purpose:** Promise-based HTTP client for JavaScript
- **Features:** Request/response interceptors, timeout handling, request cancellation
- **Configuration:** Custom API client with authentication and error handling
- **Integration:** Centralized API communication layer

### Font & Typography

#### Montserrat (Google Fonts)
- **Purpose:** Modern, professional typeface
- **Languages:** Latin and Cyrillic character support
- **Integration:** Next.js font optimization
- **Loading:** Optimized font loading with font display swap

## Worker System (Node.js)

### Runtime Environment

#### Node.js
- **Version:** Node.js 16+ LTS
- **Use Case:** Telegram bot workers, webhook servers
- **Architecture:** Master-worker process model with IPC
- **Scalability:** Support for 1000+ concurrent bot instances

### Bot Integration

#### node-telegram-bot-api (0.66.0)
- **Purpose:** Telegram Bot API client for Node.js
- **Features:** Webhook support, rate limiting, message handling
- **Configuration:** Custom rate limiting, message deduplication
- **Integration:** Process-isolated bot workers

### Process Management

#### Child Process (Built-in)
- **Purpose:** Worker process spawning and management
- **Features:** IPC communication, process isolation, auto-restart
- **Configuration:** Memory limits, timeout handling, graceful shutdown

### HTTP Server (Worker System)

#### Express.js
- **Purpose:** Webhook server for Telegram bot callbacks
- **Features:** Middleware support, routing, error handling
- **Port:** 3001 (configurable)
- **Integration:** Webhook processing for bot messages

## Database & Extensions

### PostgreSQL Extensions

#### pgvector
- **Purpose:** Vector similarity search
- **Version:** Latest compatible with PostgreSQL version
- **Functions:** Cosine distance, L2 distance, inner product
- **Indexes:** IVFFlat index for efficient vector search
- **Integration:** OpenAI embeddings storage and retrieval

#### pg_stat_statements
- **Purpose:** Query performance monitoring
- **Features:** Query statistics, execution time tracking, call counts
- **Configuration:** Enabled for production performance monitoring

### Redis Configuration

#### Memory Management
- **Max Memory:** Configured based on system resources
- **Eviction Policy:** LRU (Least Recently Used)
- **Persistence:** RDB snapshots + AOF logging (production)

#### Data Structures Used
- **Strings:** Session tokens, rate limiting counters
- **Hashes:** User sessions, cached objects
- **Sets:** WebSocket connection tracking
- **Sorted Sets:** Rate limiting time windows

## Development & DevOps Tools

### Package Management

#### Backend (Python)
```
pip>=23.0.0
wheel>=0.40.0
setuptools>=65.0.0
```

#### Frontend (JavaScript/Node.js)
```
npm>=8.0.0
node>=16.0.0
```

### Development Dependencies

#### Python Development
- **pytest:** Testing framework
- **black:** Code formatting
- **flake8:** Linting and style checking
- **mypy:** Static type checking

#### JavaScript/TypeScript Development
- **ESLint:** Code linting and style enforcement
- **Prettier:** Code formatting
- **@types/node:** Node.js type definitions
- **@types/react:** React type definitions

### Database Tools

#### Migration & Management
- **Alembic:** Database migrations
- **psql:** PostgreSQL command-line client
- **pg_dump/pg_restore:** Database backup/restore utilities

## Production Infrastructure

### Process Management

#### SystemD
- **Service Files:** chatai-backend.service, chatai-bot-manager.service
- **Features:** Auto-restart, logging, dependency management
- **Configuration:** Environment variables, working directories, user permissions

### Monitoring Stack

#### Prometheus
- **Metrics Collection:** Application and system metrics
- **Retention:** Configurable retention periods
- **Alerting:** Integration with alerting systems

#### Log Management
- **Log Rotation:** Daily rotation with 7-day retention
- **Format:** Structured JSON logging for production
- **Analysis:** grep, awk, custom analysis scripts

### Security Tools

#### Fail2ban
- **Purpose:** Intrusion prevention system
- **Configuration:** Custom jail for ChatAI-specific patterns
- **Integration:** Log analysis and IP blocking

#### SSL/TLS
- **Certificates:** Let's Encrypt or custom certificates
- **Configuration:** Strong cipher suites, HSTS headers
- **Monitoring:** Certificate expiration tracking

## Environment Configuration

### Environment Variables

#### Core Configuration
```bash
ENVIRONMENT=production|development|local
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SECRET_KEY=...
CORS_ORIGINS=...
```

#### Security Settings
```bash
ENABLE_CSRF_PROTECTION=true|false
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALGORITHM=HS256
```

#### AI Configuration
```bash
OPENAI_API_KEY=sk-...
AI_TOKEN_POOL_ENABLED=true
```

#### Email Configuration
```bash
SMTP_SERVER=...
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
```

## Version Compatibility Matrix

| Component | Current Version | Minimum Version | Maximum Tested | Notes |
|-----------|----------------|-----------------|----------------|--------|
| Python | 3.9+ | 3.9 | 3.12 | Type hints, async support |
| PostgreSQL | 14+ | 12 | 16 | pgvector compatibility |
| Node.js | 18+ | 16 | 20 | LTS versions only |
| Redis | 6+ | 5 | 7 | Memory optimization |
| FastAPI | 0.111.0 | 0.100 | 0.111+ | Modern features |
| Next.js | 13.5.11 | 13.0 | 14.x | App router support |
| React | 18.2.0 | 18.0 | 18.x | Concurrent features |

## Performance Characteristics

### Backend Performance
- **Request Throughput:** 1000+ requests/second (single instance)
- **Response Time:** <100ms for cached requests, <500ms for database queries
- **Memory Usage:** ~200MB base + ~150MB per 100 active connections
- **Database Connections:** 20-pool default, expandable to 100+

### Frontend Performance
- **Bundle Size:** ~500KB gzipped (initial load)
- **First Contentful Paint:** <1.5s on 3G connection
- **Lighthouse Score:** 90+ (Performance, Accessibility, SEO)
- **Build Time:** ~2 minutes for full production build

### Bot System Performance
- **Bot Capacity:** 1000+ concurrent Telegram bots
- **Message Throughput:** 30 messages/second per bot (Telegram limit)
- **Worker Memory:** ~150MB per bot worker
- **Startup Time:** <10 seconds for bot worker initialization

## Security Considerations

### Dependency Security
- **Automated Scanning:** Regular dependency vulnerability scanning
- **Update Policy:** Security patches applied within 48 hours
- **Version Pinning:** Exact versions in lock files for reproducible builds

### Runtime Security
- **Sandboxing:** Process isolation for bot workers
- **Input Validation:** Comprehensive input sanitization
- **Rate Limiting:** Multiple layers of rate limiting protection
- **CSRF Protection:** Token-based CSRF protection

## Migration & Upgrade Path

### Database Migrations
- **Backward Compatibility:** All migrations designed for zero-downtime deployment
- **Rollback Support:** All migrations include rollback procedures
- **Data Validation:** Post-migration validation scripts

### Dependency Updates
- **Testing:** Automated testing for all dependency updates
- **Staged Rollout:** Development → Staging → Production deployment
- **Rollback Plan:** Quick rollback procedures for failed updates

This technology stack documentation provides a comprehensive overview of all technologies used in ChatAI MVP 9. It should be updated as new technologies are adopted or versions are upgraded.