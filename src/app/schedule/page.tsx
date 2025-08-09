"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ProgramCode, Catedra, Section, Meet } from "@/lib/types";

const TERM = "2025-2";
const STORAGE_KEY = `psico-uba:selection:${TERM}`;
const ZONES_KEY = `psico-uba:gray:${TERM}`;

type GrayZone = {
  id: string;
  dayNum: number; // 1..6 (Lun..Sab)
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

function by<T>(key: keyof T) {
  return (a: T, b: T) => String(a[key]).localeCompare(String(b[key]));
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

const dayLabels = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const TIME_COL_PX = 54;

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export default function SchedulePage() {
  const [program, setProgram] = useState<ProgramCode>("PS");
  const [catedras, setCatedras] = useState<Catedra[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [meets, setMeets] = useState<Meet[]>([]);
  const [selectedCatedraKey, setSelectedCatedraKey] = useState<string>("");
  const [selectedPracIds, setSelectedPracIds] = useState<Set<string>>(new Set());
  const [catQuery, setCatQuery] = useState("");
  const [hoverPracId, setHoverPracId] = useState<string | null>(null);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const [calH, setCalH] = useState<number>(600);
  const [justSaved, setJustSaved] = useState(false);
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);
  const [grayZones, setGrayZones] = useState<GrayZone[]>([]);
  const [nzDay, setNzDay] = useState<number>(1);
  const [nzStart, setNzStart] = useState<string>("08:00");
  const [nzEnd, setNzEnd] = useState<string>("09:00");
  const [nzNote, setNzNote] = useState<string>("");

  useEffect(() => {
    const el = calendarRef.current;
    if (!el) return;
    const resize = () => setCalH(el.clientHeight);
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Padding for first/last hour labels
  const padTop = 14;
  const padBottom = 14;

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

  // Load saved selection for this term from localStorage (once data is available)
  useEffect(() => {
    if (loadedFromStorage || sections.length === 0) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        // keep only practices that still exist in dataset
        const practiceIds = new Set(
          sections.filter((s) => s.tipo === "Prac").map((s) => s.id)
        );
        const filtered = arr.filter((id) => practiceIds.has(id));
        if (filtered.length > 0) setSelectedPracIds(new Set(filtered));
      }
    } catch {
      // ignore
    } finally {
      setLoadedFromStorage(true);
    }
  }, [sections, loadedFromStorage]);

  // Load gray zones for this term
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ZONES_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as GrayZone[];
        // Basic validation
        const filtered = arr.filter((z) => z && z.dayNum >= 1 && z.dayNum <= 6 && z.endMin > z.startMin);
        setGrayZones(filtered);
      }
    } catch {}
  }, []);

  const catedrasByProgram = useMemo(() => {
    let list = catedras
      .filter((c) => c.program === program)
      .sort((a, b) => a.materiaName.localeCompare(b.materiaName) || a.catedraId - b.catedraId);
    const q = normalize(catQuery);
    if (q) {
      list = list.filter((c) => {
        const hay = `${c.materiaName} ${c.docenteTitular}`;
        return normalize(hay).includes(q);
      });
    }
    return list;
  }, [catedras, program, catQuery]);

  const catedraSections = useMemo(() => {
    if (!selectedCatedraKey) return [] as Section[];
    const [prog, idStr] = selectedCatedraKey.split("-");
    const cid = Number(idStr);
    return sections.filter((s) => s.program === prog && s.catedraId === cid);
  }, [sections, selectedCatedraKey]);

  const pracSections = useMemo(() => catedraSections.filter((s) => s.tipo === "Prac").sort(by<Section>("sectionLabel")), [catedraSections]);
  const teoSections = useMemo(() => catedraSections.filter((s) => s.tipo === "Teo"), [catedraSections]); // eslint-disable-line @typescript-eslint/no-unused-vars
  const semSections = useMemo(() => catedraSections.filter((s) => s.tipo === "Sem"), [catedraSections]); // eslint-disable-line @typescript-eslint/no-unused-vars

  const selectedSections = useMemo(() => {
    // Index sections by (catedraId,tipo,label) to resolve requirements across any cátedra
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
        const k = `${prac.catedraId}|${req.tipo}|${req.label}`;
        const dep = byKey.get(k);
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

  const timeMin = useMemo(() => Math.min(8 * 60, ...selectedMeets.map((m) => m.startMin)), [selectedMeets]);
  const timeMax = useMemo(() => Math.max(22 * 60, ...selectedMeets.map((m) => m.endMin)), [selectedMeets]);
  const totalMin = Math.max(timeMax - timeMin, 1);

  // Uniform minutes->Y mapper for the visible grid (depends on computed times)
  const mapY = useMemo(() => {
    return (minutes: number) => {
      const contentH = Math.max(0, calH - padTop - padBottom);
      return padTop + ((minutes - timeMin) / totalMin) * contentH;
    };
  }, [calH, timeMin, totalMin]);

  function togglePrac(id: string) {
    setSelectedPracIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function removePrac(id: string) {
    setSelectedPracIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function saveSelection() {
    try {
      const arr = Array.from(selectedPracIds);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      localStorage.setItem(ZONES_KEY, JSON.stringify(grayZones));
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } catch {}
  }

  function addGrayZone() {
    // parse HH:MM
    const toMin = (s: string) => {
      const [h, m] = s.split(":").map((n) => parseInt(n, 10));
      return h * 60 + m;
    };
    const sMin = toMin(nzStart);
    const eMin = toMin(nzEnd);
    if (!nzDay || eMin <= sMin) return;
    const z: GrayZone = {
      id: `z-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dayNum: nzDay,
      startMin: sMin,
      endMin: eMin,
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

  function dayAbbr(d: string) {
    const map: Record<string, string> = {
      lunes: "Lun", martes: "Mar", miercoles: "Mie", jueves: "Jue", viernes: "Vie", sabado: "Sab",
    };
    return map[d.toLowerCase()] || d.slice(0, 3);
  }

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

  return (
    <div style={{ padding: 0, height: "100vh", boxSizing: "border-box", overflow: "hidden" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "380px 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Sidebar */}
        <aside style={{ position: "sticky", top: 0, maxHeight: "100vh", overflow: "hidden" }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, color: "#374151", fontWeight: 600 }}>Programa</label>
            <select
              value={program}
              onChange={(e) => {
                setProgram(e.target.value as ProgramCode);
                setSelectedCatedraKey("");
                setSelectedPracIds(new Set());
                setCatQuery("");
              }}
            >
              {PROGRAMS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 13, color: "#374151", fontWeight: 600 }}>Buscar cátedra</label>
            <input
              type="text"
              placeholder="Materia o docente"
              value={catQuery}
              onChange={(e) => setCatQuery(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden", maxHeight: 280, overflowY: "auto" }}>
            {catedrasByProgram.map((c) => {
              const key = `${c.program}-${c.catedraId}`;
              const active = key === selectedCatedraKey;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCatedraKey(key);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    background: active ? "#eef2ff" : "#fff",
                    borderBottom: "1px solid #f3f4f6",
                    cursor: "pointer",
                  }}
                  title={`${c.materiaName} — ${c.docenteTitular}`}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.materiaName}
                  </div>
                  <div style={{ fontSize: 12.5, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.chairLabel || ""} — {c.docenteTitular}
                  </div>
                </button>
              );
            })}
            {catedrasByProgram.length === 0 && (
              <div style={{ padding: 10, fontSize: 12, color: "#6b7280" }}>Sin resultados</div>
            )}
          </div>

          {selectedCatedraKey && (
            <div style={{ marginTop: 16 }}>
              <h2 style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>Prácticas</h2>
              <div style={{ display: "grid", gap: 8, maxHeight: 320, overflowY: "auto", paddingRight: 4 }}>
                {pracSections.length === 0 && <div style={{ fontSize: 12, color: "#6b7280" }}>No hay comisiones.</div>}
                {pracSections.map((s) => (
                  <label
                    key={s.id}
                    onMouseEnter={() => setHoverPracId(s.id)}
                    onMouseLeave={() => setHoverPracId((p) => (p === s.id ? null : p))}
                    style={{ display: "flex", gap: 8, alignItems: "flex-start", border: "1px solid #e5e7eb", borderRadius: 6, padding: 8 }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPracIds.has(s.id)}
                      onChange={() => togglePrac(s.id)}
                    />
                    <div style={{ fontSize: 14 }}>
                      <div style={{ fontWeight: 700 }}>
                        {s.tipo} {s.sectionLabel} — {unique(s.docentes).join(", ")}
                      </div>
                      <div style={{ color: "#4b5563", fontSize: 12 }}>
                        {(() => {
                          const sMeets = meets.filter((m) => m.sectionId === s.id);
                          const times = sMeets
                            .map((m) => `${dayAbbr(m.dayName)} ${m.start}–${m.end}`)
                            .join(" · ");
                          const aula = s.aulas.join(", ");
                          return `${aula} — Oblig: ${s.oblig ?? ""}${times ? ` — Prac: ${times}` : ""}`;
                        })()}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Calendar */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 0 }}>
            {/* optional small badge on the right */}
            <div style={{ marginLeft: "auto", fontSize: 12.5, color: "#6b7280", paddingRight: 8 }}>{selectedSections.length} secciones seleccionadas</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <button
              type="button"
              onClick={saveSelection}
              title="Guardar selección local"
              style={{ background: "#2563eb", color: "#fff", border: 0, borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 13 }}
            >
              Guardar selección
            </button>
            {justSaved && <span style={{ fontSize: 12, color: "#065f46" }}>Guardado</span>}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#374151" }}>Bloque gris:</span>
              <select value={nzDay} onChange={(e) => setNzDay(parseInt(e.target.value))}>
                <option value={1}>Lun</option>
                <option value={2}>Mar</option>
                <option value={3}>Mie</option>
                <option value={4}>Jue</option>
                <option value={5}>Vie</option>
                <option value={6}>Sab</option>
              </select>
              <input value={nzStart} onChange={(e) => setNzStart(e.target.value)} type="time" />
              <input value={nzEnd} onChange={(e) => setNzEnd(e.target.value)} type="time" />
              <input value={nzNote} onChange={(e) => setNzNote(e.target.value)} placeholder="Nota (opcional)" style={{ fontSize: 12 }} />
              <button type="button" onClick={addGrayZone} style={{ border: "1px solid #9ca3af", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12 }}>Añadir</button>
            </div>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", height: "calc(100vh - 40px)" }}>
            <div style={{ display: "grid", gridTemplateColumns: `${TIME_COL_PX}px repeat(6, 1fr)`, background: "#f3f4f6", fontSize: 12 }}>
              <div style={{ padding: 8, fontWeight: 700, color: "#6b7280" }}>Hora</div>
              {dayLabels.map((d, i) => (
                <div key={i} style={{ padding: 8, fontWeight: 700, borderRight: i === 5 ? undefined : "1px solid #e5e7eb" }}>
                  {d}
                </div>
              ))}
            </div>
            <div ref={calendarRef} style={{ position: "relative", height: "calc(100% - 32px)" }}>
              {(() => {
                const nodes: ReactNode[] = [];
                const startHour = Math.floor(timeMin / 60);
                const endHour = Math.floor(timeMax / 60);
                for (let hour = startHour; hour <= endHour; hour++) {
                  const y = mapY(hour * 60);
                  nodes.push(
                    <div key={hour} style={{ position: "absolute", left: TIME_COL_PX, right: 0, top: y, borderTop: "1px solid #e5e7eb" }} />
                  );
                  nodes.push(
                    <div
                      key={`label-${hour}`}
                      style={{
                        position: "absolute",
                        left: 0,
                        width: TIME_COL_PX,
                        top: y,
                        transform: "translateY(-50%)",
                        textAlign: "center",
                        fontSize: 13,
                        color: "#374151",
                        fontWeight: 600,
                      }}
                    >
                      {String(hour).padStart(2, "0")}:00
                    </div>
                  );
                }
                return nodes;
              })()}
              {/* Hover preview */}
              {hoverPracId && hoverOverlayMeets.map((m) => {
                const top = mapY(m.startMin);
                const bottom = mapY(m.endMin);
                const height = Math.max(2, bottom - top);
                const left = `calc(${TIME_COL_PX}px + ${( (m.dayNum - 1) / 6 ) * 100}% )`;
                const width = `calc((100% - ${TIME_COL_PX}px)/6 - 4px)`;
                const color = m.tipo === "Prac" ? "#2c9680" : m.tipo === "Teo" ? "#861f5c" : "#3b82f6";
                return (
                  <div key={`hover-${m.id}`} style={{ position: "absolute", top, left, width, height, background: `${color}40`, border: `1px dashed ${color}`, borderRadius: 6 }} />
                );
              })}
              {/* Selected events */}
              {selectedMeets.map((m) => {
                const top = mapY(m.startMin);
                const bottom = mapY(m.endMin);
                const height = Math.max(2, bottom - top);
                const left = `calc(${TIME_COL_PX}px + ${( (m.dayNum - 1) / 6 ) * 100}% )`;
                const width = `calc((100% - ${TIME_COL_PX}px)/6 - 4px)`;
                const color = m.tipo === "Prac" ? "#2c9680" : m.tipo === "Teo" ? "#861f5c" : "#3b82f6";
                const sec = sectionById.get(m.sectionId);
                const isPrac = sec?.tipo === "Prac";
                return (
                  <div
                    key={m.id}
                    title={`${m.dayName} ${m.start}–${m.end} • ${m.aulaCode}`}
                    style={{
                      position: "absolute",
                      top,
                      left,
                      width,
                      height,
                      background: color,
                      color: "#fff",
                      borderRadius: 6,
                      padding: 6,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.12)",
                      fontSize: 12.5,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ fontWeight: 800, flex: 1 }}>{m.tipo} {m.sectionLabel}</div>
                      {isPrac && selectedPracIds.has(m.sectionId) && (
                        <button
                          type="button"
                          onClick={() => removePrac(m.sectionId)}
                          title="Quitar práctica"
                          style={{ background: "#fca5a5", color: "#7f1d1d", border: 0, borderRadius: 4, cursor: "pointer", padding: "0 6px", fontSize: 12 }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div>{m.start}–{m.end}</div>
                    <div style={{ opacity: 0.85 }}>{m.aulaCode}</div>
                  </div>
                );
              })}
              {/* Gray zones */}
              {grayZones.map((z) => {
                const top = mapY(z.startMin);
                const bottom = mapY(z.endMin);
                const height = Math.max(2, bottom - top);
                const left = `calc(${TIME_COL_PX}px + ${( (z.dayNum - 1) / 6 ) * 100}% )`;
                const width = `calc((100% - ${TIME_COL_PX}px)/6 - 4px)`;
                return (
                  <div key={z.id} style={{ position: "absolute", top, left, width, height, background: "#9ca3af55", border: "1px dashed #6b7280", borderRadius: 6 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", padding: 4, fontSize: 12, color: "#111827" }}>
                      <div style={{ fontWeight: 700, flex: 1 }}>{z.note || "Ocupado"}</div>
                      <button type="button" onClick={() => removeGrayZone(z.id)} title="Quitar bloque" style={{ background: "#e5e7eb", border: 0, borderRadius: 4, cursor: "pointer", padding: "0 6px" }}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


