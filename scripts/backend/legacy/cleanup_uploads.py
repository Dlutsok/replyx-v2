import os
import sys
from typing import Set

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database.connection import SessionLocal
from database import models


def gather_db_files(db) -> Set[str]:
    paths: Set[str] = set()
    # Собираем все файлы пользователей по таблице documents
    docs = db.query(models.Document).all()
    for d in docs:
        rel = os.path.join(str(d.user_id), d.filename)
        paths.add(rel)
    return paths


def cleanup_uploads(root: str) -> None:
    db = SessionLocal()
    try:
        valid_rel_paths = gather_db_files(db)
    finally:
        db.close()

    # Удаляем нестандартные директории (не числовые user_id)
    for entry in os.listdir(root):
        full = os.path.join(root, entry)
        if not os.path.isdir(full):
            continue
        if not entry.isdigit():
            # Легаси каталоги вроде 'admin@example.com' или любые другие — удаляем рекурсивно
            print(f"Removing legacy uploads directory: {full}")
            try:
                import shutil
                shutil.rmtree(full, ignore_errors=True)
            except Exception as e:
                print(f"Failed to remove {full}: {e}")

    # Проходимся по числовым user_id и чистим файлы, которых нет в БД
    for entry in os.listdir(root):
        if not entry.isdigit():
            continue
        user_dir = os.path.join(root, entry)
        if not os.path.isdir(user_dir):
            continue
        for fname in os.listdir(user_dir):
            rel = os.path.join(entry, fname)
            if rel not in valid_rel_paths:
                path = os.path.join(user_dir, fname)
                print(f"Deleting orphan file: {path}")
                try:
                    os.remove(path)
                except Exception as e:
                    print(f"Failed to delete {path}: {e}")


if __name__ == "__main__":
    uploads_root = os.path.join(os.path.dirname(__file__), '..', 'uploads')
    uploads_root = os.path.abspath(uploads_root)
    print(f"Cleaning uploads at: {uploads_root}")
    if os.path.isdir(uploads_root):
        cleanup_uploads(uploads_root)
        print("Done")
    else:
        print("Uploads directory not found")


