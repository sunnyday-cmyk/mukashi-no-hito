"use client";

import { Loader2 } from "lucide-react";

export default function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ background: "var(--color-surface)" }}>
      <Loader2 className="h-10 w-10 animate-spin" style={{ color: "var(--color-accent)" }} />
      {message && <p className="text-sm text-gray-500">{message}</p>}
    </div>
  );
}
