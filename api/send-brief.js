module.exports = async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  const origin = req.headers.origin || "";

  if (allowedOrigin && origin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  if (allowedOrigin && origin !== allowedOrigin) {
    return res.status(403).json({ ok: false, error: "Origin not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return res.status(500).json({ ok: false, error: "Server is not configured" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const markdown = String(body?.markdown || "");
    const filename = String(body?.filename || "brief.md").slice(0, 180);
    const caption = String(body?.caption || "Новый бриф").slice(0, 1000);

    if (!markdown || markdown.length > 500000) {
      return res.status(400).json({ ok: false, error: "Invalid brief" });
    }

    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("caption", caption);
    form.append("document", new Blob([markdown], { type: "text/markdown;charset=utf-8" }), filename);

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${token}/sendDocument`,
      { method: "POST", body: form }
    );
    const telegramData = await telegramResponse.json().catch(() => null);

    if (!telegramResponse.ok || !telegramData?.ok) {
      return res.status(502).json({ ok: false, error: "Telegram delivery failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Unexpected server error" });
  }
};
