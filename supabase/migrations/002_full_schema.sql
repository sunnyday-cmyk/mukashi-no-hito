-- ============================================================
-- 昔の人 v2: フルスキーマ (Phase 1-3)
-- Supabase Dashboard > SQL Editor で実行してください
-- ============================================================

-- ============================================================
-- 1. profiles テーブル拡張
--    既存カラム(credits, is_subscribed)は残しつつ新規カラムを追加
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS target_school TEXT,
  ADD COLUMN IF NOT EXISTS study_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_studied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;

-- ============================================================
-- 2. wordbooks テーブル（単語帳コレクション）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wordbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT CHECK (subject IN ('japanese_classical', 'chinese_classical', 'english')) DEFAULT 'japanese_classical',
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  is_official BOOLEAN DEFAULT false,
  word_count INTEGER DEFAULT 0,
  copy_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  tags TEXT[],
  cover_color TEXT DEFAULT '#7c6fe0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wordbooks_user ON public.wordbooks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wordbooks_public ON public.wordbooks(is_public, subject, copy_count DESC);
CREATE INDEX IF NOT EXISTS idx_wordbooks_official ON public.wordbooks(is_official) WHERE is_official = true;

-- ============================================================
-- 3. words テーブル（単語帳内の単語）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wordbook_id UUID NOT NULL REFERENCES public.wordbooks(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  reading TEXT,
  back TEXT NOT NULL,
  part_of_speech TEXT,
  inflection_type TEXT,
  inflection_form TEXT,
  auxiliary_meaning TEXT,
  grammar_note TEXT,
  example TEXT,
  notes TEXT,
  color_code TEXT DEFAULT '#7c6fe0',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_words_wordbook ON public.words(wordbook_id, sort_order);

-- ============================================================
-- 4. word_progress テーブル（SRS学習記録）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.word_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  ease_factor DECIMAL DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  repetitions INTEGER DEFAULT 0,
  next_review TIMESTAMPTZ DEFAULT now(),
  is_mastered BOOLEAN DEFAULT false,
  last_grade INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_word_progress_user ON public.word_progress(user_id, next_review);
CREATE INDEX IF NOT EXISTS idx_word_progress_mastered ON public.word_progress(user_id, is_mastered);

-- ============================================================
-- 5. wordbook_copies テーブル（コピー記録）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wordbook_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_wordbook_id UUID NOT NULL REFERENCES public.wordbooks(id) ON DELETE CASCADE,
  copied_wordbook_id UUID REFERENCES public.wordbooks(id) ON DELETE SET NULL,
  copied_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(original_wordbook_id, copied_by)
);

-- ============================================================
-- 6. quiz_results テーブル（テスト結果）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wordbook_id UUID REFERENCES public.wordbooks(id) ON DELETE SET NULL,
  subject TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  accuracy DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON public.quiz_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_ranking ON public.quiz_results(accuracy DESC, created_at DESC);

-- ============================================================
-- 7. follows テーブル（フォロー関係）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

-- ============================================================
-- 8. posts テーブル（フィード投稿）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL CHECK (post_type IN ('study_note', 'quiz_result', 'word_added')),
  subject TEXT,
  original_text TEXT,
  translation TEXT,
  wordbook_id UUID REFERENCES public.wordbooks(id) ON DELETE SET NULL,
  quiz_result_id UUID REFERENCES public.quiz_results(id) ON DELETE SET NULL,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_feed ON public.posts(created_at DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_posts_user ON public.posts(user_id, created_at DESC);

-- ============================================================
-- 9. post_likes テーブル（いいね）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- ============================================================
-- 10. post_comments テーブル（コメント）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON public.post_comments(post_id, created_at);

-- ============================================================
-- 11. groups テーブル（グループ）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  is_public BOOLEAN DEFAULT true,
  invite_code TEXT UNIQUE DEFAULT substring(gen_random_uuid()::text, 1, 8),
  member_count INTEGER DEFAULT 1,
  tags TEXT[],
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_groups_public ON public.groups(is_public, created_at DESC);

-- ============================================================
-- 12. group_members テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);

-- ============================================================
-- 13. RLS ポリシー設定
-- ============================================================

-- profiles（既存のRLSは維持、新規カラムは同ポリシーで適用済み）

-- wordbooks
ALTER TABLE public.wordbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_wordbooks" ON public.wordbooks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "public_read_wordbooks" ON public.wordbooks FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

-- words
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_words" ON public.words FOR ALL
  USING (
    auth.uid() = (SELECT user_id FROM public.wordbooks WHERE id = wordbook_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.wordbooks WHERE id = wordbook_id)
  );
CREATE POLICY "public_read_words" ON public.words FOR SELECT
  USING (
    (SELECT is_public FROM public.wordbooks WHERE id = wordbook_id) = true
    OR auth.uid() = (SELECT user_id FROM public.wordbooks WHERE id = wordbook_id)
  );

-- word_progress
ALTER TABLE public.word_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_word_progress" ON public.word_progress FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- wordbook_copies
ALTER TABLE public.wordbook_copies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_copies" ON public.wordbook_copies FOR ALL
  USING (auth.uid() = copied_by) WITH CHECK (auth.uid() = copied_by);

-- quiz_results
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_quiz_results" ON public.quiz_results FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "public_read_quiz_results" ON public.quiz_results FOR SELECT
  USING (true);

-- follows
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_follows" ON public.follows FOR ALL
  USING (auth.uid() = follower_id) WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "public_read_follows" ON public.follows FOR SELECT USING (true);

-- posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_posts" ON public.posts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "public_read_posts" ON public.posts FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

-- post_likes
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_likes" ON public.post_likes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "public_read_likes" ON public.post_likes FOR SELECT USING (true);

-- post_comments
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_comments" ON public.post_comments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "public_read_comments" ON public.post_comments FOR SELECT USING (true);

-- groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "creator_all_groups" ON public.groups FOR ALL
  USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "public_read_groups" ON public.groups FOR SELECT
  USING (is_public = true OR auth.uid() = created_by);

-- group_members
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member_read_own" ON public.group_members FOR SELECT
  USING (auth.uid() = user_id OR
    auth.uid() = (SELECT created_by FROM public.groups WHERE id = group_id));
CREATE POLICY "member_manage_own" ON public.group_members FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 14. Functions & Triggers
-- ============================================================

-- 単語帳のword_countを自動更新
CREATE OR REPLACE FUNCTION update_wordbook_word_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.wordbooks SET word_count = word_count + 1, updated_at = now()
      WHERE id = NEW.wordbook_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.wordbooks SET word_count = GREATEST(word_count - 1, 0), updated_at = now()
      WHERE id = OLD.wordbook_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_word_count ON public.words;
CREATE TRIGGER trigger_word_count
  AFTER INSERT OR DELETE ON public.words
  FOR EACH ROW EXECUTE FUNCTION update_wordbook_word_count();

-- いいね数を自動更新
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_likes_count ON public.post_likes;
CREATE TRIGGER trigger_likes_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- コメント数を自動更新
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_comments_count ON public.post_comments;
CREATE TRIGGER trigger_comments_count
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- 新規ユーザー登録時にprofilesを自動作成
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  generated_username TEXT;
BEGIN
  generated_username := 'user_' || substring(NEW.id::text, 1, 8);
  INSERT INTO public.profiles (id, username, display_name, credits, is_subscribed)
  VALUES (
    NEW.id,
    generated_username,
    COALESCE(NEW.raw_user_meta_data->>'display_name', generated_username),
    3,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(profiles.username, generated_username),
    display_name = COALESCE(profiles.display_name, generated_username);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
