-- =============================================
-- RAG 문서 스키마
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.
-- =============================================

-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 문서 청크 테이블
CREATE TABLE IF NOT EXISTS rag_documents (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  filename   TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  embedding  vector(768),
  chunk_index INTEGER    DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 벡터 인덱스 (검색 속도 향상)
CREATE INDEX IF NOT EXISTS rag_documents_embedding_idx
  ON rag_documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Row Level Security
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON rag_documents
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 유사 문서 검색 함수
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_count     int DEFAULT 5
)
RETURNS TABLE (
  id          UUID,
  filename    TEXT,
  content     TEXT,
  similarity  float
)
LANGUAGE sql
AS $$
  SELECT id, filename, content,
         1 - (embedding <=> query_embedding) AS similarity
  FROM rag_documents
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
