# 🌐 Frontend Operations Runbook (Next.js/React)

**Complete operational guide for ChatAI frontend management, deployment, and troubleshooting.**

---

## 📋 **Quick Reference**

### **Development Commands:**
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript checking
```

### **Production Commands:**
```bash
npm run build && npm start    # Build and start production
pm2 start ecosystem.config.js # Start with PM2
pm2 restart chatai-frontend   # Restart production
pm2 logs chatai-frontend      # View logs
```

---

## 🚀 **Development Setup**

### **Prerequisites:**
- ✅ Node.js 16+ LTS
- ✅ npm 8+
- ✅ Backend API running (port 8000)

### **Initial Setup:**

```bash
# Clone and setup
cd /path/to/chatai/frontend
npm install

# Setup environment variables
cp .env.example .env.local
nano .env.local
```

### **Environment Variables (.env.local):**

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Frontend URLs
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_WIDGET_URL=http://localhost:3000

# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_CHAT_WIDGET=true
NEXT_PUBLIC_DEBUG_MODE=true

# External Services
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

### **Start Development Server:**

```bash
npm run dev
```

**Expected Output:**
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
info  - Using webpack 5. Reason: Enabled by default
event - compiled client and server successfully in 2.1s
```

**Verify Setup:**
- ✅ Frontend: http://localhost:3000
- ✅ API Connection: Check browser console for errors
- ✅ Hot Reload: Edit any component and see changes

---

## 🏗️ **Production Deployment**

### **Build Process:**

```bash
# Production build
npm run build

# Verify build
npm run start
```

**Build Output Analysis:**
```
Route (pages)                              Size     First Load JS
┌ ○ /                                      2.1 kB          89.2 kB
├   /_app                                  0 B             87.1 kB
├ ○ /404                                   194 B           87.3 kB
├ ○ /dashboard                             4.2 kB          91.3 kB
├ ○ /login                                 1.8 kB          88.9 kB
└ ○ /chat/[id]                             3.1 kB          90.2 kB

○  (Static)  automatically rendered as static HTML (uses no initial props)
```

### **Production Server Setup:**

#### **Option 1: PM2 (Recommended)**

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'chatai-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/opt/chatai/frontend',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      NEXT_PUBLIC_API_URL: 'https://api.chatai.com'
    },
    log_file: '/var/log/chatai/frontend.log',
    error_file: '/var/log/chatai/frontend-error.log',
    out_file: '/var/log/chatai/frontend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    max_memory_restart: '512M',
    watch: false,
    ignore_watch: ['node_modules', '.next']
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### **Option 2: Systemd Service**

```bash
# Create systemd service
sudo tee /etc/systemd/system/chatai-frontend.service << 'EOF'
[Unit]
Description=ChatAI Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/chatai/frontend
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl enable chatai-frontend
sudo systemctl start chatai-frontend
sudo systemctl status chatai-frontend
```

### **Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Static files
    location /_next/static/ {
        alias /opt/chatai/frontend/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Main app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 📊 **Performance Optimization**

### **Bundle Analysis:**

```bash
# Analyze bundle size
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
```

### **Performance Checklist:**

#### **Code Splitting:**
```javascript
// Dynamic imports
const ChatWidget = dynamic(() => import('../components/ChatWidget'), {
  loading: () => <p>Loading...</p>,
  ssr: false
});

// Page-level code splitting
const AdminPanel = dynamic(() => import('../components/AdminPanel'), {
  ssr: false
});
```

#### **Image Optimization:**
```javascript
import Image from 'next/image';

// Optimized images
<Image
  src="/images/logo.png"
  alt="ChatAI Logo"
  width={200}
  height={100}
  priority
/>
```

#### **API Optimization:**
```javascript
// SWR for data fetching
import useSWR from 'swr';

function Profile() {
  const { data, error } = useSWR('/api/user', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000
  });

  if (error) return <div>Failed to load</div>;
  if (!data) return <div>Loading...</div>;
  return <div>Hello {data.name}!</div>;
}
```

### **Performance Monitoring:**

```javascript
// next.config.js
module.exports = {
  experimental: {
    measureTiming: true
  },
  poweredByHeader: false,
  generateEtags: false,
  compress: true
}
```

---

## 🐛 **Troubleshooting**

### **Common Issues & Solutions:**

#### **🔴 Build Failures:**

**Issue:** `Module not found` errors
```bash
# Solution: Clear cache and reinstall
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

**Issue:** TypeScript compilation errors
```bash
# Check for type errors
npm run type-check

# Fix common issues
npm install @types/node @types/react @types/react-dom --save-dev
```

**Issue:** Memory issues during build
```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

#### **🟡 Runtime Issues:**

**Issue:** API connection failures
```javascript
// Check environment variables
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);

// Test API connection
fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`)
  .then(res => res.json())
  .then(data => console.log('API Health:', data))
  .catch(err => console.error('API Error:', err));
```

**Issue:** WebSocket connection problems
```javascript
// Debug WebSocket connection
const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL);
ws.onopen = () => console.log('WebSocket connected');
ws.onerror = (error) => console.error('WebSocket error:', error);
ws.onclose = (event) => console.log('WebSocket closed:', event.code, event.reason);
```

**Issue:** Hydration mismatches
```javascript
// Use useEffect for client-only code
useEffect(() => {
  // Client-only logic here
}, []);

// Or suppress hydration warning (use sparingly)
<div suppressHydrationWarning={true}>
  {typeof window !== 'undefined' && <ClientComponent />}
