#!/usr/bin/env python3
"""
Debug script for Q&A search issues
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from database.connection import get_db
from database import models
from services.embeddings_service import embeddings_service

def debug_qa_search():
    """Debug Q&A search functionality"""
    
    print("🔍 Debug Q&A Search Issues")
    
    db = next(get_db())
    
    try:
        # Check if we have any Q&A knowledge records
        qa_count = db.query(models.QAKnowledge).count()
        print(f"📊 Total Q&A records in database: {qa_count}")
        
        # Check if we have Q&A embeddings
        qa_embeddings_count = db.query(models.KnowledgeEmbedding).filter(
            models.KnowledgeEmbedding.qa_id.isnot(None)
        ).count()
        print(f"📊 Total Q&A embeddings in database: {qa_embeddings_count}")
        
        if qa_count > 0:
            # Get sample Q&A record
            sample_qa = db.query(models.QAKnowledge).first()
            print(f"📝 Sample Q&A record:")
            print(f"   ID: {sample_qa.id}")
            print(f"   User ID: {sample_qa.user_id}")
            print(f"   Question: {sample_qa.question[:100]}...")
            print(f"   Answer: {sample_qa.answer[:100]}...")
            print(f"   Is Active: {sample_qa.is_active}")
            
            # Check embeddings for this Q&A
            qa_emb = db.query(models.KnowledgeEmbedding).filter(
                models.KnowledgeEmbedding.qa_id == sample_qa.id
            ).all()
            print(f"📊 Embeddings for this Q&A: {len(qa_emb)}")
            
            # Try search with fallback (no pgvector)
            try:
                print("\n🔍 Testing search with fallback method...")
                from services.embeddings_service import Vector
                print(f"pgvector Vector available: {Vector is not None}")
                
                # Search directly in the database
                query = "векторный поиск"
                print(f"Search query: {query}")
                
                # Try the search
                results = embeddings_service.search_relevant_qa(
                    query=query,
                    user_id=sample_qa.user_id,
                    assistant_id=None,
                    top_k=5,
                    min_similarity=0.3,  # Lower threshold for debugging
                    db=db
                )
                
                print(f"✅ Search completed, found {len(results)} results")
                for result in results:
                    print(f"  - Similarity: {result.get('similarity', 'N/A')}")
                    print(f"    Question: {result.get('question', 'N/A')[:50]}...")
            
            except Exception as search_error:
                print(f"❌ Search error: {search_error}")
                import traceback
                traceback.print_exc()
        
        # Check if QAKnowledge table exists and has correct structure
        from sqlalchemy import inspect
        inspector = inspect(db.bind)
        
        if 'qa_knowledge' in inspector.get_table_names():
            qa_columns = [col['name'] for col in inspector.get_columns('qa_knowledge')]
            print(f"\n📊 qa_knowledge table columns: {qa_columns}")
        else:
            print("\n❌ qa_knowledge table does not exist!")
            
    except Exception as e:
        print(f"❌ Debug failed: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    debug_qa_search()