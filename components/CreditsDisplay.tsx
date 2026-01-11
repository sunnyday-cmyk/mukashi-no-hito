"use client";

import { useProfile } from "@/hooks/useProfile";
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

  if (profile.is_subscribed) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm">
        <Infinity className="h-3.5 w-3.5" />
        <span>Premium</span>
      </div>
    );
  }

  const isLow = profile.credits <= 1;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm ${
        isLow
          ? "border-red-300 bg-red-50 text-red-700"
          : "border-gray-300 bg-white text-gray-700"
      }`}
    >
      <Coins className={`h-3.5 w-3.5 ${isLow ? "text-red-600" : "text-gray-600"}`} />
      <span>残り：{profile.credits}回</span>
    </div>
  );
}

