-- ============================================================
-- 昔の人 v2: 通知 + AI チャット履歴 テーブル
-- Supabase Dashboard > SQL Editor で実行してください
-- ============================================================

-- ============================================================
-- 1. notifications テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,     -- 受信者
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,         -- 送信者
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow')),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_body TEXT,       -- コメント通知の場合、本文プレビュー
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. ai_chat_messages テーブル（AI勉強相談履歴）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_user ON public.ai_chat_messages(user_id, created_at);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_ai_chat" ON public.ai_chat_messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. トリガー: いいね → 通知を自動作成
-- ============================================================
CREATE OR REPLACE FUNCTION notify_on_like()
RETURNS TRIGGER AS $$
DECLARE
  post_owner UUID;
BEGIN
  SELECT user_id INTO post_owner FROM public.posts WHERE id = NEW.post_id;
  -- 自分のいいねには通知しない
  IF post_owner IS NOT NULL AND post_owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, from_user_id, type, post_id)
    VALUES (post_owner, NEW.user_id, 'like', NEW.post_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_like ON public.post_likes;
CREATE TRIGGER trigger_notify_like
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_like();

-- ============================================================
-- 4. トリガー: コメント → 通知を自動作成
-- ============================================================
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_owner UUID;
BEGIN
  SELECT user_id INTO post_owner FROM public.posts WHERE id = NEW.post_id;
  IF post_owner IS NOT NULL AND post_owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, from_user_id, type, post_id, comment_body)
    VALUES (post_owner, NEW.user_id, 'comment', NEW.post_id, left(NEW.body, 50));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_comment ON public.post_comments;
CREATE TRIGGER trigger_notify_comment
  AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- ============================================================
-- 5. トリガー: フォロー → 通知を自動作成
-- ============================================================
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, from_user_id, type)
  VALUES (NEW.following_id, NEW.follower_id, 'follow');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_follow ON public.follows;
CREATE TRIGGER trigger_notify_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION notify_on_follow();
