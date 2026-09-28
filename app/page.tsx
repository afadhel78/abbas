"use client";

import { FormEvent, useEffect, useState } from "react";
import Review from "./review/page";

type Status = "checking" | "idle" | "sending" | "error";
type ApplicationStatus = { hasApplication: boolean; status?: "pending" | "accepted" | "rejected"; rejectionReason?: string | null };

export default function Home() {
  const [status, setStatus] = useState<Status>("checking");
  const [application, setApplication] = useState<ApplicationStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [previousGang, setPreviousGang] = useState("");
  const [error, setError] = useState("");
  const [leadersView, setLeadersView] = useState(false);
  const [welcome, setWelcome] = useState(true);

  async function checkApplication() {
    setCheckingStatus(true);
    setError("");
    try {
      const response = await fetch("/api/application-status", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر تحميل حالة الطلب.");
      setApplication(result);
      setStatus("idle");
      setShowResult(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل حالة الطلب.");
      setStatus("checking");
    } finally { setCheckingStatus(false); }
  }

  useEffect(() => { void checkApplication(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر إرسال الطلب.");
      form.reset();
      setPreviousGang("");
      setApplication(result);
      setShowResult(false);
      setStatus("idle");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إرسال الطلب. حاول مجددًا.");
      setStatus("error");
    }
  }

  if (welcome) return (
    <main dir="rtl" className="welcome-screen">
      <div className="welcome-glow" aria-hidden="true" />
      <section className="welcome-panel" aria-labelledby="welcome-heading">
        <span className="welcome-kicker">مقاطعة بوليتو · فايف إم</span>
        <img className="welcome-logo" src="/next-nt-logo.webp" alt="شعار عائلة نيكست NT" />
        <h1 id="welcome-heading">مرحبًا بك في عائلة نيكست</h1>
        <p className="welcome-intro">انضم إلى صفوف NT وابدأ رحلتك معنا.</p>
        <div className="welcome-leaders" aria-label="قادة العائلة">
          <span className="welcome-crown" aria-hidden="true">♛</span>
          <span className="welcome-leaders-title">القادة</span>
          <div className="welcome-leader-names"><span>مزيني</span><span className="welcome-divider" aria-hidden="true">✦</span><span>أبو عايض</span></div>
        </div>
        <button type="button" className="welcome-enter" onClick={() => setWelcome(false)}>الدخول إلى التقديم <span aria-hidden="true">↗</span></button>
      </section>
    </main>
  );

  return (
    <main dir="rtl">
      <header className="topbar">
        <div className="brand" aria-label="عائلة نيكست NT">
          <img className="brand-logo" src="/next-nt-logo.webp" alt="شعار نيكست" />
          <div>N E X T<small>عائلة نيكست</small></div>
        </div>
        <a className="top-link" href="#apply" onClick={() => setLeadersView(false)}>{application?.hasApplication ? "حالة الطلب" : "ابدأ التقديم"} <span aria-hidden="true">↙</span></a>
      </header>

      {leadersView ? <Review embedded onBack={() => setLeadersView(false)} /> : <div className="layout">
        <section className="hero" aria-labelledby="welcome-title">
          <div className="hero-orbit" aria-hidden="true" />
          <div className="eyebrow"><span className="eyebrow-line" /> مقاطعة بوليتو · فايف إم</div>
          <h1 id="welcome-title">انضم إلى<br /><em>عائلة نيكست.</em></h1>
          <p>نبحث عن أعضاء يقدّرون العمل الجماعي ويحترمون تقمّص الأدوار. أخبرنا عن نفسك وقدّم طلب انضمامك إلى NT.</p>
          <div className="tags"><span>🎮 مجتمع فايف إم</span><span>🤝 روح الفريق</span></div>
          <img className="hero-logo" src="/next-nt-logo.webp" alt="" aria-hidden="true" />
        </section>

        <section className="content" id="apply" aria-labelledby="form-title">
          <div className="caption"><span>01</span> / {application?.hasApplication ? "متابعة الطلب" : "طلب الانضمام"}</div>
          <h2 id="form-title">{application?.hasApplication ? "حالة طلبك" : "استمارة التقديم"} <span aria-hidden="true">✦</span></h2>
          {status === "checking" ? (
            <div className="application-status" role="status"><h3>جارٍ تحميل حالة طلبك...</h3>{error && <><p className="error">{error}</p><button className="status-action" type="button" onClick={() => void checkApplication()}>إعادة المحاولة</button></>}</div>
          ) : application?.hasApplication ? (
            <div className="application-status" role="status">
              <span className="status-icon" aria-hidden="true">{application.status === "accepted" ? "✅" : application.status === "rejected" ? "❌" : "⏳"}</span>
              <h3>{application.status === "accepted" ? "مبروك، تم قبولك!" : application.status === "rejected" ? "تم رفض طلبك" : "طلبك قيد المراجعة"}</h3>
              {showResult && <p>{application.status === "accepted" ? "مبروك، تم قبولك. سيتم التواصل معك عبر ديسكورد." : application.status === "rejected" ? <>سبب الرفض: {application.rejectionReason || "لم يُذكر سبب الرفض."}</> : "طلبك قيد المراجعة. عد إلى هذه الصفحة لمعرفة القرار."}</p>}
              <button className="status-action" type="button" disabled={checkingStatus} onClick={() => void checkApplication()}>{checkingStatus ? "جارٍ التحديث..." : showResult ? "تحديث حالة الطلب" : "عرض حالة الطلب"}</button>
              {error && <p className="error">{error}</p>}
            </div>
          ) : (
            <>
            <p className="sub">املأ البيانات بعناية. سنتواصل معك عبر ديسكورد بعد مراجعة طلبك.</p>
            <form onSubmit={submit}>
              <div className="group-title wide"><span>01</span> بياناتك الأساسية</div>
              <label><span>👤 اسمك داخل اللعبة <b>*</b></span><input name="gameName" required maxLength={60} placeholder="مثال: أحمد خالد" autoComplete="off" /></label>
              <label><span>💬 معرّف ديسكورد الرقمي (كوبي يوزر) <b>*</b></span><input name="discordId" required pattern="[0-9]{15,22}" maxLength={22} inputMode="numeric" title="أدخل معرّف ديسكورد الرقمي من كوبي يوزر" placeholder="مثال: 123456789012345678" dir="ltr" autoComplete="off" /></label>
              <label><span>🎂 عمرك الحقيقي <b>*</b></span><input name="age" type="number" min="13" max="80" required placeholder="أدخل عمرك" /></label>
              <label><span>⏱️ ساعات لعبك في فايف إم <b>*</b></span><input name="hours" type="number" min="0" max="50000" required placeholder="عدد الساعات" /></label>
              <div className="group-title wide second-group"><span>02</span> خبرتك ودافعك</div>
              <label><span>🏴 هل انضممت إلى عصابة من قبل؟</span><select name="experience" required value={previousGang} onChange={event => setPreviousGang(event.target.value)}><option value="" disabled>اختر إجابتك</option><option value="نعم">نعم</option><option value="لا">لا</option></select></label>
              {previousGang === "نعم" && <label className="wide"><span>🏴 اسم العصابة السابقة <b>*</b></span><input name="previousGangName" required minLength={2} maxLength={60} placeholder="اكتب اسم العصابة التي انضممت إليها سابقًا" autoComplete="off" /></label>}
              <label><span>⭐ ما مستوى خبرتك؟ <b>*</b></span><input name="roleplay" type="number" inputMode="numeric" min="1" max="500" step="1" required placeholder="رقم من 1 إلى 500" /></label>
              <label className="wide"><span>✍️ لماذا ترغب في الانضمام إلى نيكست؟ <b>*</b></span><textarea name="reason" minLength={20} maxLength={1000} rows={4} required placeholder="حدّثنا عن نفسك وما الذي ستضيفه إلى العائلة..." /></label>
              <label className="agree wide"><input type="checkbox" required /><span>أتعهد بالالتزام بقوانين المقاطعة والعائلة واحترام تقمّص الأدوار.</span></label>
              {status === "error" && <p className="error wide" role="alert">{error}</p>}
              <button className="submit wide" disabled={status === "sending"} type="submit"><span>{status === "sending" ? "جارٍ إرسال طلبك..." : "إرسال طلب الانضمام"}</span><span aria-hidden="true">↗</span></button>
              <p className="note wide">🔒 انسخ معرّف حسابك الرقمي من خيار «كوبي يوزر» في ديسكورد. سيستخدمه المسؤول لفتح حسابك مباشرة.</p>
            </form>
            </>
          )}
        </section>
      </div>}
      <footer><span>© NT · NEXT FAMILY</span><span className="footer-end">مقاطعة بوليتو <button className="leaders-secret" type="button" aria-label="لوحة القادة" title="لوحة القادة" onClick={() => { setLeadersView(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>🔒</button></span></footer>
    </main>
  );
}
