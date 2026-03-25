/**
 * IndexedDB（Dexie）の履歴・単語帳を Supabase へ一度だけ同期するユーティリティ。
 * ログイン済みの状態で呼び出し、ローカルに残っているデータをクラウドに移行する。
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { db } from "./db";
import { insertHistory, insertWordbook } from "./supabase-db";

export interface MigrationResult {
  historyCount: number;
  wordbookCount: number;
  historyErrors: number;
  wordbookErrors: number;
}

/**
 * 現在の IndexedDB の履歴・単語帳を Supabase に追加する。
 * 既存の Supabase データは上書きしない（重複は発生しうる）。
 * @param supabase Supabase クライアント
 * @param userId ログインユーザー ID（auth.users.id）
 */
export async function migrateLocalToSupabase(
  supabase: SupabaseClient,
  userId: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    historyCount: 0,
    wordbookCount: 0,
    historyErrors: 0,
    wordbookErrors: 0,
  };

  try {
    const localHistories = await db.history.orderBy("createdAt").toArray();
    for (const item of localHistories) {
      try {
        await insertHistory(supabase, userId, {
          originalText: item.originalText,
          translation: item.translation,
          resultJson: item.resultJson,
        });
        result.historyCount++;
      } catch {
        result.historyErrors++;
      }
    }

    const localWords = await db.wordbook.orderBy("createdAt").toArray();
    for (const item of localWords) {
      try {
        await insertWordbook(supabase, userId, {
          surface: item.surface,
          reading: item.reading ?? "",
          partOfSpeech: item.partOfSpeech,
          inflectionType: item.inflectionType,
          inflectionForm: item.inflectionForm,
          meaning: item.meaning,
          auxiliaryMeaning: item.auxiliaryMeaning,
          grammarNote: item.grammarNote,
          colorCode: item.colorCode,
        });
        result.wordbookCount++;
      } catch {
        result.wordbookErrors++;
      }
    }
  } catch (e) {
    console.error("移行中にエラー:", e);
    throw e;
  }

  return result;
}

/**
 * IndexedDB に履歴が1件以上あるか
 */
export async function hasLocalHistory(): Promise<boolean> {
  const count = await db.history.count();
  return count > 0;
}

/**
 * IndexedDB に単語帳が1件以上あるか
 */
export async function hasLocalWordbook(): Promise<boolean> {
  const count = await db.wordbook.count();
  return count > 0;
}