</div>
```

#### **🟢 Performance Issues:**

**Issue:** Slow page loads
```bash
# Analyze loading performance
npm install -g lighthouse
lighthouse http://localhost:3000 --view
```

**Issue:** Large bundle sizes
```bash
# Identify large dependencies
npx webpack-bundle-analyzer .next/static/chunks/*.js
```

**Issue:** Memory leaks
```javascript
// Cleanup in useEffect
useEffect(() => {
  const interval = setInterval(() => {
    // Some recurring task
  }, 1000);

  return () => clearInterval(interval); // Cleanup
}, []);
```

### **Debug Mode:**

Enable debug mode in `.env.local`:
```bash
NEXT_PUBLIC_DEBUG_MODE=true
NODE_ENV=development
```

Debug information will be logged to browser console.

---

## 📱 **Mobile & Responsive Testing**

### **Testing Setup:**

```bash
# Install dev tools
npm install -g ngrok

# Expose local server
ngrok http 3000
```

### **Responsive Breakpoints:**

```css
/* Tailwind CSS breakpoints used in project */
/* sm: 640px */
/* md: 768px */
/* lg: 1024px */
/* xl: 1280px */
/* 2xl: 1536px */
```

### **Mobile Testing Checklist:**

- ✅ **Touch interactions** work correctly
- ✅ **Chat widget** responsive on mobile
- ✅ **Forms** are mobile-friendly
- ✅ **Navigation** collapses properly
- ✅ **Performance** acceptable on 3G

---

## 🔧 **Maintenance Tasks**

### **Daily Tasks:**

```bash
# Check application health
curl -f http://localhost:3000/api/health || echo "Frontend health check failed"

# Check disk space
df -h /opt/chatai/frontend

# Check logs for errors
tail -f /var/log/chatai/frontend-error.log
```

### **Weekly Tasks:**

```bash
# Update dependencies (test environment first)
npm audit
npm update

# Clean up logs
find /var/log/chatai -name "*.log" -mtime +7 -delete

# Performance check
lighthouse http://localhost:3000 --only-categories=performance
```

### **Monthly Tasks:**

```bash
# Security audit
npm audit --audit-level moderate

# Bundle size analysis
ANALYZE=true npm run build

# Update Node.js (LTS versions only)
nvm install --lts
nvm use --lts
```

---

## 📈 **Monitoring & Alerts**

### **Health Check Endpoint:**

```javascript
// pages/api/health.js
export default function handler(req, res) {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version
  };
  
  try {
    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.message = error;
    res.status(503).json(healthcheck);
  }
}
```

### **PM2 Monitoring:**

```bash
# Monitor with PM2
pm2 monit

# Setup PM2 web monitoring
pm2 install pm2-server-monit
```

### **Log Monitoring:**

```bash
# Watch for errors
tail -f /var/log/chatai/frontend-error.log | grep -i error

# Monitor performance
grep "slow" /var/log/chatai/frontend.log

# Check memory usage
ps aux | grep "npm start" | grep -v grep
```

---

## 🚨 **Emergency Procedures**

### **Quick Restart:**

```bash
# PM2 restart
pm2 restart chatai-frontend

# Systemd restart
sudo systemctl restart chatai-frontend

# Manual restart
pkill -f "npm start"
cd /opt/chatai/frontend && npm start &
```

### **Rollback Deployment:**

```bash
# If using git deployment
git checkout HEAD~1
npm install
npm run build
pm2 restart chatai-frontend

# If using backup
cp -r /opt/chatai/frontend-backup/* /opt/chatai/frontend/
pm2 restart chatai-frontend
```

### **Debug Production Issues:**

```bash
# Enable debug mode temporarily
export NODE_ENV=development
pm2 restart chatai-frontend

# Check recent errors
journalctl -u chatai-frontend -f

# Monitor real-time performance
top -p $(pgrep -f "npm start")
```

---

## 📚 **Development Workflows**

### **Local Development:**

```bash
# Standard workflow
git pull origin main
npm install
npm run dev

# With backend
cd ../backend && python3 main.py &
cd ../frontend && npm run dev
```

### **Testing Before Deploy:**

```bash
# Full test suite
npm run lint
npm run type-check
npm run build
npm run start

# Test production build locally
NODE_ENV=production npm start
```

### **Deployment Workflow:**

```bash
# 1. Test locally
npm run build && npm start

# 2. Commit changes
git add .
git commit -m "feat: new feature"
git push origin main

# 3. Deploy to production
ssh production-server
cd /opt/chatai/frontend
git pull origin main
npm install
npm run build
pm2 restart chatai-frontend

# 4. Verify deployment
curl -f http://localhost:3000/api/health
```

---

## 🔗 **Related Documentation**

### **Essential Links:**
- **[API Documentation](../api/GETTING_STARTED.md)** - Backend API integration
- **[WebSocket Guide](../realtime/websockets.md)** - Real-time features
- **[Architecture Overview](../architecture/overview.md)** - System architecture
- **[Backend Runbook](backend.md)** - Backend operations

### **External Resources:**
- **[Next.js Documentation](https://nextjs.org/docs)** - Framework documentation
- **[React Documentation](https://react.dev)** - React library
- **[Tailwind CSS](https://tailwindcss.com/docs)** - Styling framework
- **[PM2 Documentation](https://pm2.keymetrics.io/docs/)** - Process management

---

**📅 Last Updated:** 2025-01-23  
**🚀 Frontend Version:** Next.js 13.5.11  
**📊 Production Status:** ✅ Ready  
**🔄 Next Review:** 2025-02-23
