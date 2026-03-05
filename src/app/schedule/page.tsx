"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { ProgramCode, Catedra, Section, Meet } from "@/lib/types";

const TERM = "2026-1";
const STORAGE_KEY = `psico-uba:selection:${TERM}`;
const ZONES_KEY = `psico-uba:gray:${TERM}`;

type GrayZone = {
  id: string;
  dayNum: number; // 1..7 (Lun..Dom)
  startMin: number;
  endMin: number;
  note?: string;
};

const PROGRAMS: { code: ProgramCode; name: string }[] = [
  { code: "PS", name: "Licenciatura en Psicología" },
  { code: "PR", name: "Profesorado en Psicología" },
  { code: "LM", name: "Licenciatura en Musicoterapia" },
  { code: "TE", name: "Licenciatura en Terapia Ocupacional" },
];

const SHORT: Record<string, string> = {
  PS: "Psicología", PR: "Profesorado", LM: "Musicoterapia", TE: "Terapia Ocup.",
};

function by<T>(key: keyof T) {
  return (a: T, b: T) => String(a[key]).localeCompare(String(b[key]));
}
function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

const ALL_DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const TIME_COL_PX = 54;
const MIN_BLOCK_PX = 92;

function normalize(str: string) {
  return str.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function dayAbbr(d: string) {
  const map: Record<string, string> = {
    lunes: "Lun", martes: "Mar", miercoles: "Mié", jueves: "Jue",
    viernes: "Vie", sabado: "Sáb", domingo: "Dom",
  };
  return map[d.toLowerCase()] || d.slice(0, 3);
}

// ── Stepper header ──────────────────────────────────────────
function StepHeader({
  num, title, summary, active, done, locked,
  onClick,
}: {
  num: number; title: string; summary?: string;
  active: boolean; done: boolean; locked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={locked ? undefined : onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        width: "100%", textAlign: "left",
        padding: "12px 18px", background: "none", border: "none",
        cursor: locked ? "default" : "pointer",
        borderBottom: "1px solid #f3f4f6",
        opacity: locked ? 0.35 : 1,
      }}
    >
      <div style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800,
        background: active ? "#2563eb" : done ? "#16a34a" : "#e5e7eb",
        color: active || done ? "#fff" : "#6b7280",
      }}>
        {done ? "✓" : num}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: active ? "#2563eb" : "#111827" }}>
          {title}
        </div>
        {done && summary && (
          <div style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {summary}
          </div>
        )}
      </div>
      {done && (
        <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 600, flexShrink: 0 }}>Editar</span>
      )}
    </button>
  );
}

