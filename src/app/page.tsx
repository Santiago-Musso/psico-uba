"use client";
import { useState } from "react";
import Link from "next/link";

// ── mini calendar helpers ──────────────────────────────────
const DAYS = ["L", "M", "X", "J", "V"];
const TC = 36; // time-column width px
const toP = (h: number, m = 0) => ((h - 8) * 60 + m) / 840 * 100;
const durP = (mins: number) => mins / 840 * 100;

type Ev = {
  tipo: string; label: string; materia: string;
  time: string; day: number; color: string;
  top: number; h: number; delay: number;
  isGray?: boolean; note?: string;
};

const HOUR_MARKS = [9, 12, 15, 18, 21].map((h) => ({ label: `${h}:00`, pct: toP(h) }));

// ── demo data ──────────────────────────────────────────────
const HERO_EVENTS: Ev[] = [
  { tipo: "Prac", label: "2",  materia: "Biología del Comp.", time: "09:15–10:45", day: 0, color: "#2c9680", top: toP(9,15),  h: durP(90), delay: 0.2 },
  { tipo: "Teo",  label: "I",  materia: "Biología del Comp.", time: "10:00–11:30", day: 1, color: "#861f5c", top: toP(10,0),  h: durP(90), delay: 0.5 },
  { tipo: "Prac", label: "5",  materia: "Psicología Clínica", time: "14:00–15:30", day: 2, color: "#2c9680", top: toP(14,0),  h: durP(90), delay: 0.8 },
  { tipo: "Teo",  label: "II", materia: "Psicología Clínica", time: "18:00–19:30", day: 3, color: "#861f5c", top: toP(18,0),  h: durP(90), delay: 1.1 },
  { tipo: "Prac", label: "1",  materia: "Clínica de Adultos", time: "16:15–17:45", day: 4, color: "#2c9680", top: toP(16,15), h: durP(90), delay: 1.4 },
];

const STEP_EVENTS: Ev[][] = [
  // 0 — Bloques de ocupado
  [
    { tipo: "", label: "", materia: "", note: "Trabajo", time: "14:00–18:00", day: 2, color: "#6b7280", top: toP(14,0), h: durP(240), delay: 0.1, isGray: true },
    { tipo: "", label: "", materia: "", note: "Inglés",  time: "19:00–20:30", day: 4, color: "#6b7280", top: toP(19,0), h: durP(90),  delay: 0.4, isGray: true },
  ],
  // 1 — Elegí tu programa (empty calendar)
  [],
  // 2 — Buscá tu cátedra (empty calendar)
  [],
  // 3 — Elegí tu práctica (one cátedra selected)
  [
    { tipo: "Prac", label: "1", materia: "Biología del Comp.", time: "09:15–10:45", day: 0, color: "#2c9680", top: toP(9,15), h: durP(90), delay: 0 },
    { tipo: "Teo",  label: "I", materia: "Biología del Comp.", time: "10:00–11:30", day: 1, color: "#861f5c", top: toP(10,0),  h: durP(90), delay: 0.3 },
  ],
  // 4 — Guardá tu horario (full schedule)
  [
    { tipo: "Prac", label: "1", materia: "Biología del Comp.", time: "09:15–10:45", day: 0, color: "#2c9680", top: toP(9,15), h: durP(90), delay: 0 },
    { tipo: "Teo",  label: "I", materia: "Biología del Comp.", time: "10:00–11:30", day: 1, color: "#861f5c", top: toP(10,0),  h: durP(90), delay: 0.1 },
    { tipo: "Prac", label: "5", materia: "Psicología Clínica", time: "14:00–15:30", day: 2, color: "#7c3aed", top: toP(14,0),  h: durP(90), delay: 0.2 },
    { tipo: "Teo",  label: "I", materia: "Psicología Clínica", time: "18:00–19:30", day: 3, color: "#be185d", top: toP(18,0),  h: durP(90), delay: 0.3 },
  ],
];

