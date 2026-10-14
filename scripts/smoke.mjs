// HTTP checks against a real production server. No browser scripting is involved.
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { rm, readFile, mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import assert from "node:assert/strict";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
process.loadEnvFile(".env");
const testDirectory = path.resolve("test-results", randomUUID());
assert.equal(path.dirname(testDirectory), path.resolve("test-results"));
await mkdir(testDirectory, { recursive: true });
await writeFile(path.join(testDirectory, "smoke.db"), "");
process.env.DATABASE_URL = `file:${path.join(testDirectory, "smoke.db").replaceAll("\\", "/")}`;
process.env.STORAGE_DIR = path.join(testDirectory, "images");
process.env.OTP_PROVIDER = "mock";
process.env.REQUIRE_ADMIN_APPROVAL = "false";
const initialized = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"],
  { env: process.env, stdio: "pipe" },
);
assert.equal(initialized.status, 0, "isolated smoke database initialized");
const db = new PrismaClient();
const reservation = createServer();
reservation.listen(0, "127.0.0.1");
await once(reservation, "listening");
const port = reservation.address().port;
await new Promise((r) => reservation.close(r));
const base = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--port",
    String(port),
    "--hostname",
    "127.0.0.1",
  ],
  {
    env: {
      ...process.env,
      APP_URL: base,
      NODE_ENV: "production",
      ALLOW_MOCK_OTP: "true",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "",
  listingId,
  images = [];
server.stdout.on("data", (d) => {
  logs += d.toString();
});
server.stderr.on("data", (d) => {
  logs += d.toString();
});
const pause = () => new Promise((r) => setTimeout(r, 100));
const post = (route, body, cookie) =>
  fetch(base + route, {
    method: "POST",
    headers: { Origin: base, ...(cookie ? { Cookie: cookie } : {}) },
    body,
    redirect: "manual",
  });
const fields = (o) => new URLSearchParams(o);
try {
  let ready = false;
  for (let i = 0; i < 150; i++) {
    try {
      if ((await fetch(base + "/")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await pause();
  }
  assert.ok(ready, "production server starts");
  const home = await (await fetch(base + "/")).text();
  assert.match(home, /<html[^>]*lang="he"[^>]*dir="rtl"/);
  assert.ok(!home.includes("+972500000000"), "no phone in public HTML");
  assert.ok(
    !/https?:\/\/(?:fonts|cdn|www\.google)/.test(home),
    "no remote page resources",
  );
  assert.equal(
    (await fetch(base + "/?category=toString&condition=constructor")).status,
    200,
    "invalid enums safely ignored",
  );
  for (const route of [
    "/post",
    "/about",
    "/rules",
    "/contact",
    "/admin",
    "/?q=שבילים",
    "/?free=1",
    "/?page=2",
  ])
    assert.equal((await fetch(base + route)).status, 200, route);
  const photo = await sharp({
    create: { width: 1600, height: 1800, channels: 3, background: "#bcc8ab" },
  })
    .jpeg()
    .withMetadata()
    .toBuffer();
  const form = new FormData();
  for (const [key, value] of Object.entries({
    title: "ספר בדיקת מערכת",
    authorPublisher: "בדיקת HTTP",
    category: "READING",
    condition: "GOOD",
    price: "15",
    city: "בני ברק",
    phone: "0501234567",
    channel: "voice",
  }))
    form.set(key, value);
  form.set("images", new Blob([photo], { type: "image/jpeg" }), "cover.jpg");
  const created = await post("/api/forms/create", form);
  assert.equal(created.status, 303);
  const verifyUrl = new URL(created.headers.get("location"));
  assert.match(verifyUrl.pathname, /^\/verify\/[a-f0-9]{64}$/);
  const token = verifyUrl.pathname.split("/").at(-1);
  const listing = await db.listing.findUniqueOrThrow({
    where: { manageToken: token },
    include: { images: true },
  });
  listingId = listing.id;
  images = listing.images.map((i) => i.path);
  assert.equal(listing.verifiedAt, null);
  assert.equal(
    (await fetch(base + `/listing/${listing.id}`)).status,
    404,
    "draft hidden",
  );
  assert.equal(
    (await fetch(base + `/media/${images[0]}`)).status,
    404,
    "draft image hidden",
  );
  const metadata = await sharp(
    await readFile(
      path.resolve(process.env.STORAGE_DIR || "storage", images[0]),
    ),
  ).metadata();
  assert.equal(metadata.format, "webp");
  assert.ok(metadata.width <= 1000);
  assert.equal(metadata.exif, undefined);
  for (let i = 0; i < 30 && !/MOCK OTP VOICE.*\d{6}/.test(logs); i++)
    await pause();
  const code = logs.match(/MOCK OTP VOICE\] [^:]+: (\d{6})/)?.[1];
  assert.ok(code, "voice OTP logged on server");
  const verified = await post("/api/forms/otp-verify", fields({ token, code }));
  assert.equal(verified.status, 303);
  assert.match(verified.headers.get("location"), /\/manage\//);
  const publicResponse = await fetch(base + `/listing/${listing.id}`);
  assert.equal(publicResponse.status, 200);
  const html = await publicResponse.text();
  assert.ok(!html.includes(listing.phone));
  assert.ok(!html.includes(token));
  assert.ok(html.includes("הצג טלפון"));
  const imageResponse = await fetch(base + `/media/${images[0]}`);
  assert.equal(imageResponse.status, 200);
  assert.equal(imageResponse.headers.get("content-type"), "image/webp");
  const reveal = await post(`/api/listings/${listing.id}/phone`, fields({}));
  assert.equal(reveal.status, 200);
  assert.match(reveal.headers.get("cache-control"), /no-store/);
  const contact = await reveal.text();
  assert.ok(contact.includes("tel:+972501234567"));
  assert.ok(contact.includes("wa.me/972501234567"));
  assert.ok(contact.includes("0501234567"));
  assert.equal(
    (await fetch(base + `/api/listings/${listing.id}/phone`)).status,
    405,
    "GET cannot reveal phone",
  );
  const cross = await fetch(base + "/api/forms/manage", {
    method: "POST",
    headers: { Origin: "https://foreign.invalid" },
    body: fields({ token, operation: "sold" }),
    redirect: "manual",
  });
  assert.match(cross.headers.get("location"), /error=/);
  assert.equal(
    (await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).status,
    "ACTIVE",
  );
  await post(
    "/api/forms/report",
    fields({ listingId: listing.id, reason: "בדיקת דיווח" }),
  );
  assert.equal(await db.report.count({ where: { listingId: listing.id } }), 1);
  const login = await post(
    "/api/forms/admin-login",
    fields({ password: process.env.ADMIN_PASSWORD }),
  );
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  const adminHtml = await (
    await fetch(base + "/admin", { headers: { Cookie: cookie } })
  ).text();
  assert.ok(adminHtml.includes("בדיקת דיווח"));
  const edit = fields({
    token,
    operation: "edit",
    title: "ספר הימורים לבדיקה",
    authorPublisher: "בדיקת HTTP",
    category: "READING",
    condition: "GOOD",
    price: "15",
    city: "בני ברק",
  });
  await post("/api/forms/manage", edit);
  assert.equal(
    (await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).status,
    "PENDING",
    "keyword edit needs moderation",
  );
  assert.equal(
    (await fetch(base + `/media/${images[0]}`)).status,
    404,
    "pending image hidden from public",
  );
  const review = await fetch(base + `/media/${images[0]}`, {
    headers: { Cookie: cookie },
  });
  assert.equal(review.status, 200, "admin can inspect pending image");
  assert.match(review.headers.get("cache-control"), /private, no-store/);
  await post(
    "/api/forms/admin",
    fields({ operation: "approve", id: listing.id }),
    cookie,
  );
  assert.equal(
    (await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).status,
    "ACTIVE",
  );
  await post("/api/forms/manage", fields({ token, operation: "extend" }));
  await post("/api/forms/manage", fields({ token, operation: "sold" }));
  assert.equal(
    (await fetch(base + `/listing/${listing.id}`)).status,
    404,
    "sold hidden",
  );
  await post(
    "/api/forms/admin",
    fields({ operation: "block", phone: listing.phone, reason: "בדיקת חסימה" }),
    cookie,
  );
  assert.ok(
    await db.blockedPhone.findUnique({ where: { phone: listing.phone } }),
  );
  await post("/api/forms/manage", fields({ token, operation: "delete" }));
  assert.equal(
    (await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).status,
    "REMOVED",
  );
  console.info(
    "HTTP smoke checks passed: RTL pages, upload processing, voice OTP, publication, privacy, reveal, reports, admin, blocking, seller actions and sold visibility.",
  );
} finally {
  server.kill();
  await once(server, "exit").catch(() => {});
  if (listingId)
    await db.listing.delete({ where: { id: listingId } }).catch(() => {});
  await db.blockedPhone.deleteMany({
    where: { phone: "+972501234567", reason: "בדיקת חסימה" },
  });
  for (const key of images)
    await rm(path.resolve(process.env.STORAGE_DIR || "storage", key), {
      force: true,
    });
  await db.$disconnect();
  await rm(testDirectory, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 200,
  });
}
