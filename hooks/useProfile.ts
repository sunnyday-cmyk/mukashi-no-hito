"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

interface Profile {
  credits: number;
  is_subscribed: boolean;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const profileSubscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const authSubscriptionRef = useRef<ReturnType<typeof supabase.auth.onAuthStateChange> | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const {
        data: { session: currentSession },
        error: sessionError,
      } = await supabase.auth.getSession();

      // セッション取得エラーまたはセッションがない場合
      if (sessionError || !currentSession) {
        console.log("セッションがありません:", sessionError?.message || "未ログイン");
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      // ユーザーIDが確実に存在することを確認
      if (!currentSession.user || !currentSession.user.id) {
        console.warn("ユーザーIDが取得できません");
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setSession(currentSession);

      // プロフィールを取得
      const { data, error } = await supabase
        .from("profiles")
        .select("credits, is_subscribed")
        .eq("id", currentSession.user.id)
        .single();

      if (error) {
        // エラーの詳細をログ出力
        console.error("プロフィール取得エラー:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });

        // データが存在しない場合は初期状態として扱う（エラーではない）
        if (error.code === "PGRST116") {
          // 行が見つからない場合
          console.log("プロフィールが存在しません。初期状態として扱います。");
          setProfile({
            credits: 0,
            is_subscribed: false,
          });
        } else {
          // その他のエラーはnullとして扱う
          setProfile(null);
        }
      } else if (data) {
        setProfile({
          credits: data.credits ?? 0,
          is_subscribed: data.is_subscribed ?? false,
        });
      } else {
        // データがnullの場合も初期状態として扱う
        setProfile({
          credits: 0,
          is_subscribed: false,
        });
      }
    } catch (error) {
      // エラーの詳細をログ出力
      console.error("プロフィール取得エラー（catch）:", {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 初回プロフィール取得
    fetchProfile();

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;

      if (newSession && newSession.user && newSession.user.id) {
        setSession(newSession);
        fetchProfile();
      } else {
        setSession(null);
        setProfile(null);
        setLoading(false);
        
        // プロフィールサブスクリプションをクリーンアップ
        if (profileSubscriptionRef.current) {
          profileSubscriptionRef.current.unsubscribe();
          profileSubscriptionRef.current = null;
        }
      }
    });

    authSubscriptionRef.current = subscription;

    return () => {
      isMounted = false;
      
      // 認証サブスクリプションをクリーンアップ
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe();
        authSubscriptionRef.current = null;
      }
      
      // プロフィールサブスクリプションをクリーンアップ
      if (profileSubscriptionRef.current) {
        profileSubscriptionRef.current.unsubscribe();
        profileSubscriptionRef.current = null;
      }
    };
  }, [fetchProfile]);

  // セッションが確実に取得できた後にのみリアルタイム更新を設定
  useEffect(() => {
    if (!session || !session.user || !session.user.id) {
      return;
    }

    // 既存のサブスクリプションをクリーンアップ
    if (profileSubscriptionRef.current) {
      profileSubscriptionRef.current.unsubscribe();
    }

    // 新しいサブスクリプションを作成
    const channel = supabase
      .channel(`profile-changes-${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${session.user.id}`,
        },
        (payload) => {
          // 現在のユーザーのプロフィールが変更された場合のみ更新
          if (payload.new && (payload.new as any).id === session.user.id) {
            setProfile({
              credits: (payload.new as any).credits ?? 0,
              is_subscribed: (payload.new as any).is_subscribed ?? false,
            });
          }
        }
      )
      .subscribe();

    profileSubscriptionRef.current = channel;

    return () => {
      if (profileSubscriptionRef.current) {
        profileSubscriptionRef.current.unsubscribe();
        profileSubscriptionRef.current = null;
      }
    };
  }, [session?.user?.id]);

  return {
    profile,
    loading,
    refetch: fetchProfile, // 手動で再取得する関数
  };
}

