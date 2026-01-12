"use client";

import { useProfile } from "@/hooks/useProfile";
import Link from "next/link";
import { Infinity, Coins } from "lucide-react";

export default function CreditsDisplay() {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div className="h-7 w-20 animate-pulse rounded-full bg-gray-200"></div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {profile.is_subscribed ? (
        <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm whitespace-nowrap">
          <Infinity className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="hidden sm:inline">Premium</span>
        </div>
      ) : (
        <>
          <div
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium shadow-sm whitespace-nowrap ${
              profile.credits <= 1
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-gray-300 bg-white text-gray-700"
            }`}
          >
            <Coins className={`h-3.5 w-3.5 flex-shrink-0 ${profile.credits <= 1 ? "text-red-600" : "text-gray-600"}`} />
            <span className="hidden xs:inline">残り：</span>
            <span>{profile.credits}回</span>
          </div>
          <Link
            href="/pricing"
            className="flex items-center gap-1 rounded-full border-2 border-amber-400 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900 shadow-sm transition hover:bg-amber-100 active:scale-95 whitespace-nowrap"
          >
            <span className="hidden sm:inline">無制限プランへ</span>
            <span className="sm:hidden">プラン</span>
          </Link>
        </>
      )}
    </div>
  );
}

