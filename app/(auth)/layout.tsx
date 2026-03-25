export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      {children}
    </div>
  );
}
