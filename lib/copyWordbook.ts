import type { SupabaseClient } from "@supabase/supabase-js";
import type { Wordbook } from "@/types";

export async function getMyCopyWordbookId(
  supabase: SupabaseClient,
  originalWordbookId: string,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("wordbook_copies")
    .select("copied_wordbook_id")
    .eq("original_wordbook_id", originalWordbookId)
    .eq("copied_by", userId)
    .maybeSingle();
  return data?.copied_wordbook_id ?? null;
}

export type CopyWordbookSource = Pick<
  Wordbook,
  "id" | "title" | "subject" | "description" | "cover_color" | "tags" | "copy_count"
>;

export async function copyWordbookToMyLibrary(
  supabase: SupabaseClient,
  wb: CopyWordbookSource,
  userId: string
): Promise<{ newWordbookId: string } | { error: string }> {
  const { data: newWb, error: insErr } = await supabase
    .from("wordbooks")
    .insert({
      user_id: userId,
      title: `${wb.title} (コピー)`,
      subject: wb.subject,
      description: wb.description,
      is_public: false,
      cover_color: wb.cover_color,
      tags: wb.tags,
    })
    .select("id")
    .single();

  if (insErr || !newWb) {
    return { error: insErr?.message ?? "単語帳の作成に失敗しました" };
  }

  const { data: srcWords } = await supabase.from("words").select("*").eq("wordbook_id", wb.id);
  if (srcWords?.length) {
    const rows = srcWords.map(
      ({ id: _id, wordbook_id: _wid, created_at: _ca, ...rest }: Record<string, unknown>) => ({
        ...rest,
        wordbook_id: newWb.id,
      })
    );
    const { error: wErr } = await supabase.from("words").insert(rows);
    if (wErr) return { error: wErr.message };
  }

  await supabase.from("wordbook_copies").upsert(
    {
      original_wordbook_id: wb.id,
      copied_wordbook_id: newWb.id,
      copied_by: userId,
    },
    { onConflict: "original_wordbook_id,copied_by" }
  );

  await supabase
    .from("wordbooks")
    .update({ copy_count: (wb.copy_count || 0) + 1 })
    .eq("id", wb.id);

  return { newWordbookId: newWb.id };
}
