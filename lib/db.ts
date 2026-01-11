import Dexie, { Table } from "dexie";

// 履歴テーブルの型定義
export interface HistoryItem {
  id?: number;
  originalText: string; // 解析した古文
  translation: string; // 現代語訳
  resultJson: string; // 解析結果のJSON文字列
  createdAt: Date; // 日付
}

// 単語帳テーブルの型定義
export interface WordbookItem {
  id?: number;
  surface: string; // 単語の表記
  partOfSpeech: string; // 品詞
  meaning: string; // 意味
  conjugation?: string; // 活用形（オプション）
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
      history: "++id, originalText, createdAt", // idは自動インクリメント、originalTextとcreatedAtにインデックス
      wordbook: "++id, surface, partOfSpeech, createdAt", // idは自動インクリメント、surface、partOfSpeech、createdAtにインデックス
    });
  }
}

// データベースインスタンスをエクスポート
export const db = new MukashiNoHitoDB();

