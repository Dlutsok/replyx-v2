cat > fix_alembic.py << 'EOF'
from database.connection import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("DELETE FROM alembic_version"))
    conn.commit()
    print("Alembic version cleared")

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE assistants ADD COLUMN IF NOT EXISTS widget_version VARCHAR DEFAULT NULL"))
    conn.commit()
    print("Column added")

with engine.connect() as conn:
    conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('a1b2c3d4e5f6')"))
    conn.commit()
    print("Alembic version set")