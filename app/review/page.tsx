"use client";
import { FormEvent, useState } from "react";

type Application = { id: number; game_name: string; discord_id: string; age: number; hours: number; experience: string; previous_gang_name: string | null; reason: string; roleplay: string; created_at: string; status: "pending" | "accepted" | "rejected"; rejection_reason: string | null; reviewed_at: string | null };
type Member = { id: number; application_id: number; game_name: string; discord_id: string; joined_at: string; age: number; hours: number; roleplay: string; previous_gang_name: string | null };
type Stats = { total: number; accepted: number; rejected: number; pending: number };
type ReviewData = { applications: Application[]; members: Member[]; stats: Stats };
type Tab = "pending" | "members" | "rejected";

export default function Review({ embedded = false, onBack }: { embedded?: boolean; onBack?: () => void }) {
  const [code, setCode] = useState("");
  const [data, setData] = useState<ReviewData | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [tab, setTab] = useState<Tab>("pending");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  async function fetchData(adminCode: string) {
    const response = await fetch("/api/review", { headers: { "x-admin-code": adminCode }, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "تعذر تحميل الطلبات.");
    setData(result);
  }
  async function load(event: FormEvent) {
    event.preventDefault(); setStatus("loading"); setError(""); setNotice("");
    try { await fetchData(code); setStatus("ready"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر تحميل الطلبات."); setStatus("idle"); }
  }
  async function decide(id: number, action: "accept" | "reject" | "delete" | "delete-member") {
    if (action === "delete" && !window.confirm("هل تريد حذف هذا الطلب نهائيًا؟ لا يمكن استعادته بعد الحذف.")) return;
    if (action === "delete-member" && !window.confirm("هل تريد حذف هذا العضو وطلبه نهائيًا؟ سيُزال من الجدول ويمكنه التقديم من جديد.")) return;
    setError(""); setNotice(""); setBusyId(id);
    try {
      const response = await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-code": code }, body: JSON.stringify({ id, action, reason: action === "reject" ? reason : undefined }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر حفظ القرار.");
      await fetchData(code);
      setRejectId(null); setReason("");
      setNotice(action === "accept" ? "تم قبول الطلب وإضافة العضو إلى الجدول." : action === "reject" ? "تم رفض الطلب وحفظ السبب." : action === "delete-member" ? "تم حذف العضو وطلبه من السجلات." : "تم حذف الطلب نهائيًا.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر حفظ القرار."); }
    finally { setBusyId(null); }
  }
  const pending = data?.applications.filter(item => item.status === "pending") || [];
  const rejected = data?.applications.filter(item => item.status === "rejected") || [];
  const discordLabel = (value: string) => /^\d{15,22}$/.test(value) ? "معرّف ديسكورد الرقمي" : "اسم مستخدم ديسكورد (طلب سابق)";
  function discordContact(value: string) {
    if (/^\d{15,22}$/.test(value)) return <a className="discord-contact" href={`https://discord.com/users/${value}`} target="_blank" rel="noopener noreferrer" dir="ltr" title="فتح حساب ديسكورد">{value} ↗</a>;
    return <button className="discord-contact" type="button" dir="ltr" title="نسخ اسم المستخدم وفتح ديسكورد لإضافة صديق" onClick={() => {
      window.open("https://discord.com/channels/@me", "_blank", "noopener,noreferrer");
      navigator.clipboard.writeText(value).then(() => setNotice(`نُسخ ${value}. افتح «إضافة صديق» في ديسكورد والصق الاسم.`)).catch(() => setError(`تعذر نسخ الاسم تلقائيًا. اكتبه في «إضافة صديق»: ${value}`));
    }}>{value} ↗</button>;
  }
  const date = (value: string) => new Date(value).toLocaleString("ar-IQ", { dateStyle: "medium", timeStyle: "short" });

  return <section dir="rtl" className="review" aria-label="مراجعة الطلبات والأعضاء">
    {!embedded && <header className="topbar"><div className="brand"><img className="brand-logo" src="/next-nt-logo.png" alt="شعار نيكست" /><div>N E X T<small>عائلة نيكست</small></div></div><a className="top-link" href="/">العودة إلى التقديم ←</a></header>}
    <div className="review-body">
      {embedded && <button className="review-back" type="button" onClick={onBack}>← العودة إلى التقديم</button>}
      <div className="caption">🔒 إدارة نيكست</div><h1>مراجعة الطلبات والأعضاء</h1>
      {status !== "ready" && <form onSubmit={load} className="review-form"><label><span>رمز الإدارة</span><input type="password" required value={code} onChange={event => setCode(event.target.value)} placeholder="أدخل الرمز المشترك" /></label><button className="submit" type="submit" disabled={status === "loading"}>{status === "loading" ? "جارٍ التحميل..." : "عرض الطلبات"} <span>↗</span></button></form>}
      {error && <p className="review-alert error" role="alert">{error}</p>}
      {notice && <p className="review-alert notice" role="status">✓ {notice}</p>}
      {status === "ready" && data && <>
        <div className="stat-grid" aria-label="إحصائيات الطلبات">
          <div className="stat-card"><span>📋 إجمالي الطلبات</span><strong>{data.stats.total}</strong></div>
          <div className="stat-card"><span>⏳ قيد المراجعة</span><strong>{data.stats.pending}</strong></div>
          <div className="stat-card accepted"><span>✅ الطلبات المقبولة</span><strong>{data.stats.accepted}</strong></div>
          <div className="stat-card rejected"><span>❌ الطلبات المرفوضة</span><strong>{data.stats.rejected}</strong></div>
        </div>
        <div className="review-tabs" role="tablist" aria-label="أقسام المراجعة">
          <button type="button" role="tab" aria-selected={tab === "pending"} className={tab === "pending" ? "active" : ""} onClick={() => setTab("pending")}>الطلبات الجديدة <span>{data.stats.pending}</span></button>
          <button type="button" role="tab" aria-selected={tab === "members"} className={tab === "members" ? "active" : ""} onClick={() => setTab("members")}>جدول الأعضاء <span>{data.members.length}</span></button>
          <button type="button" role="tab" aria-selected={tab === "rejected"} className={tab === "rejected" ? "active" : ""} onClick={() => setTab("rejected")}>المرفوضة <span>{data.stats.rejected}</span></button>
        </div>
        {tab === "pending" && (pending.length ? <div className="cards">{pending.map(item => <article key={item.id} className="application-card">
          <div className="card-head"><div><strong>👤 {item.game_name}</strong><small>طلب #{item.id}</small></div><time>{date(item.created_at)}</time></div>
          <div className="card-meta"><span><b>{discordLabel(item.discord_id)}</b> {discordContact(item.discord_id)}</span><span><b>العمر</b> {item.age}</span><span><b>ساعات اللعب</b> {item.hours}</span><span><b>خبرة عصابات</b> {item.experience}</span><span><b>المستوى</b> {item.roleplay}</span></div>
          {item.previous_gang_name && <p><b>🏴 العصابة السابقة:</b> {item.previous_gang_name}</p>}
          <h3>✍️ سبب الانضمام</h3><p>{item.reason}</p>
          <div className="decision-actions"><button type="button" className="accept-button" disabled={busyId !== null} onClick={() => decide(item.id, "accept")}>✓ قبول وإضافة للأعضاء</button><button type="button" className="reject-button" disabled={busyId !== null} onClick={() => { setRejectId(rejectId === item.id ? null : item.id); setReason(""); }}>✕ رفض الطلب</button><button type="button" className="delete-button" disabled={busyId !== null} onClick={() => decide(item.id, "delete")}>🗑 حذف الطلب</button></div>
          {rejectId === item.id && <div className="reject-editor"><label htmlFor={`reason-${item.id}`}>سبب الرفض <span>*</span></label><textarea id={`reason-${item.id}`} required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="اكتب سبب الرفض ليُحفظ مع الطلب..." rows={3} /><div className="decision-actions"><button type="button" className="reject-button solid" disabled={busyId !== null || reason.trim().length < 3} onClick={() => decide(item.id, "reject")}>تأكيد الرفض</button><button type="button" className="quiet-button" onClick={() => { setRejectId(null); setReason(""); }}>إلغاء</button></div></div>}
        </article>)}</div> : <div className="empty-state">✨ لا توجد طلبات جديدة الآن.</div>)}
        {tab === "members" && (data.members.length ? <div className="table-wrap"><table><thead><tr><th>العضو</th><th>التواصل عبر ديسكورد</th><th>العمر</th><th>ساعات اللعب</th><th>الخبرة</th><th>العصابة السابقة</th><th>تاريخ القبول</th><th>الإجراء</th></tr></thead><tbody>{data.members.map(member => <tr key={member.id}><td><strong>{member.game_name}</strong><small>#{member.application_id}</small></td><td><small>{discordLabel(member.discord_id)}</small>{discordContact(member.discord_id)}</td><td>{member.age}</td><td>{member.hours}</td><td>{member.roleplay}</td><td>{member.previous_gang_name || "—"}</td><td>{date(member.joined_at)}</td><td><button type="button" className="delete-button member-delete" disabled={busyId !== null} onClick={() => decide(member.application_id, "delete-member")}>🗑 حذف العضو</button></td></tr>)}</tbody></table></div> : <div className="empty-state">🤝 لم يُقبل أي عضو بعد.</div>)}
        {tab === "rejected" && (rejected.length ? <div className="cards">{rejected.map(item => <article key={item.id}><div className="card-head"><strong>👤 {item.game_name}</strong><time>{date(item.reviewed_at || item.created_at)}</time></div><p><b>{discordLabel(item.discord_id)}:</b> {discordContact(item.discord_id)}</p>{item.previous_gang_name && <p><b>🏴 العصابة السابقة:</b> {item.previous_gang_name}</p>}<h3>سبب الرفض</h3><p>{item.rejection_reason}</p><div className="decision-actions"><button type="button" className="delete-button" disabled={busyId !== null} onClick={() => decide(item.id, "delete")}>🗑 حذف الطلب</button></div></article>)}</div> : <div className="empty-state">لا توجد طلبات مرفوضة.</div>)}
      </>}
    </div>
  </section>;
}
