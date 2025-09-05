import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from logging.config import fileConfig

from sqlalchemy import engine_from_config, create_engine
from sqlalchemy import pool

from alembic import context

# Используем конфиг приложения для получения строки подключения
try:
    from database.connection import SQLALCHEMY_DATABASE_URL
except Exception:
    SQLALCHEMY_DATABASE_URL = None

# this is the Alembic Config object, which provides
# the access to the values within the .ini file in use.
config = context.config

# Если доступна строка подключения из приложения — подставляем её вместо alembic.ini
if SQLALCHEMY_DATABASE_URL:
    config.set_main_option("sqlalchemy.url", SQLALCHEMY_DATABASE_URL)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
from database.connection import Base
import database.models  # Import the models module directly

target_metadata = Base.metadata

# Performance indexes maintained only in migrations, ignored by autogenerate
PERF_INDEXES = {
    "idx_dialogs_user_started",
    "idx_dialogs_handoff_status", 
    "idx_dialogs_assistant_created",
    "idx_dialog_messages_dialog_timestamp",
    "idx_dialog_messages_kind_timestamp",
    "idx_dialog_messages_sender_timestamp",
    "idx_documents_user_upload",
    "idx_documents_hash",
    "idx_knowledge_embeddings_user_doc",
    "idx_knowledge_embeddings_assistant_importance",
    "idx_knowledge_embeddings_source_created",
    "idx_knowledge_embeddings_chunk_hash",
    "idx_balance_transactions_user_created",
    "idx_balance_transactions_type_created",
    "idx_payments_user_created",
    "idx_payments_status_created",
    "idx_ai_token_usage_token_created",
    "idx_ai_token_usage_user_model",
    "ix_start_page_events_created_at",
    "idx_start_events_user_created",
    "idx_start_events_session_created",
    "idx_start_events_type_created",
    "idx_start_events_step_created",
    "idx_user_knowledge_user_assistant",
    "idx_user_knowledge_doc_type",
    "idx_user_knowledge_last_used",
    # pgvector performance indexes (critical for production)
    "knowledge_embeddings_embedding_cosine_idx",
    "knowledge_embeddings_embedding_l2_idx",
    "query_embeddings_cache_embedding_cosine_idx"
}

def include_object(obj, name, type_, reflected, compare_to):
    """Filter objects for autogenerate comparison."""
    if type_ == "index" and name in PERF_INDEXES:
        return False
    return True

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    db_url = SQLALCHEMY_DATABASE_URL or os.getenv("DATABASE_URL") or config.get_main_option("sqlalchemy.url")
    if not db_url:
        host = os.getenv("DB_HOST", "localhost")
        port = os.getenv("DB_PORT", "5432")
        name = os.getenv("DB_NAME", "postgres")
        user = os.getenv("DB_USER", "postgres")
        password = os.getenv("DB_PASSWORD", "")
        sslmode = os.getenv("DB_SSL_MODE", "disable")
        if password:
            db_url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}?sslmode={sslmode}"
        else:
            db_url = f"postgresql+psycopg2://{user}@{host}:{port}/{name}?sslmode={sslmode}"
    if db_url:
        connectable = create_engine(db_url, poolclass=pool.NullPool)
    else:
        # Фоллбэк на конфиг alembic.ini
        connectable = engine_from_config(
            config.get_section(config.config_ini_section),
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()