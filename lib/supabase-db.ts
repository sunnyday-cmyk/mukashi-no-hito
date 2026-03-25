/**
 * Supabase 履歴・単語帳 CRUD（マルチデバイス同期）
 * DB は snake_case、アプリは camelCase で扱うためマッパーを定義。
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { HistoryItem, WordbookItem } from "./db";

// --- Supabase テーブル型（snake_case）---

export interface HistoryRow {
  id: string;
  user_id: string;
  original_text: string;
  translation: string;
  result_json: string;
  created_at: string;
}

export interface WordbookRow {
  id: string;
  user_id: string;
  surface: string;
  reading: string;
  part_of_speech: string;
  inflection_type: string | null;
  inflection_form: string | null;
  meaning: string;
  auxiliary_meaning: string | null;
  grammar_note: string | null;
  color_code: string | null;
  created_at: string;
}

// --- Row → Item マッパー ---

function historyRowToItem(row: HistoryRow): HistoryItem {
  return {
    id: row.id,
    originalText: row.original_text,
    translation: row.translation,
    resultJson: row.result_json,
    createdAt: new Date(row.created_at),
  };
}

function wordbookRowToItem(row: WordbookRow): WordbookItem {
  return {
    id: row.id,
    surface: row.surface,
    reading: row.reading,
    partOfSpeech: row.part_of_speech,
    inflectionType: row.inflection_type ?? undefined,
    inflectionForm: row.inflection_form ?? undefined,
    meaning: row.meaning,
    auxiliaryMeaning: row.auxiliary_meaning ?? undefined,
    grammarNote: row.grammar_note ?? undefined,
    colorCode: row.color_code ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

// --- 履歴 ---

export async function insertHistory(
  supabase: SupabaseClient,
  userId: string,
  data: { originalText: string; translation: string; resultJson: string }
) {
  const { data: row, error } = await supabase
    .from("history")
    .insert({
      user_id: userId,
      original_text: data.originalText,
      translation: data.translation,
      result_json: data.resultJson,
    })
    .select()
    .single();

  if (error) throw error;
  return row ? historyRowToItem(row as HistoryRow) : null;
}

export async function getHistories(supabase: SupabaseClient, userId: string): Promise<HistoryItem[]> {
  const { data, error } = await supabase
    .from("history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => historyRowToItem(row as HistoryRow));
}

export async function deleteHistory(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("history").delete().eq("id", id);
  if (error) throw error;
}

// --- 単語帳 ---

export async function insertWordbook(
  supabase: SupabaseClient,
  userId: string,
  data: Omit<WordbookItem, "id" | "createdAt"> & { createdAt?: Date }
) {
  const { data: row, error } = await supabase
    .from("wordbook")
    .insert({
      user_id: userId,
      surface: data.surface,
      reading: data.reading ?? "",
      part_of_speech: data.partOfSpeech,
      inflection_type: data.inflectionType ?? null,
      inflection_form: data.inflectionForm ?? null,
      meaning: data.meaning,
      auxiliary_meaning: data.auxiliaryMeaning ?? null,
      grammar_note: data.grammarNote ?? null,
      color_code: data.colorCode ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return row ? wordbookRowToItem(row as WordbookRow) : null;
}

export async function getWordbook(supabase: SupabaseClient, userId: string): Promise<WordbookItem[]> {
  const { data, error } = await supabase
    .from("wordbook")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => wordbookRowToItem(row as WordbookRow));
}

export async function deleteWordbook(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("wordbook").delete().eq("id", id);
  if (error) throw error;
}
