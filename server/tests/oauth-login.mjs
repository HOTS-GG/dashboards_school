// Manual end-to-end Google login check, using the same desktop loopback flow the widget will use.
// Usage: node server/tests/oauth-login.mjs   (server must be running; a browser window opens)
import http from "node:http";
import { spawn } from "node:child_process";

const PB = process.env.PB_URL || "http://127.0.0.1:8090";

const methods = await (await fetch(`${PB}/api/collections/users/auth-methods`)).json();
const google = methods.oauth2?.providers?.find((p) => p.name === "google");
if (!google) throw new Error("Google provider is not enabled on the users collection.");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname !== "/callback") return res.writeHead(404).end();
  const redirectURL = `http://127.0.0.1:${server.address().port}/callback`;
  let message;
  try {
    if (url.searchParams.get("state") !== google.state) throw new Error("state mismatch");
    if (url.searchParams.get("error")) throw new Error(`Google: ${url.searchParams.get("error")}`);
    const r = await fetch(`${PB}/api/collections/users/auth-with-oauth2`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "google", code: url.searchParams.get("code"), codeVerifier: google.codeVerifier, redirectURL }),
    });
    const body = await r.json();
    message = r.ok
      ? `OK  email=${body.record.email}  name=${body.record.name}  role=${body.record.role || "(empty)"}  newAccount=${body.meta?.isNew}`
      : `REJECTED  status=${r.status}  message=${body.message}`;
  } catch (err) {
    message = `ERROR  ${err.message}`;
  }
  console.log(message);
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" })
    .end(`<p style="font:16px sans-serif">${message.startsWith("OK") ? "로그인 성공" : "로그인 실패"} — 이 창을 닫아도 됩니다.</p>`);
  server.close();
});

server.listen(0, "127.0.0.1", () => {
  const redirectURL = `http://127.0.0.1:${server.address().port}/callback`;
  const authURL = google.authURL + encodeURIComponent(redirectURL) + "&hd=chunchon.gwe.hs.kr&prompt=select_account";
  console.log("Opening browser for Google login…");
  spawn("rundll32", ["url.dll,FileProtocolHandler", authURL], { detached: true, stdio: "ignore" }).unref();
});
setTimeout(() => { console.log("TIMEOUT  no login within 5 minutes"); process.exit(1); }, 300_000).unref();
