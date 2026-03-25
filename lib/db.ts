import Dexie, { Table } from "dexie";

// 履歴の型定義（Supabase 同期後は id は UUID 文字列）
export interface HistoryItem {
  id?: string;
  originalText: string; // 解析した古文
  translation: string; // 現代語訳
  resultJson: string; // 解析結果のJSON文字列
  createdAt: Date; // 日付
}

// 単語帳の型定義（Supabase 同期後は id は UUID 文字列）
export interface WordbookItem {
  id?: string;
  surface: string; // 単語の表記
  reading: string; // 読み（ひらがな）
  partOfSpeech: string; // 品詞
  inflectionType?: string; // 活用の種類（オプション）
  inflectionForm?: string; // 活用形（オプション）
  meaning: string; // 意味
  auxiliaryMeaning?: string; // 助動詞の意味（オプション）
  grammarNote?: string; // 入試重要ポイント（オプション）
  colorCode?: string; // 色コード（オプション）
  createdAt: Date; // 登録日
}

// データベースクラス
class MukashiNoHitoDB extends Dexie {
  history!: Table<HistoryItem, number>;
  wordbook!: Table<WordbookItem, number>;

  constructor() {
    super("MukashiNoHitoDB");
    
    // スキーマ定義
    this.version(1).stores({
      history: "++id, originalText, createdAt",
      wordbook: "++id, surface, partOfSpeech, createdAt",
    });
    
    // バージョン2: 新しいフィールドを追加（既存データは保持）
    this.version(2).stores({
      history: "++id, originalText, createdAt",
      wordbook: "++id, surface, partOfSpeech, reading, createdAt",
    });
  }
}

// データベースインスタンスをエクスポート
export const db = new MukashiNoHitoDB();