// ── MiniCal ────────────────────────────────────────────────
function MiniCal({ events, height, uid }: { events: Ev[]; height: number; uid: string | number }) {
  return (
    <div key={uid} style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
      <div style={{ display: "grid", gridTemplateColumns: `${TC}px repeat(5, 1fr)`, background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ padding: "5px 2px", fontSize: 9, color: "#9ca3af", textAlign: "center" }}>Hora</div>
        {DAYS.map((d) => (
          <div key={d} style={{ padding: "5px 2px", fontSize: 11, fontWeight: 700, textAlign: "center", color: "#374151" }}>{d}</div>
        ))}
      </div>
      <div style={{ position: "relative", height }}>
        {HOUR_MARKS.map((m) => (
          <div key={m.label} style={{ position: "absolute", left: 0, right: 0, top: `${m.pct}%` }}>
            <span style={{ position: "absolute", left: 0, width: TC, textAlign: "center", fontSize: 9, color: "#9ca3af", transform: "translateY(-50%)" }}>{m.label}</span>
            <div style={{ position: "absolute", left: TC, right: 0, borderTop: "1px solid #f3f4f6" }} />
          </div>
        ))}
        {events.map((e, i) => {
          const r = e.day / 5;
          return (
            <div key={`${uid}-${i}`} style={{
              position: "absolute",
              top: `${e.top}%`, height: `${e.h}%`, minHeight: 26,
              left: `calc(${r * 100}% + ${TC * (1 - r)}px)`,
              width: `calc((100% - ${TC}px) / 5 - 3px)`,
              background: e.isGray ? "#9ca3af33" : e.color,
              border: e.isGray ? "1px dashed #6b7280" : undefined,
              borderRadius: 4, padding: "3px 5px",
              color: e.isGray ? "#374151" : "#fff",
              fontSize: 9, overflow: "hidden",
              opacity: 0,
              animationName: "popIn", animationDuration: "0.35s",
              animationDelay: `${e.delay}s`, animationFillMode: "forwards",
            }}>
              {e.isGray ? (
                <div style={{ fontWeight: 700, fontSize: 10 }}>{e.note}</div>
              ) : (
                <>
                  <div style={{ fontWeight: 800, fontSize: 10 }}>{e.tipo} {e.label}</div>
                  <div style={{ opacity: 0.85, lineHeight: 1.2 }}>{e.materia}</div>
                </>
              )}
              <div style={{ lineHeight: 1.2 }}>{e.time}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Mini sidebar helpers ────────────────────────────────────
function MiniHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: -0.3, color: "#111827" }}>🎓 PsicoUBA</span>
      <div style={{ background: "#2563eb", color: "#fff", borderRadius: 5, padding: "3px 9px", fontSize: 10, fontWeight: 700 }}>💾 Guardar</div>
    </div>
  );
}

function MiniStepRow({ active }: { active: number }) {
  const labels = ["Bloques", "Programa", "Buscar", "Práctica"];
  return (
    <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 14 }}>
      {labels.map((label, i) => (
        <div key={i} style={{ display: "flex", flex: i < labels.length - 1 ? 1 : 0, alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 800,
              background: i < active ? "#16a34a" : i === active ? "#2563eb" : "#e5e7eb",
              color: i < active || i === active ? "#fff" : "#9ca3af",
            }}>
              {i < active ? "✓" : i + 1}
            </div>
            <div style={{ fontSize: 8, color: i === active ? "#2563eb" : i < active ? "#374151" : "#9ca3af", fontWeight: i === active ? 700 : 400, textAlign: "center", lineHeight: 1.2, maxWidth: 36 }}>
              {label}
            </div>
          </div>
          {i < labels.length - 1 && (
            <div style={{ flex: 1, height: 1.5, background: i < active ? "#16a34a" : "#e5e7eb", marginTop: 9, marginLeft: 3, marginRight: 3 }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step sidebar ───────────────────────────────────────────
function StepSidebar({ step }: { step: number }) {
  // 0 — Bloques de ocupado
  if (step === 0) return (
    <div>
      <MiniHeader />
      <MiniStepRow active={0} />
      <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", marginBottom: 7, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Bloque gris</div>
      <div style={{ display: "flex", gap: 3, alignItems: "center", marginBottom: 8, flexWrap: "wrap" as const }}>
        <select disabled style={{ padding: "3px 5px", borderRadius: 5, border: "1px solid #d1d5db", fontSize: 10, background: "#fff", color: "#374151" }}><option>Mié</option></select>
        <input readOnly value="14:00" style={{ width: 40, padding: "3px 4px", borderRadius: 5, border: "1px solid #d1d5db", fontSize: 10, textAlign: "center" as const }} />
        <span style={{ fontSize: 9, color: "#9ca3af" }}>→</span>
        <input readOnly value="18:00" style={{ width: 40, padding: "3px 4px", borderRadius: 5, border: "1px solid #d1d5db", fontSize: 10, textAlign: "center" as const }} />
        <input readOnly value="Trabajo" style={{ flex: 1, minWidth: 40, padding: "3px 5px", borderRadius: 5, border: "1px solid #d1d5db", fontSize: 10 }} />
        <button disabled style={{ padding: "3px 7px", borderRadius: 5, border: "1px solid #9ca3af", fontSize: 10, background: "#f9fafb", color: "#374151", cursor: "default" }}>Añadir</button>
      </div>
      {[{ note: "Trabajo", time: "Mié 14:00–18:00" }, { note: "Inglés", time: "Vie 19:00–20:30" }].map((z) => (
        <div key={z.note} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 6, background: "#f3f4f6", border: "1px dashed #9ca3af", marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 10 }}>{z.note}</div>
            <div style={{ fontSize: 9, color: "#6b7280" }}>{z.time}</div>
          </div>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>✕</span>
        </div>
      ))}
      <button disabled style={{ marginTop: 8, width: "100%", padding: "6px", borderRadius: 7, background: "#2563eb", color: "#fff", border: "none", fontWeight: 700, fontSize: 10, cursor: "default" }}>
        Continuar →
      </button>
    </div>
  );

  // 1 — Elegí tu programa
  if (step === 1) return (
    <div>
      <MiniHeader />
      <MiniStepRow active={1} />
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {[
          { name: "Licenciatura en Psicología", active: true },
          { name: "Profesorado en Psicología", active: false },
          { name: "Licenciatura en Musicoterapia", active: false },
          { name: "Licenciatura en Terapia Ocupacional", active: false },
        ].map((p) => (
          <div key={p.name} style={{
            padding: "7px 10px", borderRadius: 7, fontSize: 11,
            fontWeight: p.active ? 700 : 400,
            border: `1.5px solid ${p.active ? "#2563eb" : "#e5e7eb"}`,
            background: p.active ? "#eff6ff" : "#fff",
            color: p.active ? "#2563eb" : "#374151",
          }}>
            {p.name}
          </div>
        ))}
      </div>
    </div>
  );

  // 2 — Buscá tu cátedra
  if (step === 2) return (
    <div>
      <MiniHeader />
      <MiniStepRow active={2} />
      <input readOnly value="biología" style={{ width: "100%", padding: "6px 10px", border: "1.5px solid #2563eb", borderRadius: 7, fontSize: 11, boxSizing: "border-box" as const, outline: "none", marginBottom: 8 }} />
      {[
        { name: "Biología del Comportamiento", doc: "Muzio, Rubén Néstor", active: true },
        { name: "Psicología Clínica y Psicoterapia", doc: "Fernández Álvarez, H.", active: false },
        { name: "Análisis y Modif. de la Conducta", doc: "Dahab, Jose Norberto", active: false },
      ].map((c) => (
        <div key={c.name} style={{
          padding: "6px 10px", borderRadius: 6, marginBottom: 3,
          background: c.active ? "#eef2ff" : "#fff",
          border: "none", borderLeft: `3px solid ${c.active ? "#4338ca" : "transparent"}`,
          borderBottom: "1px solid #f3f4f6",
        }}>
          <div style={{ fontSize: 10, fontWeight: c.active ? 700 : 500, color: c.active ? "#4338ca" : "#111827", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
          <div style={{ fontSize: 9, color: "#6b7280" }}>{c.doc}</div>
        </div>
      ))}
    </div>
  );

  // 3 — Elegí tu práctica
  if (step === 3) return (
    <div>
      <MiniHeader />
      <MiniStepRow active={3} />
      <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", marginBottom: 7, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Prácticas</div>
      {[
        { label: "Prac 1", docente: "Daneri, M. Florencia", info: "Lun 09:15–10:45 · IN-217", checked: true },
        { label: "Prac 2", docente: "Fernández, Rocío C.",  info: "Jue 14:30–16:00 · IN-208", checked: false },
        { label: "Prac 3", docente: "Calleja, Nicolás",    info: "Mar 12:45–14:15 · IN-216", checked: false },
      ].map((p) => (
        <div key={p.label} style={{
          display: "flex", gap: 7, alignItems: "flex-start",
          padding: "6px 8px", borderRadius: 7, marginBottom: 4,
          border: `1.5px solid ${p.checked ? "#a7f3d0" : "#e5e7eb"}`,
          background: p.checked ? "#f0fdf4" : "#fff",
        }}>
          <span style={{ fontSize: 12, color: p.checked ? "#16a34a" : "#9ca3af", flexShrink: 0, marginTop: 1 }}>{p.checked ? "☑" : "☐"}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 10, color: p.checked ? "#15803d" : "#111827" }}>{p.label} — {p.docente}</div>
            <div style={{ fontSize: 9, color: "#6b7280" }}>{p.info}</div>
          </div>
        </div>
      ))}
    </div>
  );

  // 4 — Guardá tu horario (all steps done)
  return (
    <div>
      <MiniHeader />
      <MiniStepRow active={4} />
      {[
        { tipo: "Prac", label: "1", materia: "Biología del Comp.", color: "#2c9680", info: "Lun 09:15–10:45 · IN-217" },
        { tipo: "Teo",  label: "I", materia: "Biología del Comp.", color: "#861f5c", info: "Mar 10:00–11:30 · HY-022" },
        { tipo: "Prac", label: "5", materia: "Psicología Clínica",  color: "#7c3aed", info: "Mié 14:00–15:30 · AU-101" },
        { tipo: "Teo",  label: "I", materia: "Psicología Clínica",  color: "#be185d", info: "Jue 18:00–19:30 · HY-011" },
      ].map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, padding: "5px 8px", borderRadius: 6, background: s.color + "15", border: `1px solid ${s.color}35`, marginBottom: 4 }}>
          <div style={{ width: 7, height: 7, borderRadius: 2, background: s.color, flexShrink: 0, marginTop: 3 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 10, color: s.color }}>{s.tipo} {s.label} — {s.materia}</div>
            <div style={{ fontSize: 9, color: "#6b7280" }}>{s.info}</div>
          </div>
        </div>
      ))}
      <button disabled style={{ width: "100%", padding: "7px", borderRadius: 6, background: "#2563eb", color: "#fff", fontWeight: 700, fontSize: 11, border: "none", cursor: "default", marginTop: 6 }}>
        💾 Guardar selección
      </button>
      <div style={{ marginTop: 6, padding: "6px 8px", borderRadius: 6, background: "#fef3c7", border: "1px solid #fcd34d", fontSize: 9, color: "#92400e", lineHeight: 1.5 }}>
        ⚠️ Se guarda solo en este navegador.
      </div>
      <button disabled style={{ marginTop: 6, width: "100%", padding: "5px", borderRadius: 6, background: "#f9fafb", color: "#374151", border: "1.5px solid #e5e7eb", fontWeight: 600, fontSize: 10, cursor: "default" }}>
        + Agregar otra cátedra
      </button>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────
const STEPS = [
  { title: "Bloques de ocupado",  desc: "Marcá trabajo, deportes, idiomas o cualquier franja ocupada para ver desde el principio qué horarios te quedan libres." },
  { title: "Elegí tu programa",   desc: "Seleccioná Psicología, Profesorado, Musicoterapia o Terapia Ocupacional. Las cátedras disponibles se filtran automáticamente." },
  { title: "Buscá tu cátedra",   desc: "Escribí la materia o el docente. Filtrá en tiempo real entre todas las cátedras del programa seleccionado." },
  { title: "Elegí tu práctica",  desc: "Cada comisión muestra docente, aula y horario. Marcá la que te quede mejor — el teórico requerido se agrega solo." },
  { title: "Guardá tu horario",  desc: "Guardá tu selección con un clic. Se almacena en este navegador. Podés volver a agregar más cátedras en cualquier momento." },
];

const FEATURES = [
  { icon: "⚡", title: "Búsqueda en tiempo real",  desc: "Filtrá por materia o nombre del docente al instante." },
  { icon: "🎯", title: "Teórico incluido solo",    desc: "Al seleccionar una práctica, el teórico requerido se agrega automáticamente." },
  { icon: "💾", title: "Guardá tu selección",       desc: "Tu horario queda guardado en el navegador entre sesiones." },
  { icon: "🕐", title: "Bloques de ocupado",        desc: "Marcá franjas horarias en las que no podés cursar." },
];

export default function Home() {
  const [step, setStep] = useState(0);

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: "#111827", background: "#fff" }}>
      <style>{`
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.82); }
          65%  { transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s ease forwards; }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{ borderBottom: "1px solid #e5e7eb", padding: "12px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#ffffffee", backdropFilter: "blur(8px)", zIndex: 10 }}>
        <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: -0.3 }}>🎓 PsicoUBA</span>
        <Link href="/schedule" style={{ background: "#2563eb", color: "#fff", padding: "7px 16px", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
          Ir al planificador →
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 48px 64px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
        <div className="fade-up">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#eff6ff", color: "#2563eb", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, marginBottom: 24 }}>
            <span>✦</span> Planificador de cursadas · UBA Psicología
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.08, marginBottom: 20, letterSpacing: -1.5 }}>
            Armá tu horario<br />
            <span style={{ color: "#2563eb" }}>sin vueltas.</span>
          </h1>
          <p style={{ fontSize: 17, color: "#4b5563", lineHeight: 1.65, marginBottom: 36, maxWidth: 400 }}>
            Buscá tus materias, elegí la comisión que más te conviene y visualizá todo en un calendario semanal.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/schedule" style={{ display: "inline-block", background: "#2563eb", color: "#fff", padding: "13px 26px", borderRadius: 10, textDecoration: "none", fontSize: 15, fontWeight: 700 }}>
              Empezar ahora →
            </Link>
            <span style={{ fontSize: 13, color: "#6b7280" }}>Gratis · Sin registro</span>
          </div>
          <div style={{ marginTop: 32, display: "flex", gap: 24 }}>
            {[["4", "Programas"], ["500+", "Cátedras"], ["100%", "Gratuito"]].map(([val, lbl]) => (
              <div key={lbl}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{val}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Browser frame */}
        <div style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.13)", borderRadius: 14, overflow: "hidden", border: "1px solid #e5e7eb" }}>
          <div style={{ background: "#e5e7eb", padding: "8px 12px", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", gap: 5 }}>
              {["#ef4444","#f59e0b","#22c55e"].map((c) => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
              ))}
            </div>
            <div style={{ flex: 1, background: "#fff", borderRadius: 4, padding: "3px 10px", fontSize: 11, color: "#6b7280", textAlign: "center" }}>
              psico-uba.vercel.app/schedule
            </div>
          </div>
          <div style={{ padding: 10, background: "#f9fafb" }}>
            <MiniCal events={HERO_EVENTS} height={290} uid="hero" />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: "#f9fafb", padding: "80px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontSize: 34, fontWeight: 800, textAlign: "center", marginBottom: 8, letterSpacing: -0.5 }}>¿Cómo funciona?</h2>
          <p style={{ textAlign: "center", color: "#6b7280", fontSize: 15, marginBottom: 44 }}>Cinco pasos para tener tu cursada organizada</p>

          {/* Step tabs */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 36 }}>
            {STEPS.map((s, i) => (
              <button key={i} onClick={() => setStep(i)} style={{
                padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                border: "2px solid", transition: "all 0.15s",
                borderColor: step === i ? "#2563eb" : "#e5e7eb",
                background: step === i ? "#eff6ff" : "#fff",
                color: step === i ? "#2563eb" : "#6b7280",
              }}>
                <span style={{ opacity: 0.6, marginRight: 6 }}>{i + 1}.</span>{s.title}
              </button>
            ))}
          </div>

          {/* Step demo */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", display: "grid", gridTemplateColumns: "280px 1fr" }}>
            {/* Sidebar mock */}
            <div style={{ borderRight: "1px solid #e5e7eb", padding: 24, background: "#fff" }}>
              <StepSidebar step={step} />
            </div>
            {/* Calendar mock */}
            <div style={{ padding: 24, background: "#f9fafb" }}>
              <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Vista semanal</div>
              <MiniCal key={step} events={STEP_EVENTS[step]} height={300} uid={step} />
              <p style={{ marginTop: 16, fontSize: 13, color: "#4b5563", lineHeight: 1.6 }}>
                <strong>Paso {step + 1}:</strong> {STEPS[step].desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 48px" }}>
        <h2 style={{ fontSize: 34, fontWeight: 800, textAlign: "center", marginBottom: 48, letterSpacing: -0.5 }}>Todo lo que necesitás</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ padding: 24, border: "1px solid #e5e7eb", borderRadius: 12 }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{f.title}</div>
              <div style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.55 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: "#0f172a", color: "#fff", textAlign: "center", padding: "80px 48px" }}>
        <h2 style={{ fontSize: 38, fontWeight: 900, marginBottom: 14, letterSpacing: -0.5 }}>¿Listo para armar tu cursada?</h2>
        <p style={{ fontSize: 16, color: "#94a3b8", marginBottom: 36 }}>Entrá al planificador y organizá tu horario en minutos.</p>
        <Link href="/schedule" style={{ display: "inline-block", background: "#2563eb", color: "#fff", padding: "14px 32px", borderRadius: 10, textDecoration: "none", fontSize: 15, fontWeight: 800 }}>
          Ir al planificador →
        </Link>
      </section>
    </div>
  );
}
