#!/usr/bin/env python3
"""
Simple debug script for Q&A without embedding queries
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from database.connection import get_db
from database import models
from sqlalchemy import text

def debug_simple():
    """Simple debug without embedding queries"""
    
    print("🔍 Simple Q&A Debug")
    
    db = next(get_db())
    
    try:
        # Check Q&A records count
        qa_count = db.execute(text("SELECT COUNT(*) FROM qa_knowledge")).fetchone()[0]
        print(f"📊 Q&A records: {qa_count}")
        
        # Check Q&A embeddings count without fetching embedding data
        qa_emb_count = db.execute(text("SELECT COUNT(*) FROM knowledge_embeddings WHERE qa_id IS NOT NULL")).fetchone()[0]
        print(f"📊 Q&A embeddings: {qa_emb_count}")
        
        # If we have Q&A records but no embeddings, let's manually try to index one
        if qa_count > 0 and qa_emb_count == 0:
            print("\n📝 Attempting to create test embedding...")
            
            # Get sample Q&A record (manual query to avoid type issues)
            qa_data = db.execute(text("SELECT id, user_id, question, answer FROM qa_knowledge LIMIT 1")).fetchone()
            
            print(f"Sample Q&A: ID={qa_data[0]}, User={qa_data[1]}")
            print(f"Question: {qa_data[2][:50]}...")
            print(f"Answer: {qa_data[3][:50]}...")
            
            # Try to generate embedding
            from services.embeddings_service import embeddings_service
            
            # Test embedding generation
            test_embedding = embeddings_service.generate_embedding("test question", qa_data[1])
            
            if test_embedding:
                print(f"✅ Embedding generation works, got {len(test_embedding)} dimensions")
                
                # Now try to manually insert an embedding
                try:
                    db.execute(text("""
                        INSERT INTO knowledge_embeddings 
                        (user_id, qa_id, chunk_index, chunk_text, embedding, doc_type, importance, token_count, source, chunk_hash)
                        VALUES (:user_id, :qa_id, :chunk_index, :chunk_text, :embedding, :doc_type, :importance, :token_count, :source, :chunk_hash)
                    """), {
                        'user_id': qa_data[1],
                        'qa_id': qa_data[0],
                        'chunk_index': 0,
                        'chunk_text': qa_data[2],
                        'embedding': test_embedding,
                        'doc_type': 'qa_question',
                        'importance': 10,
                        'token_count': len(qa_data[2].split()),
                        'source': 'qa_knowledge',
                        'chunk_hash': 'test_hash_123'
                    })
                    db.commit()
                    print("✅ Manual embedding insert successful")
                    
                    # Check count again
                    new_count = db.execute(text("SELECT COUNT(*) FROM knowledge_embeddings WHERE qa_id IS NOT NULL")).fetchone()[0]
                    print(f"📊 Q&A embeddings after manual insert: {new_count}")
                    
                except Exception as insert_error:
                    print(f"❌ Manual insert failed: {insert_error}")
                    db.rollback()
            else:
                print("❌ Embedding generation failed")
        
    except Exception as e:
        print(f"❌ Debug failed: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    debug_simple()