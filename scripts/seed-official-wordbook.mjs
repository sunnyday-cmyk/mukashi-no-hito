/**
 * 公式「英検２級レベル」単語帳を Supabase に投入（冪等）。
 * 旧タイトル「ターゲット1400」の行があればタイトルだけ新名称に更新する。
 *
 * 環境変数（プロジェクト直下の .env.local から自動読込）:
 *   NEXT_PUBLIC_SUPABASE_URL または SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OFFICIAL_WORDBOOK_OWNER_ID … Auth ユーザーの UUID、または登録済みメールアドレス
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Next のビルドと同様、.env.local を優先（未設定なら .env）
const envLocal = dotenv.config({ path: resolve(ROOT, ".env.local") });
if (envLocal.error && process.env.NODE_ENV !== "production") {
  console.warn("[seed] .env.local:", envLocal.error.message);
}
dotenv.config({ path: resolve(ROOT, ".env") });

const JSON_PATH = resolve(ROOT, "data/seed/eiken-grade2-level.json");

const TITLE = "英検２級レベル";
const LEGACY_TITLE = "ターゲット1400";
const DESCRIPTION = "英検2級レベル相当の頻出英単語（公式おすすめ）";
const BATCH = 200;

function isUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function loadEnv() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const owner = (process.env.OFFICIAL_WORDBOOK_OWNER_ID || "").trim();
  if (!url || !key || !owner) {
    console.error("以下の環境変数が不足しています（.env.local を保存したうえで再実行してください）:");
    if (!url) console.error("  - NEXT_PUBLIC_SUPABASE_URL（または SUPABASE_URL）");
    if (!key)
      console.error(
        "  - SUPABASE_SERVICE_ROLE_KEY（Supabase Dashboard → Settings → API の service_role シークレット。anon キーではありません）"
      );
    if (!owner)
      console.error(
        "  - OFFICIAL_WORDBOOK_OWNER_ID（Auth ユーザーの UUID、または登録済みメール）"
      );
    console.error(
      "読み込み元: プロジェクト直下の .env.local → .env（dotenv）"
    );
    process.exit(1);
  }
  return { url, key, owner };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} ownerRaw
 */
async function resolveOwnerUserId(supabase, ownerRaw) {
  if (isUuid(ownerRaw)) return ownerRaw;

  if (ownerRaw.includes("@")) {
    let page = 1;
    const perPage = 1000;
    for (;;) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        throw new Error(`Auth admin API: ${error.message}`);
      }
      const found = data.users.find(
        (u) => (u.email || "").toLowerCase() === ownerRaw.toLowerCase()
      );
      if (found) {
        console.log(
          `[seed] OFFICIAL_WORDBOOK_OWNER_ID をメールから UUID に解決しました（ユーザー: ${found.email}）`
        );
        return found.id;
      }
      if (!data.users.length || data.users.length < perPage) break;
      page += 1;
      if (page > 50) break;
    }
    throw new Error(
      `このメールの Auth ユーザーが見つかりません: ${ownerRaw}\nSupabase Dashboard → Authentication → Users で登録を確認するか、UUID を直接設定してください。`
    );
  }

  throw new Error(
    "OFFICIAL_WORDBOOK_OWNER_ID は UUID か、Supabase Auth に登録済みのメールアドレスにしてください。"
  );
}

async function main() {
  const { url, key, owner: ownerRaw } = loadEnv();
  const raw = readFileSync(JSON_PATH, "utf8");
  const entries = JSON.parse(raw);

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  let owner;
  try {
    owner = await resolveOwnerUserId(supabase, ownerRaw);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const { error: renameErr } = await supabase
    .from("wordbooks")
    .update({ title: TITLE, description: DESCRIPTION, tags: ["英語", "英検", "公式"] })
    .eq("title", LEGACY_TITLE)
    .eq("is_official", true);
  if (renameErr) {
    console.warn("Legacy title rename (optional):", renameErr.message);
  } else {
    console.log("If a legacy official wordbook existed, its title was updated to:", TITLE);
  }

  const { data: existing } = await supabase
    .from("wordbooks")
    .select("id, word_count")
    .eq("title", TITLE)
    .eq("is_official", true)
    .maybeSingle();

  let wordbookId = existing?.id;

  if (existing && (existing.word_count ?? 0) > 0) {
    console.log(`Skip: "${TITLE}" already exists with ${existing.word_count} words.`);
    return;
  }

  if (!wordbookId) {
    const { data: inserted, error: wbErr } = await supabase
      .from("wordbooks")
      .insert({
        user_id: owner,
        title: TITLE,
        subject: "english",
        description: DESCRIPTION,
        is_public: true,
        is_official: true,
        tags: ["英語", "英検", "公式"],
        cover_color: "#9333ea",
      })
      .select("id")
      .single();

    if (wbErr || !inserted) {
      console.error("wordbooks insert:", wbErr);
      process.exit(1);
    }
    wordbookId = inserted.id;
    console.log("Created wordbook", wordbookId);
  }

  const { count: existingWords } = await supabase
    .from("words")
    .select("id", { count: "exact", head: true })
    .eq("wordbook_id", wordbookId);

  if ((existingWords ?? 0) > 0) {
    console.log(`Skip words: already ${existingWords} rows for this wordbook.`);
    return;
  }

  for (let i = 0; i < entries.length; i += BATCH) {
    const chunk = entries.slice(i, i + BATCH).map((e) => ({
      wordbook_id: wordbookId,
      front: e.front,
      back: e.back,
      sort_order: e.sort_order,
      color_code: "#9333ea",
    }));
    const { error } = await supabase.from("words").insert(chunk);
    if (error) {
      console.error(`words insert batch ${i}:`, error);
      process.exit(1);
    }
    console.log(`Inserted words ${i + 1}–${Math.min(i + BATCH, entries.length)} / ${entries.length}`);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
