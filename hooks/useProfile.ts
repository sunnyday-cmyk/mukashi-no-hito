"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import type { UserProfile } from "@/types";

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const profileSubscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { session: currentSession }, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        const isNetwork =
          sessionError.message?.includes("Failed to fetch") ||
          sessionError.message?.includes("NetworkError") ||
          sessionError.message?.includes("fetch");
        if (isNetwork) {
          setLoading(false);
          return;
        }
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!currentSession?.user?.id) {
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setSession(currentSession);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url, target_school, bio, study_streak, last_studied_at, following_count, follower_count, credits, is_subscribed"
        )
        .eq("id", currentSession.user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          setProfile({
            id: currentSession.user.id,
            username: "user_" + currentSession.user.id.slice(0, 8),
            display_name: null,
            avatar_url: null,
            target_school: null,
            bio: null,
            study_streak: 0,
            last_studied_at: null,
            following_count: 0,
            follower_count: 0,
            credits: 3,
            is_subscribed: false,
          });
        } else {
          setProfile(null);
        }
      } else if (data) {
        setProfile(data as UserProfile);
      }
    } catch (error) {
      const isNetwork =
        error instanceof Error &&
        (error.message?.includes("Failed to fetch") ||
          error.message?.includes("NetworkError") ||
          error.name === "AbortError");
      if (isNetwork) {
        setLoading(false);
        return;
      }
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!isMounted) return;
        if (newSession?.user?.id) {
          setSession(newSession);
          fetchProfile();
        } else {
          setSession(null);
          setProfile(null);
          setLoading(false);
          profileSubscriptionRef.current?.unsubscribe();
          profileSubscriptionRef.current = null;
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      profileSubscriptionRef.current?.unsubscribe();
      profileSubscriptionRef.current = null;
    };
  }, [fetchProfile]);

  // リアルタイム更新
  useEffect(() => {
    if (!session?.user?.id) return;

    profileSubscriptionRef.current?.unsubscribe();

    const channel = supabase
      .channel(`profile-${session.user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${session.user.id}` },
        (payload) => {
          if ((payload.new as any)?.id === session.user.id) {
            setProfile((prev) =>
              prev ? { ...prev, ...(payload.new as Partial<UserProfile>) } : null
            );
          }
        }
      )
      .subscribe();

    profileSubscriptionRef.current = channel;

    return () => {
      channel.unsubscribe();
      profileSubscriptionRef.current = null;
    };
  }, [session?.user?.id]);

  return { profile, session, loading, refetch: fetchProfile };
}
