// Delivery email for BANNER 70 (sent through Resend).

const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export const formatJapanTime = timestamp => new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}).format(new Date(timestamp));

export const buildDownloadEmail = ({ customerName, downloadUrl, expiresAt, maxDownloads, contactUrl }) => {
  const greeting = customerName ? `${customerName} 様` : 'お客様';
  const expiresText = `${formatJapanTime(expiresAt)}（日本時間）まで`;
  const subject = '【BANNER 70】Figmaデータのダウンロードのご案内';
  const text = [
    greeting,
    '',
    'このたびは BANNER 70 をご購入いただき、誠にありがとうございます。',
    '下記のページから、Figmaデータ（.figファイル）をダウンロードしてください。',
    '',
    downloadUrl,
    '',
    `・有効期限：${expiresText}`,
    `・ダウンロード可能回数：${maxDownloads}回まで`,
    '',
    '【Figmaでの開き方】',
    'Figmaのファイルブラウザに、ダウンロードした .fig ファイルをドラッグ＆ドロップするか、「インポート」から読み込んでください。',
    '',
    '【ご注意】',
    '・このメールとダウンロードリンクは、第三者と共有しないでください。',
    '・テンプレートの再販売・再配布は禁止しています。',
    '',
    `ご不明な点は、こちらからお問い合わせください：${contactUrl}`,
    '',
    '株式会社ANYAKU / BANNER 70'
  ].join('\n');
  const html = `<!doctype html>
<html lang="ja">
<body style="margin:0;padding:0;background:#f6f4f6;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Kaku Gothic ProN','Hiragino Sans',Meiryo,sans-serif;color:#17151e;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="background:#ffffff;border-radius:16px;padding:32px 28px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.14em;color:#5a2aff;">BANNER 70</p>
      <h1 style="margin:0 0 20px;font-size:20px;line-height:1.5;">Figmaデータのダウンロードのご案内</h1>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.9;">${escapeHtml(greeting)}<br>このたびは BANNER 70 をご購入いただき、誠にありがとうございます。<br>下記のボタンから、Figmaデータ（.figファイル）をダウンロードしてください。</p>
      <p style="margin:24px 0;text-align:center;"><a href="${escapeHtml(downloadUrl)}" style="display:inline-block;background:#5a2aff;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:16px 32px;border-radius:12px;">ダウンロードページを開く</a></p>
      <table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px;line-height:1.8;margin:0 0 20px;">
        <tr><td style="padding:8px 0;border-top:1px solid #eee;color:#746e78;width:40%;">有効期限</td><td style="padding:8px 0;border-top:1px solid #eee;">${escapeHtml(expiresText)}</td></tr>
        <tr><td style="padding:8px 0;border-top:1px solid #eee;border-bottom:1px solid #eee;color:#746e78;">ダウンロード可能回数</td><td style="padding:8px 0;border-top:1px solid #eee;border-bottom:1px solid #eee;">${escapeHtml(maxDownloads)}回まで</td></tr>
      </table>
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;">Figmaでの開き方</p>
      <p style="margin:0 0 18px;font-size:13px;line-height:1.9;color:#46424f;">Figmaのファイルブラウザに、ダウンロードした .fig ファイルをドラッグ＆ドロップするか、「インポート」から読み込んでください。</p>
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;">ご注意</p>
      <p style="margin:0;font-size:12px;line-height:1.9;color:#746e78;">・このメールとダウンロードリンクは、第三者と共有しないでください。<br>・テンプレートの再販売・再配布は禁止しています。</p>
    </div>
    <p style="margin:18px 4px 0;font-size:11px;line-height:1.8;color:#837d89;">ボタンが開けない場合は、次のURLをブラウザに貼り付けてください：<br><a href="${escapeHtml(downloadUrl)}" style="color:#5a2aff;word-break:break-all;">${escapeHtml(downloadUrl)}</a><br><br>ご不明な点は<a href="${escapeHtml(contactUrl)}" style="color:#5a2aff;">お問い合わせ</a>ください。<br>株式会社ANYAKU / BANNER 70</p>
  </div>
</body>
</html>`;
  return { subject, text, html };
};

/** Mailer backed by a Resend client. */
export const createResendMailer = ({ resend, from, replyTo, contactUrl }) => ({
  async sendDownloadEmail({ to, customerName, downloadUrl, expiresAt, maxDownloads, idempotencyKey }) {
    const message = buildDownloadEmail({ customerName, downloadUrl, expiresAt, maxDownloads, contactUrl });
    const { data, error } = await resend.emails.send(
      { from, to, replyTo: replyTo || undefined, ...message },
      { idempotencyKey }
    );
    if (error) throw new Error(`Resend error: ${error.name ?? ''} ${error.message ?? JSON.stringify(error)}`.trim());
    return data;
  }
});