export default function SchedulePage() {
  // ── State ─────────────────────────────────────────────────
  const [sidebarStep, setSidebarStep] = useState(1);
  const [program, setProgram] = useState<ProgramCode>("PS");
  const [catedras, setCatedras] = useState<Catedra[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [meets, setMeets] = useState<Meet[]>([]);
  const [selectedCatedraKey, setSelectedCatedraKey] = useState<string>("");
  const [selectedPracIds, setSelectedPracIds] = useState<Set<string>>(new Set());
  const [catQuery, setCatQuery] = useState("");
  const [hoverPracId, setHoverPracId] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);
  const [grayZones, setGrayZones] = useState<GrayZone[]>([]);
  const [nzDay, setNzDay] = useState<number>(1);
  const [nzStart, setNzStart] = useState<string>("08:00");
  const [nzEnd, setNzEnd] = useState<string>("09:00");
  const [nzNote, setNzNote] = useState<string>("");

  // Calendar column width (pixels), computed from container
  const [colWidth, setColWidth] = useState(160);
  const calContainerRef = useRef<HTMLDivElement>(null);

  const padTop = 14;
  const padBottom = 14;

  // ── Effects ───────────────────────────────────────────────
  useEffect(() => {
    const el = calContainerRef.current;
    if (!el) return;
    const update = () => {
      const w = Math.max(80, Math.floor((el.clientWidth - TIME_COL_PX) / 5));
      setColWidth(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const baseRoot = (
      process.env.NEXT_PUBLIC_DATA_BASE ||
      "https://santiago-musso.github.io/psico-uba-data"
    ).replace(/\/$/, "");
    const base = `${baseRoot}/${TERM}`;
    Promise.all([
      fetch(`${base}/catedras.json`).then((r) => r.json()),
      fetch(`${base}/sections.json`).then((r) => r.json()),
      fetch(`${base}/meets.json`).then((r) => r.json()),
    ]).then(([c, s, m]) => {
      setCatedras(c);
      setSections(s);
      setMeets(m);
    });
  }, []);

  useEffect(() => {
    if (loadedFromStorage || sections.length === 0) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        const practiceIds = new Set(sections.filter((s) => s.tipo === "Prac").map((s) => s.id));
        const filtered = arr.filter((id) => practiceIds.has(id));
        if (filtered.length > 0) setSelectedPracIds(new Set(filtered));
      }
    } catch { /* ignore */ } finally {
      setLoadedFromStorage(true);
    }
  }, [sections, loadedFromStorage]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ZONES_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as GrayZone[];
        setGrayZones(arr.filter((z) => z && z.dayNum >= 1 && z.dayNum <= 7 && z.endMin > z.startMin));
      }
    } catch {}
  }, []);

  // ── Computed ──────────────────────────────────────────────
  const maxDayNum = useMemo(() => {
    const days = [...meets.map((m) => m.dayNum), ...grayZones.map((z) => z.dayNum)];
    return days.length ? Math.max(6, ...days) : 6;
  }, [meets, grayZones]);

  const activeDayLabels = ALL_DAY_LABELS.slice(0, maxDayNum);

  const catedrasByProgram = useMemo(() => {
    let list = catedras
      .filter((c) => c.program === program)
      .sort((a, b) => a.materiaName.localeCompare(b.materiaName) || a.catedraId - b.catedraId);
    const q = normalize(catQuery);
    if (q) list = list.filter((c) => normalize(`${c.materiaName} ${c.docenteTitular}`).includes(q));
    return list;
  }, [catedras, program, catQuery]);

  const selectedCatedra = useMemo(() =>
    catedras.find((c) => `${c.program}-${c.catedraId}` === selectedCatedraKey),
    [catedras, selectedCatedraKey]
  );

  const catedraSections = useMemo(() => {
    if (!selectedCatedraKey) return [] as Section[];
    const [prog, idStr] = selectedCatedraKey.split("-");
    const cid = Number(idStr);
    return sections.filter((s) => s.program === prog && s.catedraId === cid);
  }, [sections, selectedCatedraKey]);

  const pracSections = useMemo(() =>
    catedraSections.filter((s) => s.tipo === "Prac").sort(by<Section>("sectionLabel")),
    [catedraSections]
  );

  const selectedSections = useMemo(() => {
    const byKey = new Map<string, Section>();
    for (const s of sections) {
      const key = `${s.catedraId}|${s.tipo}|${s.sectionLabel}`;
      if (!byKey.has(key)) byKey.set(key, s);
    }
    const selected = new Set<string>();
    for (const pracId of selectedPracIds) {
      const prac = sections.find((s) => s.id === pracId);
      if (!prac) continue;
      selected.add(prac.id);
      for (const req of prac.requires || []) {
        const dep = byKey.get(`${prac.catedraId}|${req.tipo}|${req.label}`);
        if (dep) selected.add(dep.id);
      }
    }
    return sections.filter((s) => selected.has(s.id));
  }, [selectedPracIds, sections]);

  const selectedMeets = useMemo(() => {
    const ids = new Set(selectedSections.map((s) => s.id));
    return meets.filter((m) => ids.has(m.sectionId));
  }, [selectedSections, meets]);

  const sectionById = useMemo(() => {
    const m = new Map<string, Section>();
    for (const s of sections) m.set(s.id, s);
    return m;
  }, [sections]);

  const timeMin = useMemo(() => {
    const starts = meets.filter((m) => m.startMin > 0).map((m) => m.startMin);
    return starts.length ? Math.min(...starts) : 7 * 60;
  }, [meets]);

  const timeMax = useMemo(() => {
    const ends = meets.filter((m) => m.endMin > 0).map((m) => m.endMin);
    return ends.length ? Math.max(...ends) : 23 * 60;
  }, [meets]);

  const PX_PER_HOUR = useMemo(() => {
    const valid = meets.filter((m) => m.endMin > m.startMin && m.startMin > 0);
    const minDurMin = valid.length ? Math.min(...valid.map((m) => m.endMin - m.startMin)) : 60;
    return Math.ceil(MIN_BLOCK_PX / (minDurMin / 60));
  }, [meets]);

  const mapY = (minutes: number) => padTop + ((minutes - timeMin) / 60) * PX_PER_HOUR;
  const calBodyHeight = padTop + padBottom + ((timeMax - timeMin) / 60) * PX_PER_HOUR;
  const calInnerWidth = TIME_COL_PX + maxDayNum * colWidth;

  const hoverOverlayMeets = useMemo(() => {
    if (!hoverPracId) return [] as Meet[];
    const prac = sections.find((s) => s.id === hoverPracId);
    if (!prac) return [] as Meet[];
    const result: Meet[] = meets.filter((m) => m.sectionId === hoverPracId);
    const byKey = new Map<string, Section>();
    for (const s of sections) byKey.set(`${s.catedraId}|${s.tipo}|${s.sectionLabel}`, s);
    for (const req of prac.requires || []) {
      const dep = byKey.get(`${prac.catedraId}|${req.tipo}|${req.label}`);
      if (dep) result.push(...meets.filter((m) => m.sectionId === dep.id));
    }
    return result;
  }, [hoverPracId, meets, sections]);

  // ── Actions ───────────────────────────────────────────────
  function togglePrac(id: string) {
    setSelectedPracIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function removePrac(id: string) {
    setSelectedPracIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  function saveSelection() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selectedPracIds)));
      localStorage.setItem(ZONES_KEY, JSON.stringify(grayZones));
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } catch {}
  }

  function addGrayZone() {
    const toMin = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
    const sMin = toMin(nzStart);
    const eMin = toMin(nzEnd);
    if (!nzDay || eMin <= sMin) return;
    const z: GrayZone = {
      id: `z-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dayNum: nzDay, startMin: sMin, endMin: eMin,
      note: nzNote.trim() || undefined,
    };
    const next = [...grayZones, z];
    setGrayZones(next);
    try { localStorage.setItem(ZONES_KEY, JSON.stringify(next)); } catch {}
  }

  function removeGrayZone(id: string) {
    const next = grayZones.filter((z) => z.id !== id);
    setGrayZones(next);
    try { localStorage.setItem(ZONES_KEY, JSON.stringify(next)); } catch {}
  }

  // Shared label style
  const sLbl = {
    fontSize: 10, fontWeight: 600, color: "#6b7280",
    textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 8,
  };
  const inputStyle = {
    padding: "5px 7px", borderRadius: 7, border: "1.5px solid #d1d5db",
    fontSize: 12, fontFamily: "inherit", background: "#fff", color: "#374151",
  };

  return (
    <div style={{
      fontFamily: "system-ui, -apple-system, sans-serif", color: "#111827",
      height: "100vh", overflow: "hidden",
      display: "grid", gridTemplateColumns: "300px 1fr",
    }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#fff", borderRight: "1px solid #e5e7eb" }}>

        {/* Logo + save */}
        <div style={{ padding: "13px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <Link href="/" style={{ fontWeight: 800, fontSize: 15, letterSpacing: -0.3, textDecoration: "none", color: "#111827" }}>
            🎓 PsicoUBA
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {justSaved && <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✓ Guardado</span>}
            <button type="button" onClick={saveSelection} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              💾 Guardar
            </button>
          </div>
        </div>

        {/* Steps */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* ── Step 1: Bloques de ocupado ── */}
          <div style={{ borderBottom: "1px solid #e5e7eb" }}>
            <StepHeader
              num={1} title="Bloques de ocupado"
              summary={grayZones.length > 0 ? `${grayZones.length} bloque${grayZones.length !== 1 ? "s" : ""}` : "Sin bloques"}
              active={sidebarStep === 1} done={sidebarStep > 1} locked={false}
              onClick={() => setSidebarStep(1)}
            />
            {sidebarStep === 1 && (
              <div style={{ padding: "4px 18px 16px" }}>
                <div style={{ marginBottom: 8, fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
                  Marcá tus franjas no disponibles antes de elegir materias.
                </div>
                {/* Form */}
                <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                  <select value={nzDay} onChange={(e) => setNzDay(parseInt(e.target.value))} style={inputStyle}>
                    <option value={1}>Lun</option><option value={2}>Mar</option>
                    <option value={3}>Mié</option><option value={4}>Jue</option>
                    <option value={5}>Vie</option><option value={6}>Sáb</option>
                    <option value={7}>Dom</option>
                  </select>
                  <input value={nzStart} onChange={(e) => setNzStart(e.target.value)} type="time" style={{ ...inputStyle, width: 82 }} />
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>→</span>
                  <input value={nzEnd} onChange={(e) => setNzEnd(e.target.value)} type="time" style={{ ...inputStyle, width: 82 }} />
                  <input value={nzNote} onChange={(e) => setNzNote(e.target.value)} placeholder="Nota" style={{ ...inputStyle, flex: 1, minWidth: 60 }} />
                  <button type="button" onClick={addGrayZone} style={{ ...inputStyle, border: "1.5px solid #9ca3af", cursor: "pointer", padding: "5px 10px" }}>Añadir</button>
                </div>
                {/* List */}
                {grayZones.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                    {grayZones.map((z) => (
                      <div key={z.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 7, background: "#f3f4f6", border: "1px dashed #9ca3af" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 12 }}>{z.note || "Ocupado"}</div>
                          <div style={{ fontSize: 11, color: "#6b7280" }}>
                            {ALL_DAY_LABELS[z.dayNum - 1]}{" "}
                            {String(Math.floor(z.startMin / 60)).padStart(2, "0")}:{String(z.startMin % 60).padStart(2, "0")}–{String(Math.floor(z.endMin / 60)).padStart(2, "0")}:{String(z.endMin % 60).padStart(2, "0")}
                          </div>
                        </div>
                        <button type="button" onClick={() => removeGrayZone(z.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 16, padding: "0 2px", lineHeight: 1 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => setSidebarStep(2)} style={{ width: "100%", padding: "8px", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  Continuar →
                </button>
              </div>
            )}
          </div>

          {/* ── Step 2: Programa ── */}
          <div style={{ borderBottom: "1px solid #e5e7eb" }}>
            <StepHeader
              num={2} title="Programa"
              summary={SHORT[program]}
              active={sidebarStep === 2} done={sidebarStep > 2} locked={sidebarStep < 2}
              onClick={() => setSidebarStep(2)}
            />
            {sidebarStep === 2 && (
              <div style={{ padding: "4px 18px 16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {PROGRAMS.map((p) => (
                    <button
                      key={p.code}
                      onClick={() => {
                        setProgram(p.code);
                        setSelectedCatedraKey("");
                        setSelectedPracIds(new Set());
                        setCatQuery("");
                        setSidebarStep(3);
                      }}
                      style={{
                        padding: "9px 12px", borderRadius: 8, cursor: "pointer",
                        textAlign: "left", fontSize: 12, fontWeight: 600,
                        border: "1.5px solid",
                        borderColor: program === p.code ? "#2563eb" : "#e5e7eb",
                        background: program === p.code ? "#eff6ff" : "#fff",
                        color: program === p.code ? "#2563eb" : "#374151",
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Step 3: Buscar cátedra ── */}
          <div style={{ borderBottom: "1px solid #e5e7eb" }}>
            <StepHeader
              num={3} title="Buscar cátedra"
              summary={selectedCatedra?.materiaName}
              active={sidebarStep === 3} done={sidebarStep > 3} locked={sidebarStep < 3}
              onClick={() => setSidebarStep(3)}
            />
            {sidebarStep === 3 && (
              <div style={{ padding: "4px 18px 16px" }}>
                <div style={{ marginBottom: 8 }}>
                  <input
                    type="text" placeholder="Materia o docente" value={catQuery}
                    onChange={(e) => setCatQuery(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit", color: "#111827" }}
                  />
                </div>
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ maxHeight: 320, overflowY: "auto" }}>
                    {catedrasByProgram.map((c) => {
                      const key = `${c.program}-${c.catedraId}`;
                      const active = key === selectedCatedraKey;
                      return (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedCatedraKey(key); setSidebarStep(4); }}
                          style={{
                            display: "block", width: "100%", textAlign: "left",
                            padding: "9px 12px", background: active ? "#eef2ff" : "#fff",
                            borderBottom: "1px solid #f3f4f6", cursor: "pointer",
                            border: "none", borderLeft: `3px solid ${active ? "#4338ca" : "transparent"}`,
                          }}
                          title={`${c.materiaName} — ${c.docenteTitular}`}
                        >
                          <div style={{ fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? "#4338ca" : "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {c.materiaName}
                          </div>
                          <div style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {c.docenteTitular}
                          </div>
                        </button>
                      );
                    })}
                    {catedrasByProgram.length === 0 && (
                      <div style={{ padding: 14, fontSize: 12, color: "#6b7280", textAlign: "center" }}>Sin resultados</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Step 4: Prácticas ── */}
          <div>
            <StepHeader
              num={4} title="Elegí tu práctica"
              summary={selectedPracIds.size > 0 ? `${selectedPracIds.size} seleccionada${selectedPracIds.size !== 1 ? "s" : ""}` : undefined}
              active={sidebarStep === 4} done={false} locked={sidebarStep < 4}
              onClick={() => setSidebarStep(4)}
            />
            {sidebarStep === 4 && (
              <div style={{ padding: "4px 18px 16px" }}>
                {pracSections.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>No hay comisiones para esta cátedra.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {pracSections.map((s) => {
                      const checked = selectedPracIds.has(s.id);
                      const sMeets = meets.filter((m) => m.sectionId === s.id);
                      const times = sMeets.map((m) => `${dayAbbr(m.dayName)} ${m.start}–${m.end}`).join(" · ");
                      const aula = s.aulas.join(", ");
                      return (
                        <label
                          key={s.id}
                          onMouseEnter={() => setHoverPracId(s.id)}
                          onMouseLeave={() => setHoverPracId((p) => (p === s.id ? null : p))}
                          style={{
                            display: "flex", gap: 10, alignItems: "flex-start",
                            padding: "9px 11px", borderRadius: 8, cursor: "pointer",
                            border: `1.5px solid ${checked ? "#a7f3d0" : "#e5e7eb"}`,
                            background: checked ? "#f0fdf4" : "#fff",
                          }}
                        >
                          <input type="checkbox" checked={checked} onChange={() => togglePrac(s.id)} style={{ marginTop: 2, flexShrink: 0, accentColor: "#16a34a" }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 12.5, color: checked ? "#15803d" : "#111827" }}>
                              {s.tipo} {s.sectionLabel} — {unique(s.docentes).join(", ")}
                            </div>
                            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                              {[aula, s.oblig && `Oblig: ${s.oblig}`, times].filter(Boolean).join(" · ")}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Sticky footer — add another cátedra */}
        {sidebarStep === 4 && (
          <div style={{ flexShrink: 0, borderTop: "1px solid #e5e7eb", padding: "12px 18px", background: "#fff" }}>
            <button
              type="button"
              onClick={() => { setSelectedCatedraKey(""); setCatQuery(""); setSidebarStep(3); }}
              style={{ width: "100%", padding: "8px", borderRadius: 8, background: "#f9fafb", color: "#374151", border: "1.5px solid #e5e7eb", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
            >
              + Agregar otra cátedra
            </button>
          </div>
        )}
      </aside>

      {/* ── CALENDAR ── */}
      <main style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#f9fafb" }}>

        {/* Toolbar */}
        <div style={{ padding: "11px 20px", background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Vista semanal</span>
          <span style={{ fontSize: 12, color: "#d1d5db" }}>·</span>
          <span style={{ fontSize: 12, fontWeight: selectedSections.length > 0 ? 600 : 400, color: selectedSections.length > 0 ? "#2563eb" : "#9ca3af" }}>
            {selectedSections.length} {selectedSections.length === 1 ? "sección seleccionada" : "secciones seleccionadas"}
          </span>
          {maxDayNum > 5 && (
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af" }}>
              ← Desplazá para ver {maxDayNum === 7 ? "Sáb y Dom" : "Sáb"} →
            </span>
          )}
        </div>

        {/* Calendar container — measures width for colWidth */}
        <div ref={calContainerRef} style={{ flex: 1, overflow: "hidden", background: "#fff" }}>
          {/* Single scroll container for both axes — sticky header scrolls horizontally with content */}
          <div style={{ height: "100%", overflowX: "auto", overflowY: "auto" }}>
            <div style={{ minWidth: calInnerWidth }}>

              {/* Sticky day headers */}
              <div style={{
                position: "sticky", top: 0, zIndex: 1,
                display: "grid",
                gridTemplateColumns: `${TIME_COL_PX}px repeat(${maxDayNum}, ${colWidth}px)`,
                background: "#fff", borderBottom: "1px solid #e5e7eb",
              }}>
                <div style={{ padding: "10px 8px", fontSize: 11, fontWeight: 600, color: "#9ca3af", textAlign: "center" }}>Hora</div>
                {activeDayLabels.map((d, i) => (
                  <div key={i} style={{ padding: "10px 8px", fontSize: 13, fontWeight: 700, textAlign: "center", borderLeft: "1px solid #f3f4f6", color: "#374151" }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Body */}
              <div style={{ position: "relative", height: calBodyHeight }}>

                {/* Hour lines + labels */}
                {(() => {
                  const nodes: ReactNode[] = [];
                  for (let hour = Math.floor(timeMin / 60); hour <= Math.floor(timeMax / 60); hour++) {
                    const y = mapY(hour * 60);
                    nodes.push(<div key={hour} style={{ position: "absolute", left: TIME_COL_PX, right: 0, top: y, borderTop: "1px solid #f3f4f6" }} />);
                    nodes.push(
                      <div key={`l${hour}`} style={{ position: "absolute", left: 0, width: TIME_COL_PX, top: y, transform: "translateY(-50%)", textAlign: "center", fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>
                        {String(hour).padStart(2, "0")}:00
                      </div>
                    );
                  }
                  return nodes;
                })()}

                {/* Hover preview */}
                {hoverPracId && hoverOverlayMeets.map((m) => {
                  const top = mapY(m.startMin);
                  const height = Math.max(2, mapY(m.endMin) - top);
                  const left = TIME_COL_PX + (m.dayNum - 1) * colWidth;
                  const width = colWidth - 4;
                  const color = m.tipo === "Prac" ? "#2c9680" : m.tipo === "Teo" ? "#861f5c" : "#3b82f6";
                  return (
                    <div key={`h${m.id}`} style={{ position: "absolute", top, left, width, height, background: `${color}30`, border: `1.5px dashed ${color}`, borderRadius: 7 }} />
                  );
                })}

                {/* Selected events */}
                {selectedMeets.map((m) => {
                  const top = mapY(m.startMin);
                  const height = Math.max(2, mapY(m.endMin) - top);
                  const left = TIME_COL_PX + (m.dayNum - 1) * colWidth;
                  const width = colWidth - 4;
                  const color = m.tipo === "Prac" ? "#2c9680" : m.tipo === "Teo" ? "#861f5c" : "#3b82f6";
                  const sec = sectionById.get(m.sectionId);
                  const isPrac = sec?.tipo === "Prac";
                  return (
                    <div
                      key={m.id}
                      title={`${m.dayName} ${m.start}–${m.end} • ${m.aulaCode}`}
                      style={{ position: "absolute", top, left, width, height, background: color, color: "#fff", borderRadius: 7, padding: 7, boxShadow: "0 2px 8px rgba(0,0,0,0.12)", fontSize: 12, overflow: "hidden" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ fontWeight: 800, fontSize: 12.5, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {m.tipo} {m.sectionLabel}
                        </div>
                        {isPrac && selectedPracIds.has(m.sectionId) && (
                          <button type="button" onClick={() => removePrac(m.sectionId)} title="Quitar práctica" style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", padding: "1px 6px", fontSize: 11, lineHeight: 1.4, flexShrink: 0 }}>✕</button>
                        )}
                      </div>
                      {sec && <div style={{ opacity: 0.9, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sec.materiaName}</div>}
                      {sec && sec.docentes.length > 0 && <div style={{ opacity: 0.75, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sec.docentes[0]}</div>}
                      <div style={{ fontSize: 11, opacity: 0.9 }}>{m.start}–{m.end}</div>
                      <div style={{ fontSize: 11, opacity: 0.75 }}>{m.aulaCode}</div>
                    </div>
                  );
                })}

                {/* Gray zones */}
                {grayZones.map((z) => {
                  const top = mapY(z.startMin);
                  const height = Math.max(2, mapY(z.endMin) - top);
                  const left = TIME_COL_PX + (z.dayNum - 1) * colWidth;
                  const width = colWidth - 4;
                  return (
                    <div key={z.id} style={{ position: "absolute", top, left, width, height, background: "#9ca3af33", border: "1px dashed #6b7280", borderRadius: 7 }}>
                      <div style={{ display: "flex", gap: 4, alignItems: "flex-start", padding: "5px 7px", fontSize: 12, color: "#374151" }}>
                        <div style={{ fontWeight: 700, flex: 1 }}>{z.note || "Ocupado"}</div>
                        <button type="button" onClick={() => removeGrayZone(z.id)} title="Quitar bloque" style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
