-- 昔の人: 履歴・単語帳テーブル作成と RLS
-- Supabase Dashboard > SQL Editor で実行するか、Supabase CLI でマイグレーションとして適用してください。

-- ============================================
-- 1. history テーブル（解析履歴）
-- ============================================
CREATE TABLE IF NOT EXISTS public.history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  translation TEXT NOT NULL DEFAULT '',
  result_json TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス（ユーザーごとの取得・日付順）
CREATE INDEX IF NOT EXISTS idx_history_user_created ON public.history(user_id, created_at DESC);

COMMENT ON TABLE public.history IS '古文解析履歴（マルチデバイス同期用）';

-- ============================================
-- 2. wordbook テーブル（単語帳）
-- ============================================
CREATE TABLE IF NOT EXISTS public.wordbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surface TEXT NOT NULL,
  reading TEXT NOT NULL DEFAULT '',
  part_of_speech TEXT NOT NULL,
  inflection_type TEXT,
  inflection_form TEXT,
  meaning TEXT NOT NULL,
  auxiliary_meaning TEXT,
  grammar_note TEXT,
  color_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_wordbook_user_created ON public.wordbook(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wordbook_user_surface ON public.wordbook(user_id, surface);

COMMENT ON TABLE public.wordbook IS '単語帳（マルチデバイス同期用）';

-- ============================================
-- 3. Row Level Security (RLS)
-- ============================================

-- history: 有効化
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- history: 本人のみ SELECT / INSERT / UPDATE / DELETE
CREATE POLICY "Users can manage own history"
  ON public.history
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- wordbook: 有効化
ALTER TABLE public.wordbook ENABLE ROW LEVEL SECURITY;

-- wordbook: 本人のみ SELECT / INSERT / UPDATE / DELETE
CREATE POLICY "Users can manage own wordbook"
  ON public.wordbook
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
