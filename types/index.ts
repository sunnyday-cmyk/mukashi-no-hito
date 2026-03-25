// ============================================================
// 昔の人 v2 — 共通型定義
// ============================================================

export type Subject = 'japanese_classical' | 'chinese_classical' | 'english';

export const SUBJECT_LABELS: Record<Subject, string> = {
  japanese_classical: '古文',
  chinese_classical: '漢文',
  english: '英語',
};

// ────────────────────────────────────────
// ユーザー / プロフィール
// ────────────────────────────────────────
export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  target_school: string | null;
  bio: string | null;
  study_streak: number;
  last_studied_at: string | null;
  following_count: number;
  follower_count: number;
  credits: number;
  is_subscribed: boolean;
  created_at?: string;
}

// ────────────────────────────────────────
// 単語帳
// ────────────────────────────────────────
export interface Wordbook {
  id: string;
  user_id: string;
  title: string;
  subject: Subject;
  description: string | null;
  is_public: boolean;
  is_official: boolean;
  word_count: number;
  copy_count: number;
  rating: number | null;
  tags: string[] | null;
  cover_color: string;
  created_at: string;
  updated_at: string;
  // JOINデータ
  profiles?: Pick<UserProfile, 'username' | 'display_name' | 'avatar_url'>;
  is_copied?: boolean;
}

// ────────────────────────────────────────
// 単語
// ────────────────────────────────────────
export interface Word {
  id: string;
  wordbook_id: string;
  front: string;
  reading: string | null;
  back: string;
  part_of_speech: string | null;
  inflection_type: string | null;
  inflection_form: string | null;
  auxiliary_meaning: string | null;
  grammar_note: string | null;
  example: string | null;
  notes: string | null;
  color_code: string;
  sort_order: number;
  created_at: string;
}

// ────────────────────────────────────────
// SRS 学習進捗
// ────────────────────────────────────────
export interface WordProgress {
  id: string;
  user_id: string;
  word_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review: string;
  is_mastered: boolean;
  last_grade: number;
  updated_at: string;
}

// フラッシュカード表示用（Word + Progress）
export interface StudyCard {
  word: Word;
  progress: WordProgress | null;
  isDue: boolean;
}

// ────────────────────────────────────────
// テスト結果
// ────────────────────────────────────────
export interface QuizResult {
  id: string;
  user_id: string;
  wordbook_id: string | null;
  subject: Subject | null;
  score: number;
  total: number;
  accuracy: number;
  created_at: string;
}

// ────────────────────────────────────────
// 投稿（フィード）
// ────────────────────────────────────────
export type PostType = 'study_note' | 'quiz_result' | 'word_added';

export interface Post {
  id: string;
  user_id: string;
  post_type: PostType;
  subject: Subject | null;
  original_text: string | null;
  translation: string | null;
  wordbook_id: string | null;
  quiz_result_id: string | null;
  likes_count: number;
  comments_count: number;
  is_public: boolean;
  created_at: string;
  // JOINデータ
  profiles?: Pick<UserProfile, 'username' | 'display_name' | 'avatar_url'>;
  wordbooks?: Pick<Wordbook, 'title' | 'subject'>;
  is_liked?: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: Pick<UserProfile, 'username' | 'display_name' | 'avatar_url'>;
}

// ────────────────────────────────────────
// グループ
// ────────────────────────────────────────
export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  is_public: boolean;
  invite_code: string;
  member_count: number;
  tags: string[] | null;
  created_by: string;
  created_at: string;
  is_member?: boolean;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  profiles?: Pick<UserProfile, 'username' | 'display_name' | 'avatar_url'>;
}

// ────────────────────────────────────────
// ランキング
// ────────────────────────────────────────
export interface RankingEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  value: number;
  is_me: boolean;
}

// ────────────────────────────────────────
// AI翻訳レスポンス
// ────────────────────────────────────────
export interface TranslationWord {
  word: string;
  reading: string;
  meaning: string;
  part_of_speech?: string;
  inflection_type?: string;
  inflection_form?: string;
  auxiliary_meaning?: string;
  grammar_note?: string;
  importance: number;   // 1-5
  color_code: string;
}

export interface GrammarPoint {
  text: string;
  explanation: string;
}

export interface TranslationResult {
  subject: Subject;
  original_text: string;
  corrected_text: string;
  translation: string;
  explanation: string;
  words: TranslationWord[];
  grammar_points: GrammarPoint[];
}

// ────────────────────────────────────────
// UI 共通
// ────────────────────────────────────────
export type TabValue = string;

export interface SelectOption {
  value: string;
  label: string;
}

// バッジ定義
export const BADGES = [
  { id: 'first_analysis', label: '初めての解析', icon: '🎉', condition: '初回解析完了' },
  { id: 'streak_7', label: '7日連続', icon: '🔥', condition: '7日連続学習' },
  { id: 'streak_30', label: '30日連続', icon: '💎', condition: '30日連続学習' },
  { id: 'words_100', label: '単語マスター100', icon: '📚', condition: '100語習得' },
  { id: 'words_500', label: '単語マスター500', icon: '🏆', condition: '500語習得' },
  { id: 'quiz_ace', label: 'クイズエース', icon: '⭐', condition: 'クイズ100%正答' },
] as const;

export type BadgeId = typeof BADGES[number]['id'];
