import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { applicationId, setApplicationCookie } from "../../../lib/application-session";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ADMIN_CODE || !(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL)) throw new Error("Application configuration missing");
    if (await applicationId(request, process.env.ADMIN_CODE)) return NextResponse.json({ error: "لديك طلب سابق. افتح حالة الطلب لمتابعته." }, { status: 409 });
    const data = await request.json() as Record<string, unknown>;
    const value = (key: string, max: number) => typeof data[key] === "string" ? data[key].trim().slice(0, max) : "";
    const gameName = value("gameName", 60), discordId = value("discordId", 22), experience = value("experience", 10), previousGangName = value("previousGangName", 60), reason = value("reason", 1000), roleplay = value("roleplay", 1000);
    const age = Number(data.age), hours = Number(data.hours);
    if (!gameName || !/^\d{15,22}$/.test(discordId) || !Number.isInteger(age) || age < 13 || age > 80 || !Number.isInteger(hours) || hours < 0 || hours > 50000 || !["نعم", "لا"].includes(experience) || (experience === "نعم" && (previousGangName.length < 2 || previousGangName.length > 60)) || reason.length < 20 || !Number.isInteger(Number(roleplay)) || Number(roleplay) < 1 || Number(roleplay) > 500) {
      return NextResponse.json({ error: "تحقق من جميع الحقول ومعرّف ديسكورد الرقمي." }, { status: 400 });
    }
    const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL!);
    const existing = await sql`SELECT id FROM applications WHERE discord_id=${discordId} LIMIT 1`;
    if (existing.length) return NextResponse.json({ error: "سبق تقديم طلب بهذا المعرّف. يُسمح بطلب واحد فقط لكل معرّف ديسكورد." }, { status: 409 });
    let saved;
    try {
      saved = await sql`INSERT INTO applications (game_name, discord_id, age, hours, experience, previous_gang_name, reason, roleplay)
        VALUES (${gameName}, ${discordId}, ${age}, ${hours}, ${experience}, ${experience === "نعم" ? previousGangName : null}, ${reason}, ${roleplay}) RETURNING id`;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "23505") {
        return NextResponse.json({ error: "سبق تقديم طلب بهذا المعرّف. يُسمح بطلب واحد فقط لكل معرّف ديسكورد." }, { status: 409 });
      }
      throw error;
    }
    const response = NextResponse.json({ hasApplication: true, status: "pending", rejectionReason: null });
    await setApplicationCookie(response, Number(saved[0].id), process.env.ADMIN_CODE);
    return response;
  } catch (error) {
    console.error("Application save failed", error);
    return NextResponse.json({ error: "تعذر حفظ الطلب مؤقتًا. حاول مرة أخرى بعد قليل." }, { status: 503 });
  }
}
