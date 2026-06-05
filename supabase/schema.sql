-- =============================================
-- DemoBoard — Supabase 테이블 스키마
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.
-- =============================================

-- 게시글 테이블
CREATE TABLE IF NOT EXISTS posts (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title      TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  author     TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  views      INTEGER     DEFAULT 0
);

-- Row Level Security 활성화
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 익명 사용자 전체 허용 (데모용)
CREATE POLICY "public_all" ON posts
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 조회수 원자적 증가 함수 (race condition 방지)
CREATE OR REPLACE FUNCTION increment_views(post_id UUID)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE posts SET views = views + 1 WHERE id = post_id;
$$;
