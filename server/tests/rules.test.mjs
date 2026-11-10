// Exercises M1 access rules against the local PocketBase. Creates and removes its own test users.
const B = "http://127.0.0.1:8090/api";
const results = [];
const check = (name, ok, extra = "") => results.push(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);

async function req(method, path, token, body) {
  const r = await fetch(B + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}

const su = (await req("POST", "/collections/_superusers/auth-with-password", null, {
  identity: process.env.SU_EMAIL, password: process.env.SU_PASS,
})).json.token;

// collections exist
const cols = await req("GET", "/collections?perPage=200", su);
const names = cols.json.items.map((c) => c.name);
for (const n of ["events", "timetable_slots", "bell_times"]) check(`collection ${n} exists`, names.includes(n));
const usersCol = cols.json.items.find((c) => c.name === "users");
check("users password auth disabled", usersCol.passwordAuth.enabled === false);
check("users has role field", usersCol.fields.some((f) => f.name === "role"));

const pw = crypto.randomUUID();
const mk = async (tag) => (await req("POST", "/collections/users/records", su, {
  email: `m1test-${tag}-${Date.now()}@chunchon.gwe.hs.kr`, password: pw, passwordConfirm: pw, name: `테스트${tag}`,
})).json;
const A = await mk("a"), Bu = await mk("b");
const imp = async (id) => (await req("POST", `/collections/users/impersonate/${id}`, su, { duration: 600 })).json.token;
const ta = await imp(A.id), tb = await imp(Bu.id);

try {
  const now = new Date(), later = new Date(Date.now() + 3600e3);
  const ev = { title: "회의", start: now.toISOString(), end: later.toISOString(), category: "회의" };

  let r = await req("POST", "/collections/events/records", ta, { ...ev, owner: A.id });
  check("A creates own event", r.status === 200, r.status);
  const evId = r.json?.id;

  r = await req("POST", "/collections/events/records", ta, { ...ev, owner: Bu.id });
  check("A cannot create event owned by B", r.status >= 400, r.status);

  r = await req("POST", "/collections/events/records", ta, { ...ev, owner: A.id, start: later.toISOString(), end: now.toISOString() });
  check("end before start rejected", r.status === 400, r.status);

  r = await req("GET", "/collections/events/records", tb);
  check("B sees A's event", r.json?.items?.some((i) => i.id === evId));

  r = await req("GET", "/collections/events/records", null);
  check("anonymous sees no events", r.json?.items?.length === 0, `items=${r.json?.items?.length}`);

  r = await req("PATCH", `/collections/events/records/${evId}`, tb, { title: "x" });
  check("B cannot edit A's event", r.status === 404, r.status);

  r = await req("PATCH", `/collections/events/records/${evId}`, ta, { owner: Bu.id });
  check("A cannot hand event to B", r.status === 404, r.status);

  r = await req("DELETE", `/collections/events/records/${evId}`, tb);
  check("B cannot delete A's event", r.status === 404, r.status);

  r = await req("PATCH", `/collections/users/records/${Bu.id}`, tb, { role: "admin" });
  check("B cannot make self admin", r.status >= 400, r.status);

  r = await req("PATCH", `/collections/users/records/${Bu.id}`, tb, { name: "새이름" });
  check("B can rename self", r.status === 200, r.status);

  r = await req("POST", "/collections/users/records", null, { email: "x@chunchon.gwe.hs.kr", password: pw, passwordConfirm: pw });
  check("public sign-up blocked", r.status >= 400, r.status);

  r = await req("POST", "/collections/users/records", su, { email: `m1test-${Date.now()}@gmail.com`, password: pw, passwordConfirm: pw });
  check("non-school email can't exist (even via superuser)", r.status >= 400, r.status);
  if (r.status < 400) await req("DELETE", `/collections/users/records/${r.json.id}`, su);

  check("new user defaults to member", A.role === "member", A.role);

  r = await req("POST", "/collections/users/auth-with-password", null, { identity: A.email, password: pw });
  check("user password login blocked", r.status >= 400, r.status);

  r = await req("POST", "/collections/timetable_slots/records", ta, { owner: A.id, term: "2026-2", weekday: 1, period: 3, subject: "수학", class_label: "2-3" });
  check("A creates timetable slot", r.status === 200, r.status);

  r = await req("POST", "/collections/timetable_slots/records", ta, { owner: A.id, term: "2026-2", weekday: 1, period: 3, subject: "중복" });
  check("duplicate slot rejected", r.status === 400, r.status);

  r = await req("GET", "/collections/timetable_slots/records", tb);
  check("B cannot see A's timetable", r.json?.items?.length === 0, `items=${r.json?.items?.length}`);

  // Real bell times may already exist (period is unique), so test with a free period.
  const used = (await req("GET", "/collections/bell_times/records?perPage=50", su)).json.items.map((b) => b.period);
  const freePeriod = [9, 8, 7, 6, 5, 4, 3, 2, 1].find((p) => !used.includes(p));

  r = await req("POST", "/collections/bell_times/records", ta, { period: freePeriod, start: "18:00", end: "18:50" });
  check("member cannot set bell times", r.status >= 400, r.status);

  await req("PATCH", `/collections/users/records/${Bu.id}`, su, { role: "admin" });
  const tbAdmin = await imp(Bu.id);

  r = await req("POST", "/collections/bell_times/records", tbAdmin, { period: freePeriod, start: "18:00", end: "18:50" });
  check("admin sets bell times", r.status === 200, r.status);
  if (r.json?.id) await req("DELETE", `/collections/bell_times/records/${r.json.id}`, su);

  r = await req("POST", "/collections/bell_times/records", su, { period: 2, start: "9:5", end: "09:50" });
  check("bad time format rejected", r.status === 400, r.status);

  r = await req("PATCH", `/collections/events/records/${evId}`, tbAdmin, { title: "관리자 수정" });
  check("admin edits others' event", r.status === 200, r.status);

  r = await req("DELETE", `/collections/events/records/${evId}`, tbAdmin);
  check("admin deletes others' event", r.status === 204, r.status);
} finally {
  await req("DELETE", `/collections/users/records/${A.id}`, su);
  await req("DELETE", `/collections/users/records/${Bu.id}`, su);
}

console.log(results.join("\n"));
console.log(`\n${results.filter((l) => l.startsWith("PASS")).length}/${results.length} passed`);
