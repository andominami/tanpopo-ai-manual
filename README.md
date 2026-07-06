# タンポポ・アイ・マニュアル

院内向けの動画マニュアルを、カテゴリ分け・検索付きの一覧サイトとしてまとめたものです。
動画本体はGoogle Driveに保存し、このサイトから埋め込み表示します。

## サイトの公開（GitHub Pages）

1. GitHubのこのリポジトリで **Settings > Pages** を開く
2. 「Build and deployment」の Source を **GitHub Actions** に設定
3. `main` ブランチにpushすると、自動でサイトが公開されます（`.github/workflows/deploy-pages.yml`）
4. 公開URLは Settings > Pages に表示されます

## 動画の追加方法

1. 動画ファイルをGoogle Driveにアップロードし、共有設定を **「リンクを知っている全員が閲覧可」** にする
   - スタッフ全員がクリニックのGoogleアカウントでログインしている前提なら「組織内で共有」でも可
2. Google DriveのファイルURLからファイルIDを取り出す
   - 例: `https://drive.google.com/file/d/【ここがファイルID】/view`
3. `data/videos.json` に新しい項目を追加する

```json
{
  "id": "任意の一意な文字列（例: reception-morning-01）",
  "title": "動画のタイトル",
  "description": "動画の内容を簡単に説明する文章",
  "category": "受付業務",
  "recordedDate": "撮影時期（例: 2023年3月、わからなければ空文字のままでOK）",
  "driveFileId": "取り出したファイルID"
}
```

4. 変更をコミットして`main`ブランチにpushすると、自動でサイトに反映されます

カテゴリは`videos.json`内で使われている値から自動的に一覧生成されるので、新しいカテゴリ名を使えばそのまま絞り込みボタンに追加されます。

`recordedDate`は撮影時期の目安を表示するための項目です。「2023年3月」のような大まかな表記でも構いません。空文字（`""`）のままにしておけば、その動画では表示されません。マニュアルの内容は時間が経つと変わることがあるため、わかる範囲で埋めておくと「いつの情報か」がスタッフにも伝わりやすくなります。

## ローカルで確認する場合

`fetch`でJSONを読み込む都合上、`index.html`を直接ブラウザで開くと動画一覧が表示されません。簡易サーバーを立てて確認してください。

```bash
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開いて確認できます。
