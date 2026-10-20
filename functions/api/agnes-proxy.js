/* ============================================================
   Cloudflare Pages Function — proxy Agnes AI.
   Kunci API disimpan sebagai environment variable di Cloudflare
   (AGNES_API_KEY), tidak pernah dikirim ke browser.

   Deploy: folder `functions/` di root repo otomatis dideploy oleh
   Cloudflare Pages (build output `dist`). Set Variable di:
   Pages project > Settings > Environment Variables:
     AGNES_API_KEY   (wajib)
     AGNES_BASE_URL  (opsional, default apihub.agnes-ai.com/v1)
     AGNES_MODEL     (opsional, default agnes-2.5-flash)
   ============================================================ */

const DEFAULT_BASE = "https://apihub.agnes-ai.com/v1";
const DEFAULT_MODEL = "agnes-2.5-flash";

/* Rate limit per-IP (aproksimasi: mengikuti isolate Cloudflare). */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const hits = new Map();

function json(res, status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function rateLimited(ip) {
  const now = Date.now();
  const window = hits.get(ip) || [];
  while (window.length > 0 && now - window[0] > WINDOW_MS) window.shift();
  window.push(now);
  hits.set(ip, window);
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (now - v[v.length - 1] > WINDOW_MS) hits.delete(k);
    }
  }
  return window.length > MAX_PER_WINDOW;
}

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  if (!env.AGNES_API_KEY) {
    return json(501, {
      error: "Proxy AI belum dikonfigurasi. Set AGNES_API_KEY di Cloudflare Pages.",
    });
  }
  if (rateLimited(ip)) {
    return json(429, {
      error: "Terlalu banyak permintaan AI. Coba lagi dalam satu menit.",
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Isi permintaan tidak valid." });
  }

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const validMessages =
    messages.length > 0 &&
    messages.length <= 8 &&
    messages.every(
      (m) =>
        m &&
        (m.role === "system" || m.role === "user") &&
        typeof m.content === "string" &&
        m.content.length <= 6000,
    );
  if (!validMessages) {
    return json(400, { error: "Struktur pesan tidak valid." });
  }

  const temperature =
    typeof body.temperature === "number"
      ? Math.min(1, Math.max(0, body.temperature))
      : 0.3;
  const max_tokens =
    typeof body.max_tokens === "number"
      ? Math.min(512, Math.max(16, Math.trunc(body.max_tokens)))
      : 350;

  try {
    const base = String(env.AGNES_BASE_URL || DEFAULT_BASE).replace(/\/+$/, "");
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.AGNES_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.AGNES_MODEL || DEFAULT_MODEL,
        temperature,
        max_tokens,
        messages,
      }),
    });
    if (!res.ok) {
      return json(502, { error: `Penyedia AI merespons ${res.status}.` });
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    /* hanya bidang konten yang dikembalikan — sisa respons tidak diteruskan */
    return json(200, { content });
  } catch {
    return json(502, { error: "Gagal menghubungi penyedia AI." });
  }
}
