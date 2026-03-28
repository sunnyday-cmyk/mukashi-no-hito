import type { SupabaseClient } from "@supabase/supabase-js";
import type { Word } from "@/types";

const PAGE_SIZE = 1000;

/**
 * PostgREST の max rows（多くのプロジェクトで 1000）を超える単語帳でも全件取得する。
 */
export async function fetchAllWordsForWordbook(
  supabase: SupabaseClient,
  wordbookId: string
): Promise<Word[]> {
  const out: Word[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("words")
      .select("*")
      .eq("wordbook_id", wordbookId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    out.push(...(data as Word[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return out;
}
