export default function LoadingSpinner({ message = "解析中..." }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-white">
      {/* 和風の円形アニメーション */}
      <div className="relative mb-8">
        <div className="h-20 w-20 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-amber-100" />
        </div>
      </div>
      
      {/* メッセージ */}
      <p className="font-serif text-base text-gray-700 mb-2">{message}</p>
      <p className="font-serif text-sm text-gray-500">
        古のことばを、現代へ紐解いています
      </p>
      
      {/* 学習意欲を高めるメッセージ */}
      <div className="mt-8 max-w-xs text-center">
        <p className="text-xs text-gray-600 leading-relaxed">
          💡 品詞分解・活用形・助動詞の意味まで、大学入試レベルの詳細解析を行っています
        </p>
      </div>
    </div>
  );
}

