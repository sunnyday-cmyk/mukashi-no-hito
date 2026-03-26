-- ============================================================
-- STUDY ROYALE: クイズ対戦機能
-- Supabase Dashboard > SQL Editor で実行してください
-- ============================================================

-- ============================================================
-- 1. battle_rooms テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.battle_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,
  wordbook_id UUID NOT NULL REFERENCES public.wordbooks(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  questions JSONB NOT NULL DEFAULT '[]',
  question_count INTEGER NOT NULL DEFAULT 10,
  host_score INTEGER NOT NULL DEFAULT 0,
  guest_score INTEGER NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_battle_rooms_invite ON public.battle_rooms(invite_code);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_host ON public.battle_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_guest ON public.battle_rooms(guest_id);

ALTER TABLE public.battle_rooms ENABLE ROW LEVEL SECURITY;

-- waiting 状態のルームは招待コード検索のため全員が読める
CREATE POLICY "battle_rooms_select" ON public.battle_rooms
  FOR SELECT USING (
    status = 'waiting'
    OR auth.uid() = host_id
    OR auth.uid() = guest_id
  );

-- ルーム作成はホストのみ
CREATE POLICY "battle_rooms_insert" ON public.battle_rooms
  FOR INSERT WITH CHECK (auth.uid() = host_id);

-- ホストもゲストも更新可（参加・スコア更新・終了）
CREATE POLICY "battle_rooms_update" ON public.battle_rooms
  FOR UPDATE USING (auth.uid() = host_id OR auth.uid() = guest_id);

-- ============================================================
-- 2. battle_answers テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.battle_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.battle_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id, question_index)
);

CREATE INDEX IF NOT EXISTS idx_battle_answers_room ON public.battle_answers(room_id);

ALTER TABLE public.battle_answers ENABLE ROW LEVEL SECURITY;

-- 参加者のみ回答を読める
CREATE POLICY "battle_answers_select" ON public.battle_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.battle_rooms
      WHERE id = room_id
        AND (host_id = auth.uid() OR guest_id = auth.uid())
    )
  );

-- 自分の回答のみ追加可
CREATE POLICY "battle_answers_insert" ON public.battle_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
