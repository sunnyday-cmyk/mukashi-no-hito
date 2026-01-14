import Navigation from "@/components/Navigation";

export default function TokushohoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-20 py-8 pb-24">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="font-serif text-2xl font-medium text-gray-900">
              特定商取引法に基づく表記
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              古文解析アプリ「昔の人」に関する表記
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full">
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <th className="w-1/3 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700">
                    販売業者名
                  </th>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    【鎌田虎之介】
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700">
                    運営責任者
                  </th>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    【鎌田虎之介】
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700">
                    所在地
                  </th>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    【山口県山口市平井617豊島コーポラス105】
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700">
                    メールアドレス
                  </th>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    【toranosukekamada10@gmail.com】
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700">
                    電話番号
                  </th>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    【09067071777】
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700">
                    販売価格
                  </th>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    月額 500円（税込）
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700">
                    商品代金以外の必要料金
                  </th>
                  <td className="px-4 py-3 text-sm text-gray-900">なし</td>
                </tr>
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700">
                    支払方法
                  </th>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    クレジットカード決済（Stripe経由）
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700">
                    引き渡し時期
                  </th>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    お申し込み完了後、即時サービスを開始いたします
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700">
                    返品・キャンセル
                  </th>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <p className="mb-2">
                      返品・キャンセルはできません。ただし、サブスクリプションの解約はいつでも可能です。
                    </p>
                    <p className="text-xs text-gray-600">
                      解約後は、現在の請求期間終了までサービスをご利用いただけます。
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs leading-relaxed text-gray-600">
              本サービスは、特定商取引法に基づき、上記の通り表記いたします。
              <br />
              ご不明な点がございましたら、上記メールアドレスまでお問い合わせください。
            </p>
          </div>
        </div>
      </main>

      <Navigation />
    </div>
  );
}

