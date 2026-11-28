// オフラインで開くための保存。版（9f9a79d4ff）が変わると、古い保存は消える
const CACHE = "kintore-9f9a79d4ff";
const FILES = ["./", "index.html", "manifest.webmanifest", "assets/icon-192.png", "assets/icon-512.png", "assets/apple-touch-icon.png"];
self.addEventListener("install", (e) => { // cache: "reload" で、端末が10分間覚えている古いページではなく、必ず最新を取りに行く
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(FILES.map((f) => fetch(new Request(f, { cache: "reload" })).then((r) => { if (!r.ok) throw new Error(f); return c.put(f, r); })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const same = new URL(r.url).origin === self.location.origin;
  if (same) {
    // 自分のファイル：保存したものを先に出し、なければ取りに行く。開くページは、取れなければ保存した本体を出す
    e.respondWith(caches.match(r, { ignoreSearch: true }).then((hit) => hit || fetch(r).catch(() => (r.mode === "navigate" ? caches.match("index.html") : Response.error()))));
  } else {
    // 外のものは、フォントと部品（決まった場所）だけ保存する。GitHub のバックアップなど、ほかは一切さわらない。
    // （以前は全部を保存していて、GitHub から古いバックアップが返り、同期で今日の記録が消えた・11/28）
    const KEEP = ["fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net"];
    if (KEEP.indexOf(new URL(r.url).hostname) < 0) return;
    // フォントなど：保存があれば先に出し、裏で新しくする。電波がなければ保存したものだけ
    e.respondWith(caches.open(CACHE).then((c) => c.match(r).then((hit) => {
      const net = fetch(r).then((res) => { if (res && (res.ok || res.type === "opaque")) c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
