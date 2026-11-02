/// <reference path="../pb_data/types.d.ts" />

// v1 schema: users (Google login only), events, timetable_slots, bell_times.
// See docs/design.md §5.1–5.2.

const SIGNED_IN = '@request.auth.id != "" && @request.auth.collectionName = "users"';
const IS_ADMIN = '@request.auth.role = "admin"';
// The owner must be the caller on create, and may not be reassigned on update.
const OWNER_ON_CREATE = `${SIGNED_IN} && @request.body.owner = @request.auth.id`;
const OWNER_KEPT = '(@request.body.owner:isset = false || @request.body.owner = @request.auth.id)';

migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.fields.add(new SelectField({ name: "role", values: ["member", "admin"], maxSelect: 1 }));
  users.passwordAuth.enabled = false; // Google OAuth2 only; enabled once a provider is configured
  users.listRule = SIGNED_IN;
  users.viewRule = SIGNED_IN;
  // Accounts are created only by the OAuth2 flow, never with a chosen role.
  users.createRule = '@request.context = "oauth2" && @request.body.role:isset = false';
  users.updateRule = 'id = @request.auth.id && @request.body.role:isset = false && @request.body.email:isset = false';
  users.deleteRule = null;
  app.save(users);

  const events = new Collection({
    type: "base",
    name: "events",
    listRule: SIGNED_IN,
    viewRule: SIGNED_IN,
    createRule: OWNER_ON_CREATE,
    updateRule: `(owner = @request.auth.id && ${OWNER_KEPT}) || ${IS_ADMIN}`,
    deleteRule: `owner = @request.auth.id || ${IS_ADMIN}`,
    fields: [
      { name: "title", type: "text", required: true, max: 100 },
      { name: "description", type: "text", max: 2000 },
      { name: "location", type: "text", max: 100 },
      { name: "start", type: "date", required: true },
      { name: "end", type: "date", required: true },
      { name: "all_day", type: "bool" },
      { name: "category", type: "select", maxSelect: 1, values: ["학사", "회의", "행사", "출장", "기타"] },
      { name: "rrule", type: "text", max: 500 },
      { name: "exdates", type: "json", maxSize: 20000 },
      { name: "owner", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE INDEX idx_events_start ON events (start)"],
  });
  app.save(events);

  const slots = new Collection({
    type: "base",
    name: "timetable_slots",
    listRule: "owner = @request.auth.id",
    viewRule: "owner = @request.auth.id",
    createRule: OWNER_ON_CREATE,
    updateRule: `owner = @request.auth.id && ${OWNER_KEPT}`,
    deleteRule: "owner = @request.auth.id",
    fields: [
      { name: "owner", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
      { name: "term", type: "text", required: true, max: 20 },
      { name: "weekday", type: "number", required: true, onlyInt: true, min: 1, max: 5 },
      { name: "period", type: "number", required: true, onlyInt: true, min: 1, max: 9 },
      { name: "subject", type: "text", required: true, max: 50 },
      { name: "class_label", type: "text", max: 20 },
      { name: "room", type: "text", max: 50 },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_slots_unique ON timetable_slots (owner, term, weekday, period)",
    ],
  });
  app.save(slots);

  const bells = new Collection({
    type: "base",
    name: "bell_times",
    listRule: SIGNED_IN,
    viewRule: SIGNED_IN,
    createRule: IS_ADMIN,
    updateRule: IS_ADMIN,
    deleteRule: IS_ADMIN,
    fields: [
      { name: "period", type: "number", required: true, onlyInt: true, min: 1, max: 9 },
      { name: "start", type: "text", required: true, pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
      { name: "end", type: "text", required: true, pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_bell_period ON bell_times (period)"],
  });
  app.save(bells);
}, (app) => {
  for (const name of ["bell_times", "timetable_slots", "events"]) {
    app.delete(app.findCollectionByNameOrId(name));
  }
  const users = app.findCollectionByNameOrId("users");
  users.fields.removeByName("role");
  users.passwordAuth.enabled = true;
  users.listRule = "id = @request.auth.id";
  users.viewRule = "id = @request.auth.id";
  users.createRule = "";
  users.updateRule = "id = @request.auth.id";
  users.deleteRule = "id = @request.auth.id";
  app.save(users);
});
