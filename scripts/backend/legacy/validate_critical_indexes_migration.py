#!/usr/bin/env python3
"""
Validation script for critical performance indexes migration (803b93aca2d2)
Tests migration safety and verifies expected performance improvements.

Usage:
    python3 scripts/validate_critical_indexes_migration.py --mode [dry-run|pre-check|post-check]
"""

import argparse
import sys
import time
import psycopg2
from psycopg2.extras import RealDictCursor
import subprocess
import json
from datetime import datetime
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from core.app_config import get_database_url


class MigrationValidator:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.connection = None
        
    def connect(self):
        """Establish database connection"""
        try:
            self.connection = psycopg2.connect(
                self.database_url,
                cursor_factory=RealDictCursor
            )
            self.connection.autocommit = True
            return True
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            return False
    
    def execute_query(self, query: str, params=None):
        """Execute query safely"""
        try:
            cursor = self.connection.cursor()
            cursor.execute(query, params)
            return cursor.fetchall()
        except Exception as e:
            print(f"❌ Query failed: {e}")
            print(f"Query: {query}")
            return None
    
    def check_alembic_status(self):
        """Check current Alembic migration status"""
        print("🔍 Checking Alembic migration status...")
        
        try:
            result = subprocess.run(
                ['alembic', 'current'], 
                capture_output=True, 
                text=True, 
                cwd=Path(__file__).parent.parent
            )
            
            if result.returncode == 0:
                current = result.stdout.strip()
                print(f"✅ Current migration: {current}")
                return current
            else:
                print(f"❌ Alembic error: {result.stderr}")
                return None
        except Exception as e:
            print(f"❌ Failed to check Alembic status: {e}")
            return None
    
    def check_table_exists(self, table_name: str) -> bool:
        """Check if table exists"""
        query = """
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = %s
            )
        """
        result = self.execute_query(query, (table_name,))
        return result[0]['exists'] if result else False
    
    def check_existing_indexes(self):
        """Check existing indexes that might conflict"""
        print("🔍 Checking existing indexes...")
        
        query = """
            SELECT schemaname, tablename, indexname, indexdef
            FROM pg_indexes 
            WHERE indexname LIKE 'idx_%'
            ORDER BY tablename, indexname
        """
        
        indexes = self.execute_query(query)
        if indexes:
            print(f"📊 Found {len(indexes)} existing custom indexes:")
            for idx in indexes:
                print(f"   {idx['tablename']}.{idx['indexname']}")
        else:
            print("📊 No existing custom indexes found")
        
        return indexes
    
    def pre_migration_checks(self):
        """Run pre-migration safety checks"""
        print("\n" + "="*60)
        print("🔍 PRE-MIGRATION SAFETY CHECKS")
        print("="*60)
        
        # Check database connectivity
        if not self.connect():
            return False
        
        # Check Alembic status
        current = self.check_alembic_status()
        if not current:
            return False
        
        # Check required tables exist
        required_tables = [
            'users', 'assistants', 'dialogs', 'dialog_messages',
            'documents', 'user_knowledge', 'knowledge_embeddings',
            'bot_instances', 'ai_token_pool', 'balance_transactions'
        ]
        
        missing_tables = []
        for table in required_tables:
            if not self.check_table_exists(table):
                missing_tables.append(table)
        
        if missing_tables:
            print(f"❌ Missing required tables: {missing_tables}")
            return False
        
        print("✅ All required tables exist")
        
        # Check disk space
        disk_usage = self.check_disk_space()
        if disk_usage and disk_usage > 80:
            print(f"⚠️  High disk usage: {disk_usage}% - Index creation may fail")
        
        # Check current performance baseline
        self.measure_performance_baseline()
        
        # Check for long-running queries
        self.check_active_queries()
        
        print("✅ Pre-migration checks completed")
        return True
    
    def check_disk_space(self):
        """Check available disk space"""
        query = """
            SELECT 
                pg_size_pretty(pg_database_size(current_database())) as db_size,
                pg_database_size(current_database()) as db_size_bytes
        """
        result = self.execute_query(query)
        if result:
            print(f"📊 Database size: {result[0]['db_size']}")
            return None  # Can't easily check disk usage from SQL
        return None
    
    def check_active_queries(self):
        """Check for potentially blocking queries"""
        query = """
            SELECT count(*) as active_queries
            FROM pg_stat_activity 
            WHERE state != 'idle' 
              AND query NOT LIKE '%pg_stat_activity%'
              AND query_start < now() - interval '5 minutes'
        """
        
        result = self.execute_query(query)
        if result and result[0]['active_queries'] > 0:
            print(f"⚠️  {result[0]['active_queries']} long-running queries detected")
        else:
            print("✅ No long-running queries detected")
    
    def measure_performance_baseline(self):
        """Measure current query performance baseline"""
        print("📊 Measuring performance baseline...")
        
        test_queries = [
            ("assistants_by_user", "SELECT COUNT(*) FROM assistants WHERE user_id = 1"),
            ("dialogs_by_assistant", "SELECT COUNT(*) FROM dialogs WHERE assistant_id = 1 ORDER BY started_at DESC LIMIT 10"),
            ("messages_by_dialog", "SELECT COUNT(*) FROM dialog_messages WHERE dialog_id = 1 ORDER BY timestamp DESC LIMIT 50"),
            ("documents_by_user", "SELECT COUNT(*) FROM documents WHERE user_id = 1 ORDER BY upload_date DESC"),
        ]
        
        baseline = {}
        for name, query in test_queries:
            start_time = time.time()
            result = self.execute_query(query)
            end_time = time.time()
            
            if result is not None:
                execution_time = (end_time - start_time) * 1000  # Convert to ms
                baseline[name] = execution_time
                print(f"   {name}: {execution_time:.2f}ms")
            else:
                baseline[name] = None
                print(f"   {name}: FAILED")
        
        # Save baseline for post-migration comparison
        with open('/tmp/migration_baseline.json', 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'baseline': baseline
            }, f, indent=2)
        
        return baseline
    
    def dry_run_migration(self):
        """Generate SQL for migration without executing"""
        print("\n" + "="*60)
        print("🧪 DRY RUN - GENERATING MIGRATION SQL")
        print("="*60)
        
        try:
            result = subprocess.run(
                ['alembic', 'upgrade', 'head', '--sql'],
                capture_output=True,
                text=True,
                cwd=Path(__file__).parent.parent
            )
            
            if result.returncode == 0:
                print("✅ Migration SQL generated successfully")
                
                # Save SQL to file for review
                sql_file = f"/tmp/migration_sql_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
                with open(sql_file, 'w') as f:
                    f.write(result.stdout)
                
                print(f"📁 SQL saved to: {sql_file}")
                
                # Basic SQL validation
                sql_content = result.stdout
                index_count = sql_content.count('CREATE INDEX')
                print(f"📊 Migration will create {index_count} indexes")
                
                if 'CREATE EXTENSION IF NOT EXISTS vector' in sql_content:
                    print("✅ pgvector extension will be created")
                
                if 'CONCURRENTLY' in sql_content:
                    print("✅ Indexes will be created CONCURRENTLY")
                
                return True
            else:
                print(f"❌ Migration SQL generation failed: {result.stderr}")
                return False
        except Exception as e:
            print(f"❌ Dry run failed: {e}")
            return False
    
    def post_migration_validation(self):
        """Validate migration results"""
        print("\n" + "="*60)
        print("✅ POST-MIGRATION VALIDATION")
        print("="*60)
        
        if not self.connect():
            return False
        
        # Check all expected indexes were created
        expected_indexes = [
            'idx_users_email_active',
            'idx_assistants_user_active_created',
            'idx_dialogs_assistant_started',
            'idx_messages_dialog_timestamp',
            'idx_documents_user_upload_date',
            'idx_user_knowledge_assistant_importance',
            'idx_knowledge_embeddings_ivfflat',
            'idx_bot_instances_user_active',
            'idx_balance_transactions_user_date'
        ]
        
        query = """
            SELECT indexname 
            FROM pg_indexes 
            WHERE indexname = ANY(%s)
        """
        
        result = self.execute_query(query, (expected_indexes,))
        found_indexes = [idx['indexname'] for idx in result] if result else []
        
        missing_indexes = set(expected_indexes) - set(found_indexes)
        if missing_indexes:
            print(f"❌ Missing indexes: {missing_indexes}")
            return False
        
        print(f"✅ All {len(expected_indexes)} critical indexes created successfully")
        
        # Check pgvector extension
        query = "SELECT * FROM pg_extension WHERE extname = 'vector'"
        result = self.execute_query(query)
        
        if result:
            print("✅ pgvector extension is installed")
        else:
            print("⚠️  pgvector extension not found")
        
        # Test performance improvements
        self.test_performance_improvements()
        
        # Check for any errors in recent logs
        self.check_for_migration_errors()
        
        print("✅ Post-migration validation completed successfully")
        return True
    
    def test_performance_improvements(self):
        """Test if performance has improved"""
        print("📊 Testing performance improvements...")
        
        # Load baseline if available
        try:
            with open('/tmp/migration_baseline.json', 'r') as f:
                baseline_data = json.load(f)
                baseline = baseline_data['baseline']
        except FileNotFoundError:
            print("⚠️  No baseline data found, skipping performance comparison")
            return
        
        # Re-run the same queries
        current_performance = self.measure_performance_baseline()
        
        print("\n📈 Performance Comparison:")
        for query_name in baseline:
            if baseline[query_name] and current_performance[query_name]:
                old_time = baseline[query_name]
                new_time = current_performance[query_name]
                improvement = ((old_time - new_time) / old_time) * 100
                
                if improvement > 0:
                    print(f"   {query_name}: {improvement:.1f}% faster ({old_time:.2f}ms → {new_time:.2f}ms)")
                else:
                    print(f"   {query_name}: {abs(improvement):.1f}% slower ({old_time:.2f}ms → {new_time:.2f}ms)")
    
    def check_for_migration_errors(self):
        """Check for any migration-related errors"""
        query = """
            SELECT count(*) as error_count
            FROM pg_stat_database_conflicts 
            WHERE datname = current_database()
        """
        
        result = self.execute_query(query)
        if result and result[0]['error_count'] > 0:
            print(f"⚠️  {result[0]['error_count']} database conflicts detected")
        else:
            print("✅ No database conflicts detected")
    
    def close(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()


def main():
    parser = argparse.ArgumentParser(description="Validate critical indexes migration")
    parser.add_argument('--mode', choices=['pre-check', 'dry-run', 'post-check'], 
                       required=True, help='Validation mode')
    parser.add_argument('--database-url', help='Database URL (optional)')
    
    args = parser.parse_args()
    
    # Get database URL
    database_url = args.database_url or get_database_url()
    if not database_url:
        print("❌ Database URL not provided or found in config")
        sys.exit(1)
    
    validator = MigrationValidator(database_url)
    
    try:
        if args.mode == 'pre-check':
            success = validator.pre_migration_checks()
        elif args.mode == 'dry-run':
            success = validator.dry_run_migration()
        elif args.mode == 'post-check':
            success = validator.post_migration_validation()
        
        if success:
            print(f"\n✅ {args.mode.upper()} completed successfully!")
            sys.exit(0)
        else:
            print(f"\n❌ {args.mode.upper()} failed!")
            sys.exit(1)
    
    finally:
        validator.close()


if __name__ == '__main__':
    main()