import Navigation from "@/components/Navigation";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-5">
          <h1 className="text-base font-medium text-gray-900">
            プライバシーポリシー
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-20 py-8 pb-24">
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-medium text-gray-900">
              プライバシーポリシー
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              古文解析アプリ「昔の人」における個人情報の取り扱いについて
            </p>
          </div>

          <div className="space-y-6 text-sm leading-relaxed text-gray-700">
            <section>
              <h3 className="mb-3 text-base font-medium text-gray-900">
                1. 個人情報の取得
              </h3>
              <p>
                本アプリでは、サービス提供のために以下の個人情報を取得いたします。
              </p>
              <ul className="mt-2 ml-6 list-disc space-y-1">
                <li>メールアドレス（認証用）</li>
                <li>お支払い情報（Stripe経由で安全に処理されます）</li>
                <li>利用状況に関する情報（サービス改善のため）</li>
              </ul>
            </section>

            <section>
              <h3 className="mb-3 text-base font-medium text-gray-900">
                2. 個人情報の利用目的
              </h3>
              <p>取得した個人情報は、以下の目的で利用いたします。</p>
              <ul className="mt-2 ml-6 list-disc space-y-1">
                <li>サービスの提供・運営</li>
                <li>お客様への連絡・サポート</li>
                <li>サービス改善のための分析</li>
                <li>不正利用の防止</li>
              </ul>
            </section>

            <section>
              <h3 className="mb-3 text-base font-medium text-gray-900">
                3. 個人情報の管理
              </h3>
              <p>
                個人情報は、適切な安全管理措置を講じ、厳重に管理いたします。
                第三者への提供は、法令に基づく場合を除き、お客様の同意なく行いません。
              </p>
            </section>

            <section>
              <h3 className="mb-3 text-base font-medium text-gray-900">
                4. 外部サービスの利用
              </h3>
              <p>
                本アプリでは、以下の外部サービスを利用しており、各サービスのプライバシーポリシーが適用されます。
              </p>
              <ul className="mt-2 ml-6 list-disc space-y-1">
                <li>Supabase（認証・データベース）</li>
                <li>Stripe（決済処理）</li>
                <li>Anthropic（AI解析）</li>
              </ul>
            </section>

            <section>
              <h3 className="mb-3 text-base font-medium text-gray-900">
                5. 個人情報の開示・訂正・削除
              </h3>
              <p>
                お客様は、ご自身の個人情報について、開示・訂正・削除を請求することができます。
                お問い合わせ先までご連絡ください。
              </p>
            </section>

            <section>
              <h3 className="mb-3 text-base font-medium text-gray-900">
                6. お問い合わせ
              </h3>
              <p>
                個人情報の取り扱いに関するお問い合わせは、特定商取引法に基づく表記に記載のメールアドレスまでご連絡ください。
              </p>
            </section>

            <div className="pt-4 text-xs text-gray-500">
              <p>最終更新日: 2025年1月</p>
            </div>
          </div>
        </div>
      </main>

      <Navigation />
    </div>
  );
}

