import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

function authorized(request: NextRequest) {
  const secret = process.env.ADMIN_CODE;
  const supplied = request.headers.get("x-admin-code") || "";
  if (!secret) return false;
  return timingSafeEqual(createHash("sha256").update(supplied).digest(), createHash("sha256").update(secret).digest());
}
function database() {
  if (!(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL)) throw new Error("Database URL missing");
  return neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL!);
}
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "رمز الإدارة غير صحيح." }, { status: 401 });
  try {
    const sql = database();
    const [applications, members, counts] = await Promise.all([
      sql`SELECT id,game_name,discord_id,age,hours,experience,previous_gang_name,reason,roleplay,created_at,status,rejection_reason,reviewed_at FROM applications ORDER BY id DESC LIMIT 1000`,
      sql`SELECT m.id,m.application_id,m.game_name,m.discord_id,m.joined_at,a.age,a.hours,a.roleplay,a.previous_gang_name FROM members m JOIN applications a ON a.id=m.application_id ORDER BY m.id DESC LIMIT 1000`,
      sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='accepted')::int AS accepted, COUNT(*) FILTER (WHERE status='rejected')::int AS rejected, COUNT(*) FILTER (WHERE status='pending')::int AS pending FROM applications`,
    ]);
    return NextResponse.json({ applications, members, stats: counts[0] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Review load failed", error);
    return NextResponse.json({ error: "تعذر تحميل الطلبات." }, { status: 503 });
  }
}
export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "رمز الإدارة غير صحيح." }, { status: 401 });
  try {
    const body = await request.json() as { id?: unknown; action?: unknown; reason?: unknown };
    const id = Number(body.id);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!Number.isSafeInteger(id) || id < 1 || (body.action !== "accept" && body.action !== "reject" && body.action !== "delete")) return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
    if (body.action === "reject" && (reason.length < 3 || reason.length > 500)) return NextResponse.json({ error: "اكتب سبب الرفض (3 إلى 500 حرف)." }, { status: 400 });
    const sql = database();
    if (body.action === "delete") {
      const result = await sql`DELETE FROM applications WHERE id=${id} AND status IN ('pending','rejected') RETURNING id`;
      if (!result.length) return NextResponse.json({ error: "تعذر حذف الطلب؛ ربما قُبل أو حُذف مسبقًا." }, { status: 409 });
    } else if (body.action === "accept") {
      const result = await sql`WITH accepted AS (
        UPDATE applications SET status='accepted', rejection_reason=NULL, reviewed_at=NOW()
        WHERE id=${id} AND status='pending' RETURNING id,game_name,discord_id
      ), added AS (
        INSERT INTO members(application_id,game_name,discord_id)
        SELECT id,game_name,discord_id FROM accepted
        ON CONFLICT (application_id) DO NOTHING RETURNING id
      ) SELECT COUNT(*)::int AS changed FROM accepted`;
      if (result[0].changed !== 1) return NextResponse.json({ error: "تمت مراجعة هذا الطلب مسبقًا. حدّث القائمة." }, { status: 409 });
    } else {
      const result = await sql`UPDATE applications SET status='rejected',rejection_reason=${reason},reviewed_at=NOW() WHERE id=${id} AND status='pending' RETURNING id`;
      if (!result.length) return NextResponse.json({ error: "تمت مراجعة هذا الطلب مسبقًا. حدّث القائمة." }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Review action failed", error);
    return NextResponse.json({ error: "تعذر حفظ القرار. حاول مرة أخرى." }, { status: 503 });
  }
}
