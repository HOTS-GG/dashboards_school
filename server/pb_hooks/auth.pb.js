/// <reference path="../pb_data/types.d.ts" />

// Only school accounts may exist. Checked when any users record is created
// (Google sign-up included), so no other path can bypass it; the `hd` hint on
// the Google login page is cosmetic. Users can't change their email afterwards
// (see users.updateRule), so every account stays in the school domain.
onRecordCreate((e) => {
  const email = e.record.getString("email").toLowerCase();
  if (!email.endsWith("@chunchon.gwe.hs.kr")) {
    throw new ForbiddenError("학교 계정(@chunchon.gwe.hs.kr)으로만 로그인할 수 있습니다.");
  }
  if (!e.record.getString("role")) {
    e.record.set("role", "member");
  }
  e.next();
}, "users");
