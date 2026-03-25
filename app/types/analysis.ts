// 解析結果の型定義（API側と完全一致）
export interface Word {
  surface: string; // 表記
  reading: string; // 読み（ひらがな）
  partOfSpeech: string; // 品詞
  inflectionType: string; // 活用の種類
  inflectionForm: string; // 活用形
  meaning: string; // 現代語での意味
  auxiliaryMeaning: string; // 助動詞の意味
  grammarNote: string; // 入試重要ポイント
  colorCode: string; // 色コード
}

export interface AnalysisResult {
  correctedText: string; // 補正済みの本文
  words: Word[];
  translation: string;
  explanation: string;
  credits: number;
  isSubscribed: boolean;
}
