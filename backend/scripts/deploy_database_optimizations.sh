#!/bin/bash

# 🚀 Database Optimization Deployment Script
# Applies all critical database optimizations for production

set -e  # Exit on any error

echo "🗄️ ChatAI Database Optimization Deployment"
echo "==========================================="

# Check if we're in the right directory
if [ ! -f "alembic.ini" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Check environment
ENV=${ENVIRONMENT:-production}
echo "📍 Environment: $ENV"

# Backup current migration state
echo "💾 Creating backup of current migration state..."
alembic current > migration_backup_$(date +%Y%m%d_%H%M%S).txt

# Show current migration status
echo "📊 Current migration status:"
alembic current

echo "🔍 Available heads:"
alembic heads

# Check if database is accessible
echo "🔗 Testing database connection..."
if ! python -c "from database.connection import engine; engine.connect().close(); print('✅ Database connection successful')"; then
    echo "❌ Database connection failed. Please check connection settings."
    exit 1
fi

echo "⚡ Applying performance optimizations..."

# Apply performance indexes migration
if alembic history | grep -q "add_critical_performance_indexes"; then
    echo "📈 Applying performance indexes..."
    alembic upgrade 981cde4c8177
else
    echo "⚠️  Performance indexes migration not found"
fi

# Apply money types fix
if alembic history | grep -q "fix_money_types_and_add_payment"; then
    echo "💰 Fixing money types and payment constraints..."
    alembic upgrade 5b0524bad321
else
    echo "⚠️  Money types migration not found"
fi

# Upgrade to latest
echo "⬆️  Upgrading to latest migration..."
alembic upgrade head

echo "🔍 Final migration status:"
alembic current

# Test database performance
echo "🏃‍♂️ Running performance tests..."
python << EOF
from database.connection import get_db_stats
from database.models import User, Dialog, DialogMessage
from database.connection import SessionLocal
import time

db = SessionLocal()
try:
    # Test query performance
    start = time.time()
    user_count = db.query(User).count()
    dialog_count = db.query(Dialog).count()
    message_count = db.query(DialogMessage).count()
    end = time.time()
    
    print(f"📊 Database stats (query time: {end-start:.3f}s):")
    print(f"   Users: {user_count:,}")
    print(f"   Dialogs: {dialog_count:,}")  
    print(f"   Messages: {message_count:,}")
    
    # Test connection pool
    stats = get_db_stats()
    print(f"🏊‍♂️ Connection pool:")
    print(f"   Pool size: {stats['pool_size']}")
    print(f"   Checked out: {stats['checked_out']}")
    print(f"   Overflow: {stats['overflow']}")
    
    print("✅ Performance tests passed")
    
except Exception as e:
    print(f"❌ Performance test failed: {e}")
    
finally:
    db.close()
EOF

echo ""
echo "✅ Database optimization deployment completed!"
echo ""
echo "🔧 Next steps:"
echo "1. Update production environment variables:"
echo "   - ENVIRONMENT=production"
echo "   - DB_SSL_MODE=require"
echo "   - DB_POOL_SIZE=15"
echo "   - DB_MAX_OVERFLOW=20"
echo ""
echo "2. Consider setting up PgBouncer for connection pooling"
echo "3. Monitor database performance with pg_stat_statements"
echo "4. Set up automated backups and monitoring"
echo ""
echo "📚 See DATABASE_PRODUCTION_GUIDE.md for full deployment guide"