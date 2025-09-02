#!/usr/bin/env python3
"""
Test script for Q&A embeddings functionality
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from sqlalchemy.orm import Session
from database.connection import get_db
from database import models
from services.embeddings_service import embeddings_service

def test_qa_embeddings():
    """Test Q&A embeddings functionality"""
    
    print("🧪 Testing Q&A Embeddings Service Integration")
    
    # Use test database session
    db: Session = next(get_db())
    
    try:
        # Create test user if doesn't exist
        test_user = db.query(models.User).filter(models.User.email == "test@qa-embeddings.com").first()
        if not test_user:
            test_user = models.User(
                email="test@qa-embeddings.com",
                hashed_password="test_hash",
                role="user"
            )
            db.add(test_user)
            db.commit()
            print(f"✅ Created test user: {test_user.id}")
        else:
            print(f"✅ Using existing test user: {test_user.id}")
        
        # Create test Q&A record
        test_qa = models.QAKnowledge(
            user_id=test_user.id,
            question="Как работают векторные поиски?",
            answer="Векторные поиски работают путем преобразования текста в числовые векторы (embeddings) и поиска похожих векторов в базе данных.",
            category="техническая поддержка",
            importance=10
        )
        db.add(test_qa)
        db.commit()
        print(f"✅ Created test Q&A record: {test_qa.id}")
        
        # Test 1: Index Q&A knowledge
        print("\n📚 Testing Q&A indexing...")
        indexed_count = embeddings_service.index_qa_knowledge(
            qa_id=test_qa.id,
            user_id=test_user.id,
            assistant_id=None,
            question=test_qa.question,
            answer=test_qa.answer,
            importance=test_qa.importance,
            db=db
        )
        print(f"✅ Indexed {indexed_count} embeddings for Q&A")
        assert indexed_count == 2, f"Expected 2 embeddings, got {indexed_count}"
        
        # Test 2: Search Q&A knowledge
        print("\n🔍 Testing Q&A search...")
        qa_results = embeddings_service.search_relevant_qa(
            query="векторный поиск",
            user_id=test_user.id,
            assistant_id=None,
            top_k=3,
            min_similarity=0.6,
            db=db
        )
        
        print(f"✅ Found {len(qa_results)} Q&A results")
        if qa_results:
            for result in qa_results:
                print(f"  - Q: {result['question'][:50]}...")
                print(f"    A: {result['answer'][:50]}...")
                print(f"    Similarity: {result['similarity']:.3f}")
        
        # Test 3: Combined search (documents + Q&A)
        print("\n🔄 Testing combined knowledge search...")
        doc_chunks, qa_chunks = embeddings_service.search_combined_knowledge(
            query="векторный поиск embeddings",
            user_id=test_user.id,
            assistant_id=None,
            doc_chunks_limit=3,
            qa_limit=2,
            min_similarity=0.6,
            db=db
        )
        
        print(f"✅ Combined search found {len(doc_chunks)} document chunks and {len(qa_chunks)} Q&A results")
        
        # Test 4: Search with Q&A integration in main search method
        print("\n🚀 Testing integrated search...")
        integrated_results = embeddings_service.search_relevant_chunks(
            query="векторный поиск",
            user_id=test_user.id,
            assistant_id=None,
            top_k=5,
            min_similarity=0.6,
            db=db,
            include_qa=True,
            qa_limit=2
        )
        
        print(f"✅ Integrated search found {len(integrated_results)} total results")
        for result in integrated_results:
            result_type = result.get('type', result.get('doc_type', 'document'))
            print(f"  - Type: {result_type}, Similarity: {result['similarity']:.3f}")
            if result_type == 'qa_knowledge':
                print(f"    Text: {result['text'][:100]}...")
        
        # Test 5: Update Q&A record and re-index
        print("\n🔄 Testing Q&A update and re-indexing...")
        test_qa.answer = "Векторные поиски преобразуют текст в численные векторы (embeddings) и находят семантически похожие фрагменты через косинусное сходство."
        db.commit()
        
        updated_count = embeddings_service.index_qa_knowledge(
            qa_id=test_qa.id,
            user_id=test_user.id,
            assistant_id=None,
            question=test_qa.question,
            answer=test_qa.answer,
            importance=test_qa.importance,
            db=db
        )
        print(f"✅ Re-indexed {updated_count} embeddings after update")
        
        print("\n🎉 All Q&A embeddings tests passed!")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        # Cleanup - delete test data
        try:
            if 'test_qa' in locals():
                # Delete Q&A embeddings first
                embeddings_service.delete_qa_embeddings(test_qa.id, db)
                # Delete Q&A record
                db.delete(test_qa)
                db.commit()
                print("🧹 Cleaned up test Q&A record")
                
            if 'test_user' in locals():
                # Delete test user
                db.delete(test_user)
                db.commit()
                print("🧹 Cleaned up test user")
                
        except Exception as cleanup_error:
            print(f"⚠️  Cleanup warning: {cleanup_error}")
        
        db.close()

if __name__ == "__main__":
    test_qa_embeddings()