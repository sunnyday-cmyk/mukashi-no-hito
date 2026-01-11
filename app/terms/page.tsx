import Navigation from "@/components/Navigation";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-5">
          <h1 className="text-base font-medium text-gray-900">利用規約</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 pb-24">
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-medium text-gray-900">
              利用規約
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              古文解析アプリ「昔の人」のご利用に関する規約
            </p>
          </div>

          <div className="space-y-6 text-sm leading-relaxed text-gray-700">
            <section>
              <h3 className="mb-3 text-base font-medium text-gray-900">
                第1条（適用）
              </h3>
              <p>
                本規約は、古文解析アプリ「昔の人」（以下「本サービス」）の利用条件を定めるものです。
                ご利用いただく際は、本規約に同意いただいたものとみなします。
              </p>
            </section>

            <section>
              <h3 className="mb-3 text-base font-medium text-gray-900">
                第2条（利用登録）
              </h3>
              <p>
                本サービスの利用には、アカウント登録が必要です。
                登録情報は正確にご入力いただき、適切に管理してください。
              </p>
            </section>

            <section>
              <h3 className="mb-3 text-base font-medium text-gray-900">
                第3条（利用料金）
              </h3>
              <p>
                本サービスは、月額500円（税込）のサブスクリプション制です。
                料金は、特定商取引法に基づく表記に従います。
              </p>
            </section>

            <section>
              <h3 className="mb-3 text-base font-medium text-gray-900">
                第4条（禁止事項）
              </h3>
              <p>以下の行為を禁止いたします。</p>
              <ul className="mt-2 ml-6 list-disc space-y-1">
                <li>法令または公序良俗に違反する行為</li>
                <li>犯罪行為に関連する行為</li>
                <li>本サービスの内容等、本サービスに含まれる著作権、商標権ほか知的財産権を侵害する行為</li>
                <li>本サービス、ほかのユーザー、またはその他第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
                <li>本サービスによって得られた情報を商業的に利用する行為</li>
                <li>その他、当社が不適切と判断する行為</li>
              </ul>
            </section>

            <section>
              <h3 className="mb-3 text-base font-medium text-gray-900">
                第5条（サービスの提供の停止等）
              </h3>
              <p>
                当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
              </p>
              <ul className="mt-2 ml-6 list-disc space-y-1">
                <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
                <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
                <li>その他、当社が本サービスの提供が困難と判断した場合</li>
              </ul>
            </section>

            <section>
              <h3 className="mb-3 text-base font-medium text-gray-900">
                第6条（保証の否認および免責）
              </h3>
              <p>
                当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。
                解析結果の正確性についても保証いたしません。
              </p>
            </section>

            <section>
              <h3 className="mb-3 text-base font-medium text-gray-900">
                第7条（サービス内容の変更等）
              </h3>
              <p>
                当社は、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
              </p>
            </section>

            <section>
              <h3 className="mb-3 text-base font-medium text-gray-900">
                第8条（利用規約の変更）
              </h3>
              <p>
                当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
                なお、本規約の変更後、本サービスの利用を開始した場合には、当該ユーザーは変更後の規約に同意したものとみなします。
              </p>
            </section>

            <section>
              <h3 className="mb-3 text-base font-medium text-gray-900">
                第9条（準拠法・裁判管轄）
              </h3>
              <p>
                本規約の解釈にあたっては、日本法を準拠法とします。
                本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
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

