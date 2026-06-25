import json
import numpy as np
import google.generativeai as genai
from app.config import settings

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """
    Splits text into chunks of character length 'chunk_size' with overlap.
    """
    if not text:
        return []
        
    chunks = []
    start = 0
    text_len = len(text)
    
    # If text is smaller than chunk size, return it as a single chunk
    if text_len <= chunk_size:
        return [text]
        
    while start < text_len:
        end = start + chunk_size
        chunks.append(text[start:end])
        start += (chunk_size - overlap)
        # Prevent infinite loop if overlap is larger than chunk_size
        if start >= end:
            break
            
    return chunks

def get_embeddings_batch(texts: list[str], api_key: str) -> list[list[float]]:
    """
    Generates embeddings in batch using the Gemini text-embedding-004 model.
    """
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set")
        
    genai.configure(api_key=api_key)
    
    # Gemini API supports up to 100 texts in a single batch call. We'll partition if necessary.
    batch_size = 100
    all_embeddings = []
    
    for i in range(0, len(texts), batch_size):
        subset = texts[i:i+batch_size]
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=subset,
            task_type="retrieval_document"
        )
        all_embeddings.extend(result['embedding'])
        
    return all_embeddings

def get_query_embedding(query: str, api_key: str) -> list[float]:
    """
    Generates embedding for a search query.
    """
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set")
        
    genai.configure(api_key=api_key)
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=query,
        task_type="retrieval_query"
    )
    return result['embedding']

def search_similarity(query: str, db_chunks: list, api_key: str, top_k: int = 5) -> list[dict]:
    """
    Compares the query embedding against the database chunks embeddings using cosine similarity.
    db_chunks: List of objects containing content, chunk_index, and json-string embedding.
    """
    if not db_chunks:
        return []
        
    # Get embedding for search query
    query_emb = get_query_embedding(query, api_key)
    query_vector = np.array(query_emb)
    
    scored_chunks = []
    for chunk in db_chunks:
        # Load embedding from json list
        try:
            chunk_vector = np.array(json.loads(chunk.embedding))
        except Exception:
            continue
            
        # Cosine similarity calculation
        dot_product = np.dot(query_vector, chunk_vector)
        norm_q = np.linalg.norm(query_vector)
        norm_c = np.linalg.norm(chunk_vector)
        
        similarity = float(dot_product / (norm_q * norm_c)) if (norm_q > 0 and norm_c > 0) else 0.0
        
        scored_chunks.append({
            "chunk_index": chunk.chunk_index,
            "content": chunk.content,
            "similarity": similarity
        })
        
    # Sort descending by similarity score
    scored_chunks.sort(key=lambda x: x["similarity"], reverse=True)
    return scored_chunks[:top_k]
