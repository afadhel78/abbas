import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { applicationId } from "../../../lib/application-session";

export async function GET(request: NextRequest) {
  try {
    const id = await applicationId(request, process.env.ADMIN_CODE);
    if (!id) return NextResponse.json({ hasApplication: false }, { headers: { "Cache-Control": "no-store" } });
    if (!(process.env.NEON_URL || process.env.DATABASE_URL)) throw new Error("Database URL missing");
    const sql = neon(process.env.NEON_URL || process.env.DATABASE_URL!);
    const rows = await sql`SELECT status,rejection_reason FROM applications WHERE id=${id} LIMIT 1`;
    if (!rows.length) return NextResponse.json({ hasApplication: false }, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ hasApplication: true, status: rows[0].status, rejectionReason: rows[0].status === "rejected" ? rows[0].rejection_reason : null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Application status failed", error);
    return NextResponse.json({ error: "تعذر تحميل حالة الطلب. حاول مرة أخرى." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
