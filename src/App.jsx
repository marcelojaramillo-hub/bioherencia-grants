
import { useState, useEffect, useCallback } from "react";

// ============================================================
// SUPABASE CONNECTION
// ============================================================
const SB_URL = "https://tphrglqgzvlwpacurbmu.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaHJnbHFnenZsd3BhY3VyYm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODc0NDYsImV4cCI6MjA5MTc2MzQ0Nn0.oWAe4dJesxU4m3Oj1nklOotUt2OGjfuxgeq44j8zcxs";
const HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

async function sbGet(table, query = "") {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, { headers: HEADERS });
    return r.ok ? await r.json() : [];
  } catch { return []; }
}
async function sbPatch(table, id, data) {
  try {
    await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH", headers: { ...HEADERS, Prefer: "return=minimal" }, body: JSON.stringify(data)
    });
  } catch (e) { console.error("Patch error:", e); }
}

// ============================================================
// STATIC FALLBACK DATA (used if Supabase is unreachable)
// ============================================================
const FALLBACK_APPS = [
  { id: "BH-A-003", funder: "MBZ Species Conservation Fund", project: "Monitoreo Águila Arpía — Reserva Harpy Eagle",
    amount: "Max USD 25,000", amountNum: 25000, priority: "URGENTE", deadline: "2026-05-31", portal_opens: "2026-05-01",
    language: "Inglés", score: 4.0, verified: "2026-04-09", next_step: "Preparar proyecto offline. Portal abre 1 mayo.",
    url_apply: "https://application.speciesconservation.org/", url_funder: "https://www.speciesconservation.org/",
    url_info: "https://www.speciesconservation.org/biodiversity-nature-people/conservation-philanthropy/grants/application-criteria/",
    tooltip: "Max USD 25K. Formulario online en inglés. Prioriza CR, EN, Data Deficient (IUCN). Portal abre 1 mayo, cierra 31 mayo.",
    hoursEst: 24, area: "Conservación", entity: "Bioherencia (COL)", status: "En preparación",
    tasks: [
      { id: "t1", title: "Verificar status IUCN Harpia harpyja", due: "2026-04-15", weight: 1, type: "Investigación" },
      { id: "t2", title: "Compilar datos monitoreo Águila Arpía", due: "2026-04-22", weight: 2, type: "Investigación" },
      { id: "t3", title: "Preparar carpeta institucional BH", due: "2026-04-20", weight: 2, type: "Documentación" },
      { id: "tg", title: "⚑ DECISIÓN GO/NO-GO: ¿especie califica? ¿datos suficientes?", due: "2026-04-23", weight: 1, type: "Decisión", isGate: true },
      { id: "t4", title: "Redactar proyecto (objetivos, actividades, resultados)", due: "2026-04-30", weight: 3, type: "Redacción" },
      { id: "t5", title: "Preparar presupuesto en USD", due: "2026-05-07", weight: 3, type: "Presupuesto" },
      { id: "t6", title: "Llenar formulario online (portal abre 1 mayo)", due: "2026-05-15", weight: 2, type: "Envío" },
      { id: "t7", title: "Revisión final y envío", due: "2026-05-25", weight: 1, type: "Revisión" },
    ] },
  { id: "BH-A-012", funder: "GEF SGP Colombia (PPD)", project: "Conservación comunitaria — Zona PNN Macarena",
    amount: "USD 25,000–50,000", amountNum: 35000, priority: "URGENTE", deadline: null, language: "Español",
    score: 4.19, verified: "2026-04-09", next_step: "Contactar Coordinador Nacional en ppdcolombia.org",
    url_apply: "https://ppdcolombia.org/", url_info: "https://ppdcolombia.org/quienes-somos/", url_funder: "https://sgp.undp.org/",
    tooltip: "PPD/SGP del GEF. PNUD Colombia. Max USD 50K. Español. Convocatoria permanente.", hoursEst: 32, area: "Gobernanza",
    entity: "Bioherencia (COL)", status: "En preparación",
    tasks: [
      { id: "t8", title: "Localizar contacto NC en ppdcolombia.org", due: "2026-04-14", weight: 1, type: "Investigación" },
      { id: "t9", title: "Primer contacto con Coordinador Nacional", due: "2026-04-18", weight: 2, type: "Contacto", isGate: true },
      { id: "t10", title: "Obtener y estudiar CPS Colombia", due: "2026-04-25", weight: 2, type: "Investigación" },
      { id: "t11", title: "Redactar concepto de proyecto (español)", due: "2026-05-10", weight: 3, type: "Redacción" },
      { id: "t12", title: "Presupuesto + documentos soporte", due: "2026-05-20", weight: 3, type: "Presupuesto" },
      { id: "t13", title: "Enviar concepto al NC para pre-screening", due: "2026-06-01", weight: 1, type: "Envío" },
    ] },
  { id: "BH-A-014", funder: "Rainforest Trust", project: "Feasibility Study — Reserva Harpy Eagle",
    amount: "~USD 10,000", amountNum: 10000, priority: "ALTA", deadline: null, language: "Inglés",
    score: 4.13, verified: "2026-04-09", next_step: "Verificar Reserva en WDPA, preparar Concept Note",
    url_apply: "https://www.rainforesttrust.org/get-involved/apply-for-funding/", url_funder: "https://www.rainforesttrust.org/",
    url_info: "https://www.rainforesttrust.org/get-involved/apply-for-funding/",
    tooltip: "Feasibility Awards ~USD 10K. Rolling. Proceso colaborativo. Reserva Harpy Eagle = encaje perfecto.", hoursEst: 24, area: "Conservación",
    entity: "Ambas", status: "En preparación",
    tasks: [
      { id: "t14", title: "Verificar Reserva en protectedplanet.net (WDPA)", due: "2026-04-16", weight: 1, type: "Investigación" },
      { id: "t15", title: "Revisar criterios en rainforesttrust.org", due: "2026-04-18", weight: 1, type: "Investigación" },
      { id: "t16", title: "Compilar datos biodiversidad", due: "2026-04-22", weight: 2, type: "Investigación" },
      { id: "tg2", title: "⚑ DECISIÓN GO/NO-GO", due: "2026-04-24", weight: 1, type: "Decisión", isGate: true },
      { id: "t17", title: "Redactar Concept Note (inglés)", due: "2026-05-05", weight: 3, type: "Redacción" },
      { id: "t18", title: "Presupuesto feasibility (~USD 10K)", due: "2026-05-10", weight: 2, type: "Presupuesto" },
      { id: "t19", title: "Enviar Concept Note vía portal RT", due: "2026-05-15", weight: 1, type: "Envío" },
    ] },
];

const DEFAULT_KPIS = { meta_total: 550, servicios_eco: 250, grants_int: 0, proyectos_nac: 0, donaciones: 0 };

// ============================================================
// CONSTANTS & HELPERS
// ============================================================
const STATES = ["Preseleccionada", "En preparación", "Enviada", "En evaluación", "Aprobada", "Rechazada"];
const ST_BG = { "Preseleccionada": "#0c4a6e", "En preparación": "#854d0e", "Enviada": "#6b21a8", "En evaluación": "#4338ca", "Aprobada": "#166534", "Rechazada": "#7f1d1d" };
const ST_TX = { "Preseleccionada": "#7dd3fc", "En preparación": "#fbbf24", "Enviada": "#c4b5fd", "En evaluación": "#a5b4fc", "Aprobada": "#4ade80", "Rechazada": "#fca5a5" };
const PRI = { URGENTE: "#ef4444", ALTA: "#f97316" };
const ENTITIES = ["Bioherencia (COL)", "Biolegacy (USA 501c3)", "Ambas", "Por definir"];
const WEIGHT_LABELS = { 1: "Ligera", 2: "Media", 3: "Pesada" };
const WEIGHT_COLORS = { 1: "#334155", 2: "#854d0e", 3: "#7f1d1d" };

const TODAY = new Date().toISOString().split('T')[0];
const daysBetween = (d) => d ? Math.ceil((new Date(d) - new Date(TODAY)) / 86400000) : null;

function genBriefing(app) {
  return {
    funder_desc: app.tooltip || `Funder: ${app.funder}. Verificar información en sitio web.`,
    que_financia: `${app.amount}. Área: ${app.area || 'Por definir'}. ${app.language ? `Idioma: ${app.language}.` : ''}`,
    quien_puede: app.requisitos || "Verificar requisitos de elegibilidad en el sitio del funder.",
    idioma: app.language || "Por verificar",
    ciclo: app.deadline ? `Deadline: ${app.deadline}` : "Rolling / permanente — verificar en sitio web.",
    encaje_bh: `Score: ${(app.score||0).toFixed(2)}. ${(app.score||0) >= 4 ? 'ENCAJE ALTO.' : (app.score||0) >= 3.5 ? 'Encaje medio-alto.' : 'Encaje moderado.'}`,
    que_preparar: app.tasks ? app.tasks.filter(t => !t.isGate).map((t,i) => `${i+1}) ${t.title}`).join('\n') : "Verificar requisitos.",
    riesgos: app.language === "Inglés" ? "Requiere redacción sólida en inglés." : "Verificar elegibilidad.",
    tip_experto: (app.score||0) >= 4 ? "Score alto — priorizar." : "Score moderado — evaluar costo-beneficio.",
    score: app.score || 0,
    entidad_recomendada: app.entity || "Por definir",
  };
}

// ============================================================
// UI COMPONENTS (same as v7)
// ============================================================
function Tip({ text, children }) {
  const [s, setS] = useState(false);
  return (
    <span style={{ position: "relative" }} onClick={e => { e.stopPropagation(); setS(!s); }} onMouseLeave={() => setS(false)}>
      {children}
      {s && <div style={{ position: "absolute", left: 0, top: "100%", marginTop: 6, width: "min(300px,85vw)", padding: 12, background: "#1e293b", color: "#e2e8f0", borderRadius: 10, fontSize: 13, lineHeight: 1.6, zIndex: 1000, boxShadow: "0 16px 40px rgba(0,0,0,.6)", border: "1px solid #334155" }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", marginBottom: 4 }}>ⓘ Info</div>{text}
      </div>}
    </span>
  );
}

function EK({ label, value, onChange, color, suffix = "", sub, editable = true }) {
  const [ed, setEd] = useState(false);
  const [tmp, setTmp] = useState(String(value));
  return (
    <div style={{ flex: "1 1 45%", minWidth: 0, background: "#0f172a", borderRadius: 10, padding: "10px 8px", border: "1px solid #1e293b", textAlign: "center" }}>
      <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      {ed && editable ? <input value={tmp} onChange={e => setTmp(e.target.value)} autoFocus type="number" onBlur={() => { onChange(Number(tmp)||0); setEd(false); }} onKeyDown={e => { if(e.key==="Enter"){onChange(Number(tmp)||0);setEd(false);}}} style={{ width: "80%", background: "#1e293b", border: "1px solid #3b82f6", borderRadius: 6, color: "#fff", fontSize: 18, fontWeight: 800, textAlign: "center", padding: 2, outline: "none" }} />
      : <div onClick={() => editable && setEd(true)} style={{ fontSize: 20, fontWeight: 800, color: color||"#e2e8f0", cursor: editable?"pointer":"default" }}>{typeof value==='number'?value.toLocaleString():value}{suffix}</div>}
      {sub && <div style={{ fontSize: 9, color: "#334155" }}>{sub}</div>}
    </div>
  );
}

function Ind({ label, value, sub, color }) {
  return <div style={{ flex: "1 1 30%", minWidth: 85, background: "#0f172a", borderRadius: 8, padding: "8px 6px", border: "1px solid #1e293b", textAlign: "center" }}>
    <div style={{ fontSize: 8, color: "#64748b", textTransform: "uppercase" }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 800, color: color||"#e2e8f0" }}>{value}</div>
    {sub && <div style={{ fontSize: 8, color: "#475569" }}>{sub}</div>}
  </div>;
}

function LB({ href, label, color }) { if(!href) return null; return <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", gap: 3, padding: "5px 9px", borderRadius: 7, background: color||"#1e3a5f", color: "#93c5fd", fontSize: 11, fontWeight: 600, textDecoration: "none", border: "1px solid #2563eb33" }}>{label} ↗</a>; }

function WeightedBar({ tasks, done }) {
  const totalW = tasks.reduce((s,t) => s + (t.weight||1), 0);
  const doneW = tasks.reduce((s,t,i) => s + (done[i] ? (t.weight||1) : 0), 0);
  const pct = totalW > 0 ? Math.round((doneW / totalW) * 100) : 0;
  const clr = pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : pct > 0 ? "#3b82f6" : "#334155";
  const doneCt = done.filter(Boolean).length;
  const overdue = tasks.filter((t,i) => !done[i] && t.due && daysBetween(t.due) < 0).length;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ flex: 1, height: 8, background: "#1e293b", borderRadius: 4, overflow: "hidden", display: "flex" }}>
          {tasks.map((t, i) => {
            const w = ((t.weight||1) / totalW) * 100;
            return <div key={i} style={{ width: `${w}%`, height: "100%", background: done[i] ? clr : "transparent", borderRight: i < tasks.length-1 ? "1px solid #0f172a" : "none", transition: "background .3s" }} />;
          })}
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: clr, minWidth: 35, textAlign: "right" }}>{pct}%</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
        <span style={{ fontSize: 9, color: "#475569" }}>{doneCt}/{tasks.length} pasos</span>
        <span style={{ fontSize: 9, color: "#475569" }}>{doneW}/{totalW} esfuerzo</span>
        {overdue > 0 && <span style={{ fontSize: 9, color: "#ef4444", fontWeight: 600 }}>⚠ {overdue} vencida{overdue > 1 ? "s" : ""}</span>}
      </div>
    </div>
  );
}

function TaskItem({ task, done, onToggle, funderName }) {
  const [showA, setShowA] = useState(false);
  const [assignee, setAssignee] = useState(task.assignee || "");
  const [notified, setNotified] = useState(false);
  const d = daysBetween(task.due);
  const overdue = d !== null && d < 0 && !done;
  const TEAM = ["Chelo", "Marcela", "Juanca", "Luis"];
  const assignTo = async (name) => {
    setAssignee(name); setShowA(false);
    if (name) {
      try {
        await fetch("/api/notify", { method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ type: "task_assigned", data: { assignee: name, task_title: task.title, funder: funderName, deadline: task.due, app_url: "https://bioherencia-grants.vercel.app" }})
        });
        setNotified(true); setTimeout(() => setNotified(false), 3000);
      } catch(e) { console.log("Notify error:", e); }
    }
  };
  return (
    <div style={{ padding: "5px 0", borderBottom: "1px solid #1e293b", background: overdue ? "#1a0a0a" : task.isGate ? "#0a1a1a" : "transparent", borderLeft: task.isGate ? "3px solid #0d9488" : "none", paddingLeft: task.isGate ? 8 : 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: done ? 0.4 : 1 }}>
        <input type="checkbox" checked={done} onChange={onToggle} style={{ accentColor: task.isGate ? "#0d9488" : "#3b82f6", width: 15, height: 15, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12, textDecoration: done ? "line-through" : "none", color: done ? "#475569" : task.isGate ? "#5eead4" : "#cbd5e1", fontWeight: task.isGate ? 600 : 400 }}>{task.title}</span>
        <span style={{ fontSize: 9, padding: "1px 4px", borderRadius: 3, background: WEIGHT_COLORS[task.weight||1], color: "#94a3b8", flexShrink: 0 }}>{WEIGHT_LABELS[task.weight||1]}</span>
        {task.due && <span style={{ fontSize: 10, color: overdue ? "#ef4444" : (d!==null&&d<=7) ? "#f97316" : "#64748b", fontWeight: overdue||(d!==null&&d<=7) ? 600 : 400, flexShrink: 0 }}>
          {overdue ? `${Math.abs(d)}d⚠` : (d!==null&&d<=7) ? `${d}d⏰` : new Date(task.due).toLocaleDateString('es',{month:'short',day:'numeric'})}
        </span>}
        <button onClick={e=>{e.stopPropagation();setShowA(!showA);}} style={{ background: assignee?"#1e3a5f":"#1e293b", border: "1px solid #334155", borderRadius: 5, color: assignee?"#60a5fa":"#64748b", fontSize: 10, padding: "1px 5px", cursor: "pointer", flexShrink: 0 }}>{notified?"✓📧":assignee?`👤${assignee}`:"👤+"}</button>
      </div>
      {showA && <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4, marginLeft: 22 }}>
        {TEAM.map(name => <button key={name} onClick={()=>assignTo(name)} style={{ background: assignee===name?"#1e3a5f":"#1e293b", border: "1px solid #334155", borderRadius: 5, color: assignee===name?"#60a5fa":"#94a3b8", fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>{name}</button>)}
        <button onClick={()=>assignTo("")} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 5, color: "#ef4444", fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>✗</button>
      </div>}
    </div>
  );
}

function BriefingPanel({ app, onClose }) {
  const b = genBriefing(app);
  const ss = { marginBottom: 14 };
  const ls = { fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 };
  const ts = { fontSize: 13, color: "#cbd5e1", lineHeight: 1.6, whiteSpace: "pre-line" };
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: 20, width: "min(480px,95vw)", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div><div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>📄 Briefing</div><div style={{ fontSize: 14, color: "#3b82f6", fontWeight: 600 }}>{app.funder}</div></div>
          <div style={{ background: b.score>=4?"#052e16":"#1a1a0a", borderRadius: 8, padding: "6px 12px", border: `1px solid ${b.score>=4?'#166534':'#854d0e'}` }}>
            <div style={{ fontSize: 9, color: "#64748b" }}>Score</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: b.score>=4?"#4ade80":"#eab308" }}>{b.score.toFixed(2)}</div>
          </div>
        </div>
        <div style={ss}><div style={ls}>¿Quién es este funder?</div><div style={ts}>{b.funder_desc}</div></div>
        <div style={ss}><div style={ls}>¿Qué financia?</div><div style={ts}>{b.que_financia}</div></div>
        <div style={ss}><div style={ls}>Idioma y formato</div><div style={ts}>{b.idioma}</div></div>
        <div style={ss}><div style={ls}>Ciclo / deadline</div><div style={ts}>{b.ciclo}</div></div>
        <div style={{ ...ss, background: "#052e16", borderRadius: 8, padding: 12, border: "1px solid #166534" }}><div style={{ ...ls, color: "#4ade80" }}>Encaje con Bioherencia</div><div style={ts}>{b.encaje_bh}</div></div>
        <div style={{ ...ss, background: "#1e1b4b", borderRadius: 8, padding: 12, border: "1px solid #4338ca" }}><div style={{ ...ls, color: "#a5b4fc" }}>¿Qué hay que preparar?</div><div style={ts}>{b.que_preparar}</div></div>
        <div style={ss}><div style={ls}>Riesgos</div><div style={{ ...ts, color: "#fca5a5" }}>{b.riesgos}</div></div>
        <div style={{ ...ss, background: "#0a1628", borderRadius: 8, padding: 12, border: "1px solid #1e3a5f" }}><div style={{ ...ls, color: "#60a5fa" }}>💡 Tip de experto</div><div style={ts}>{b.tip_experto}</div></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          <LB href={app.url_apply} label="Aplicar aquí" color="#1e3a5f" />
          <LB href={app.url_info} label="Requisitos" color="#1e293b" />
          <LB href={app.url_funder} label="Sitio funder" color="#1e293b" />
        </div>
        <button onClick={onClose} style={{ marginTop: 12, width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 13, padding: "10px", cursor: "pointer" }}>Cerrar briefing</button>
      </div>
    </div>
  );
}

function AppCard({ app, tasksDone, onToggleTask, onChangeStatus, onChangeEntity }) {
  const [exp, setExp] = useState(false);
  const [showSt, setShowSt] = useState(false);
  const [showEnt, setShowEnt] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const dl = daysBetween(app.deadline);
  const entity = app.entity || "Por definir";
  const overdueTasks = app.tasks.filter((t,i) => !tasksDone[i] && t.due && daysBetween(t.due) < 0).length;

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, border: `1px solid ${overdueTasks>0?'#ef444466':dl!==null&&dl<=7?'#ef4444':'#1e293b'}`, overflow: "hidden" }}>
      {dl!==null && dl<=7 && <div style={{ background: "#7f1d1d", padding: "3px 12px", fontSize: 11, color: "#fca5a5", fontWeight: 600 }}>⚠️ Menos de 7 días para cierre</div>}
      {overdueTasks>0 && <div style={{ background: "#431407", padding: "3px 12px", fontSize: 11, color: "#fb923c", fontWeight: 600 }}>⏰ {overdueTasks} tarea{overdueTasks>1?"s":""} vencida{overdueTasks>1?"s":""}</div>}
      <div style={{ padding: "14px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6, alignItems: "center" }}>
          <span style={{ background: PRI[app.priority]||"#6b7280", color: "#fff", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{app.priority}</span>
          <div style={{ position: "relative" }}>
            <button onClick={e=>{e.stopPropagation();setShowSt(!showSt);}} style={{ background: ST_BG[app.status]||"#1e293b", color: ST_TX[app.status]||"#94a3b8", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, border: "1px dashed "+(ST_TX[app.status]||"#64748b")+"44", cursor: "pointer" }}>{app.status} ▾</button>
            {showSt && <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, overflow: "hidden", zIndex: 100, minWidth: 150 }}>
              {STATES.map(st => <div key={st} onClick={e=>{e.stopPropagation();onChangeStatus(st);setShowSt(false);}} style={{ padding: "7px 12px", fontSize: 12, color: ST_TX[st], cursor: "pointer", borderBottom: "1px solid #334155" }} onMouseEnter={e=>e.target.style.background=ST_BG[st]} onMouseLeave={e=>e.target.style.background="transparent"}>{st}{app.status===st?" ✓":""}</div>)}
            </div>}
          </div>
          <div style={{ position: "relative" }}>
            <button onClick={e=>{e.stopPropagation();setShowEnt(!showEnt);}} style={{ background: "#1e293b", color: entity.includes("Biolegacy")?"#a78bfa":entity.includes("Ambas")?"#fbbf24":"#94a3b8", padding: "2px 6px", borderRadius: 5, fontSize: 10, border: "1px solid #334155", cursor: "pointer" }}>{entity.includes("Bioherencia")?"🇨🇴":entity.includes("Biolegacy")?"🇺🇸":"🌐"} {entity.split(" ")[0]} ▾</button>
            {showEnt && <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, overflow: "hidden", zIndex: 100, minWidth: 180 }}>
              {ENTITIES.map(ent => <div key={ent} onClick={e=>{e.stopPropagation();onChangeEntity(ent);setShowEnt(false);}} style={{ padding: "7px 12px", fontSize: 11, color: "#e2e8f0", cursor: "pointer", borderBottom: "1px solid #334155" }} onMouseEnter={e=>e.target.style.background="#334155"} onMouseLeave={e=>e.target.style.background="transparent"}>{ent}</div>)}
            </div>}
          </div>
          <span style={{ fontSize: 10, color: "#64748b" }}>{app.language}</span>
        </div>
        <Tip text={app.tooltip||""}><div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 2 }}>{app.funder} <span style={{ color: "#3b82f6", fontSize: 12 }}>ⓘ</span></div></Tip>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>{app.project}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
          <div style={{ background: "#1e293b", borderRadius: 7, padding: "5px 10px" }}><div style={{ fontSize: 9, color: "#64748b" }}>Monto</div><div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{app.amount}</div></div>
          <div style={{ background: "#1e293b", borderRadius: 7, padding: "5px 10px" }}><div style={{ fontSize: 9, color: "#64748b" }}>Deadline</div><div style={{ fontSize: 14, fontWeight: 700, color: dl!==null?(dl<=14?"#ef4444":dl<=30?"#f97316":"#22c55e"):"#22c55e" }}>{dl!==null?`${dl} días`:"Rolling"}</div></div>
          <div style={{ background: (app.score||0)>=4?"#052e16":"#1a1a0a", borderRadius: 7, padding: "5px 10px", border: `1px solid ${(app.score||0)>=4?'#166534':'#854d0e'}` }}><div style={{ fontSize: 9, color: "#64748b" }}>Score</div><div style={{ fontSize: 14, fontWeight: 700, color: (app.score||0)>=4?"#4ade80":"#eab308" }}>{(app.score||0).toFixed(2)}</div></div>
        </div>
        <WeightedBar tasks={app.tasks} done={tasksDone} />
        <div style={{ padding: "7px 10px", background: "#1e293b", borderRadius: 7, fontSize: 12, color: "#93c5fd", marginTop: 6 }}>→ {app.next_step}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
          <button onClick={()=>setShowBriefing(true)} style={{ padding: "5px 9px", borderRadius: 7, background: "#059669", color: "#fff", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer" }}>📄 Briefing</button>
          <LB href={app.url_apply} label="Aplicar" color="#1e3a5f" />
          <LB href={app.url_funder} label="Funder" color="#1e293b" />
        </div>
        {showBriefing && <BriefingPanel app={app} onClose={()=>setShowBriefing(false)} />}
        <div onClick={()=>setExp(!exp)} style={{ fontSize: 10, color: "#475569", cursor: "pointer", marginTop: 6 }}>{exp?"▲ Ocultar":"▼ Tareas"}</div>
      </div>
      {exp && <div style={{ padding: "0 14px 12px", borderTop: "1px solid #1e293b" }}>
        <div style={{ fontSize: 10, color: "#64748b", marginTop: 8, marginBottom: 2 }}>Ligera (1pt) · Media (2pt) · Pesada (3pt) · ⚑ = bloqueante</div>
        {app.tasks.map((t,i) => <TaskItem key={t.id||i} task={t} done={tasksDone[i]} onToggle={()=>onToggleTask(i)} funderName={app.funder} />)}
        {app.portal_opens && <div style={{ marginTop: 6, padding: "6px 10px", background: "#1e1a0a", borderRadius: 7, border: "1px solid #854d0e", fontSize: 11, color: "#fbbf24" }}>⚠️ Portal abre {app.portal_opens}</div>}
      </div>}
    </div>
  );
}

// ============================================================
// DETECTED OPPORTUNITIES (from bot)
// ============================================================
function DetectedCard({ item, onApprove, onDiscard }) {
  return (
    <div style={{ background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b", padding: 14, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{item.titulo}</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>{item.funder_nombre}</div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center" }}>
          <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: item.entidad_sugerida?.includes("USA")?"#1e1b4b":"#052e16", color: item.entidad_sugerida?.includes("USA")?"#a5b4fc":"#4ade80", fontWeight: 600 }}>{item.entidad_sugerida || "?"}</span>
          {item.relevancia_score && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: item.relevancia_score>=70?"#052e16":"#1a1a0a", color: item.relevancia_score>=70?"#4ade80":"#eab308", fontWeight: 700 }}>{item.relevancia_score}%</span>}
        </div>
      </div>
      {item.descripcion && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{item.descripcion}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {item.monto_estimado && <span style={{ fontSize: 11, color: "#e2e8f0", background: "#1e293b", padding: "2px 8px", borderRadius: 5 }}>💰 {item.monto_estimado}</span>}
        {item.deadline && <span style={{ fontSize: 11, color: "#fbbf24", background: "#1e293b", padding: "2px 8px", borderRadius: 5 }}>📅 {item.deadline}</span>}
        <span style={{ fontSize: 11, color: "#64748b", background: "#1e293b", padding: "2px 8px", borderRadius: 5 }}>📡 {item.fuente}</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={()=>onApprove(item)} style={{ flex: 1, background: "#059669", border: "none", borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 600, padding: "8px", cursor: "pointer" }}>✓ Aprobar → Pipeline</button>
        <button onClick={()=>onDiscard(item)} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 7, color: "#94a3b8", fontSize: 12, padding: "8px", cursor: "pointer" }}>✗ Descartar</button>
        {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ background: "#1e3a5f", border: "none", borderRadius: 7, color: "#93c5fd", fontSize: 12, padding: "8px 12px", textDecoration: "none" }}>↗</a>}
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [tab, setTab] = useState("dash");
  const [kpis, setKpis] = useState(DEFAULT_KPIS);
  const [apps, setApps] = useState([]);
  const [tasksDone, setTasksDone] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [detected, setDetected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState("connecting");
  const [pipeFilter, setPipeFilter] = useState("accessible");

  // Save KPIs to Supabase when they change
  const saveKpis = useCallback((newKpis) => {
    setKpis(newKpis);
    if (dbStatus === "live") {
      sbPatch("kpis_config", "main", {
        meta_total: newKpis.meta_total, servicios_eco: newKpis.servicios_eco,
        grants_int: newKpis.grants_int, proyectos_nac: newKpis.proyectos_nac,
        donaciones: newKpis.donaciones,
        updated_at: new Date().toISOString()
      });
    }
  }, [dbStatus]);

  // Load data from Supabase
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // 1. Load applications + their tasks
        const dbApps = await sbGet("aplicaciones", "select=*");
        const dbTasks = await sbGet("tareas", "select=*");
        const dbScoring = await sbGet("scoring", "select=*");
        const dbFunders = await sbGet("funders", "select=*&grant_promedio_usd=gt.0&condicion_uso=like.ACCESIBLE*&order=nombre");
        const dbDetected = await sbGet("oportunidades_detectadas", "select=*&estado=eq.Por verificar&order=fecha_detectada.desc");
        const dbOpp = await sbGet("oportunidades", "select=*");
        const dbKpis = await sbGet("kpis_config", "select=*&id=eq.main");

        if (dbApps.length > 0) {
          // Load KPIs from Supabase
          if (dbKpis.length > 0) {
            const k = dbKpis[0];
            setKpis({ meta_total: k.meta_total||550, servicios_eco: k.servicios_eco||250, grants_int: k.grants_int||0, proyectos_nac: k.proyectos_nac||0, donaciones: k.donaciones||0 });
          }
          // Build apps with their tasks and scoring
          const builtApps = dbApps.map(a => {
            const appTasks = dbTasks.filter(t => t.aplicacion_id === a.id).map(t => ({
              id: t.id, title: t.titulo_tarea, due: t.fecha_limite,
              weight: t.peso || 2, type: t.titulo_tarea?.includes("⚑") ? "Decisión" : "General",
              isGate: t.titulo_tarea?.includes("⚑") || false, done: t.estado_tarea === "Completada"
            }));
            const opp = dbOpp.find(o => o.id === a.oportunidad_id) || {};
            const scr = dbScoring.find(s => s.oportunidad_id === a.oportunidad_id) || {};
            const funder = dbFunders.find(f => f.id === opp.funder_id) || {};
            return {
              id: a.id, funder: funder.nombre || opp.nombre_programa || "Sin nombre",
              project: a.proyecto_bh || opp.nombre_programa || "", amount: opp.monto_max ? `USD ${Number(opp.monto_max).toLocaleString()}` : "Por definir",
              amountNum: opp.monto_max || 0, priority: "URGENTE", deadline: null,
              language: funder.idioma_aplicacion || "Por verificar", score: scr.alineacion_tematica || 0,
              verified: TODAY, next_step: a.estado_aplicacion || "Verificar", status: a.estado_aplicacion || "Preseleccionada",
              entity: a.entidad_aplicante || "Por definir", url_apply: opp.enlace_convocatoria,
              url_funder: funder.enlace_web, url_info: opp.enlace_convocatoria,
              tooltip: funder.notas || opp.requisitos_minimos || "Ver sitio del funder.",
              hoursEst: a.horas_estimadas_prep || 24, area: opp.areas_bh || "Conservación",
              tasks: appTasks.length > 0 ? appTasks : [{ id: "default", title: "Evaluar elegibilidad", due: "", weight: 2 }]
            };
          });
          setApps(builtApps);
          setTasksDone(builtApps.map(a => a.tasks.map(t => t.done || false)));
          setDbStatus("live");
        } else {
          // Fallback to static data
          setApps(FALLBACK_APPS);
          setTasksDone(FALLBACK_APPS.map(a => a.tasks.map(() => false)));
          setDbStatus("fallback");
        }

        // Build pipeline from accessible funders
        if (dbFunders.length > 0) {
          const pipe = dbFunders.slice(0, 30).map(f => ({
            funder: f.nombre, score: f.grant_promedio_usd > 100000 ? 4.0 : 3.5,
            status: f.condicion_uso?.split('.')[1]?.trim() || "Verificar",
            next_check: "Verificar", language: f.idioma_aplicacion?.includes("Español") ? "ES" : "EN",
            url: f.enlace_web, verified: TODAY, accessible: true,
            tooltip: f.notas || f.condicion_uso || "Ver sitio web."
          }));
          setPipeline(pipe);
        }

        setDetected(dbDetected);
      } catch (e) {
        console.error("Load error:", e);
        setApps(FALLBACK_APPS);
        setTasksDone(FALLBACK_APPS.map(a => a.tasks.map(() => false)));
        setDbStatus("offline");
      }
      setLoading(false);
    }
    load();
  }, []);

  const toggleTask = (ai, ti) => {
    const n = [...tasksDone]; n[ai] = [...n[ai]]; n[ai][ti] = !n[ai][ti]; setTasksDone(n);
    const task = apps[ai]?.tasks[ti];
    if (task?.id && dbStatus === "live") {
      sbPatch("tareas", task.id, { estado_tarea: n[ai][ti] ? "Completada" : "Pendiente" });
    }
  };
  const changeSt = (ai, st) => {
    const n = [...apps]; n[ai] = { ...n[ai], status: st }; setApps(n);
    if (n[ai].id && dbStatus === "live") sbPatch("aplicaciones", n[ai].id, { estado_aplicacion: st });
  };
  const changeEnt = (ai, ent) => {
    const n = [...apps]; n[ai] = { ...n[ai], entity: ent }; setApps(n);
    if (n[ai].id && dbStatus === "live") sbPatch("aplicaciones", n[ai].id, { entidad_aplicante: ent });
  };
  const approveDetected = async (item) => {
    await sbPatch("oportunidades_detectadas", item.id, { estado: "Aprobada", fecha_revisada: new Date().toISOString(), revisado_por: "Chelo" });
    setDetected(prev => prev.filter(d => d.id !== item.id));
  };
  const discardDetected = async (item) => {
    await sbPatch("oportunidades_detectadas", item.id, { estado: "Descartada", fecha_revisada: new Date().toISOString(), revisado_por: "Chelo" });
    setDetected(prev => prev.filter(d => d.id !== item.id));
  };

  const total = kpis.servicios_eco + kpis.grants_int + kpis.proyectos_nac + kpis.donaciones;
  const pct = Math.min(100, Math.round((total / kpis.meta_total) * 100));
  const faltante = Math.max(0, kpis.meta_total - total);
  const sent = apps.filter(a => ["Enviada","En evaluación","Aprobada","Rechazada"].includes(a.status)).length;
  const won = apps.filter(a => a.status === "Aprobada").length;
  const totalOverdue = apps.reduce((s,a,i) => s + a.tasks.filter((t,j)=>!tasksDone[i]?.[j] && t.due && daysBetween(t.due)<0).length, 0);
  const fm = pipeline.filter(m => pipeFilter === "all" ? true : pipeFilter === "accessible" ? m.accessible : !m.accessible);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#020617", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 14 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🔄</div>
        Conectando con Supabase...
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "#e2e8f0", fontFamily: "-apple-system,'Segoe UI',sans-serif" }}>
      <div style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "12px 14px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: "linear-gradient(135deg,#059669,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#fff", flexShrink: 0 }}>B</div>
            <div><div style={{ fontSize: 15, fontWeight: 700 }}>Bioherencia — Oportunidades de Financiamiento</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>
              {dbStatus === "live" ? "🟢 Conectado a Supabase" : dbStatus === "fallback" ? "🟡 Datos de respaldo" : "🔴 Sin conexión"} · {TODAY}
            </div></div>
          </div>
          <div style={{ display: "flex", gap: 2, overflow: "auto" }}>
            {[
              {id:"dash",l:"Dashboard"},
              {id:"apps",l:`Aplicaciones (${apps.length})`},
              {id:"pipe",l:`Pipeline (${pipeline.length})`},
              {id:"detected",l:`Detectadas${detected.length>0?` (${detected.length})`:""}`},
              {id:"fin",l:"Financiero"},
            ].map(t =>
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding: "6px 12px", borderRadius: 7, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", background: tab===t.id?"#3b82f6":"transparent", color: tab===t.id?"#fff":"#64748b", position: "relative" }}>
                {t.l}
                {t.id==="detected"&&detected.length>0&&<span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: 4, background: "#ef4444" }} />}
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 14px 50px", maxWidth: 720, margin: "0 auto" }}>

        {/* Footer roadmap note */}
        {tab === "dash" && <div style={{ background: "#0a1628", borderRadius: 10, border: "1px solid #1e3a5f", padding: "10px 14px", marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: "#60a5fa", fontWeight: 600, marginBottom: 2 }}>v1.0 — Plataforma de Gestión de Grants</div>
          <div style={{ fontSize: 10, color: "#475569" }}>Próximamente: exportar reportes para aliados · CRM de donantes · gestión de ejecución post-grant · notificaciones email de deadlines</div>
        </div>}

        {tab === "dash" && <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 5 }}>
            <EK label="Meta Año 1" value={kpis.meta_total} onChange={v=>saveKpis({...kpis,meta_total:v})} color="#3b82f6" suffix="M" />
            <EK label="Serv. Ecosistémicos" value={kpis.servicios_eco} onChange={v=>saveKpis({...kpis,servicios_eco:v})} color="#22c55e" suffix="M" sub="CarbonX, PSA, REDD+" />
            <EK label="Grants Int." value={kpis.grants_int} onChange={v=>saveKpis({...kpis,grants_int:v})} color="#f97316" suffix="M" />
            <EK label="Proy. Nacionales" value={kpis.proyectos_nac} onChange={v=>saveKpis({...kpis,proyectos_nac:v})} color="#8b5cf6" suffix="M" />
            <EK label="Donaciones" value={kpis.donaciones} onChange={v=>saveKpis({...kpis,donaciones:v})} color="#eab308" suffix="M" sub="Donalo + Biolegacy" />
          </div>
          <div style={{ background: "#0f172a", borderRadius: 10, padding: "10px 12px", border: "1px solid #1e293b", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>{total}M / {kpis.meta_total}M</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: pct>=80?"#22c55e":pct>=50?"#eab308":"#ef4444" }}>{pct}%</span>
            </div>
            <div style={{ height: 8, background: "#1e293b", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 6, width: `${pct}%`, background: "linear-gradient(90deg,#22c55e,#8b5cf6,#f97316)", transition: "width .5s" }} />
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
            <Ind label="Activas" value={apps.filter(a=>!["Rechazada"].includes(a.status)).length} color="#7dd3fc" />
            <Ind label="Enviadas" value={sent} color={sent>0?"#c4b5fd":"#ef4444"} />
            <Ind label="Aprobadas" value={won} color={won>0?"#4ade80":"#64748b"} />
            {totalOverdue>0 && <Ind label="Vencidas" value={totalOverdue} color="#ef4444" sub="⚠" />}
            {detected.length>0 && <Ind label="Nuevas" value={detected.length} color="#f97316" sub="del bot" />}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Aplicaciones activas</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {apps.map((a,i) => <AppCard key={a.id} app={a} tasksDone={tasksDone[i]||[]} onToggleTask={j=>toggleTask(i,j)} onChangeStatus={st=>changeSt(i,st)} onChangeEntity={ent=>changeEnt(i,ent)} />)}
          </div>
        </>}

        {tab === "apps" && <>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Oportunidades ({apps.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {apps.map((a,i) => <AppCard key={a.id} app={a} tasksDone={tasksDone[i]||[]} onToggleTask={j=>toggleTask(i,j)} onChangeStatus={st=>changeSt(i,st)} onChangeEntity={ent=>changeEnt(i,ent)} />)}
          </div>
        </>}

        {tab === "pipe" && <>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Pipeline — Funders Accesibles ({pipeline.length})</div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>Datos vivos desde Supabase. {pipeline.length} funders con grant &gt; 0 y accesibles.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pipeline.map((m,i) => <Tip key={i} text={m.tooltip}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px", background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b" }}>
              <div style={{ width: 34, height: 34, borderRadius: 7, background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#3b82f6", flexShrink: 0 }}>📋</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{m.url?<a href={m.url} target="_blank" rel="noopener noreferrer" style={{ color: "#e2e8f0", textDecoration: "none" }}>{m.funder} ↗</a>:m.funder} <span style={{color:"#3b82f6",fontSize:11}}>ⓘ</span></div>
                <div style={{ fontSize: 10, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.status}</div>
              </div>
              <div style={{ fontSize: 10, padding: "2px 5px", borderRadius: 4, background: m.language==="ES"?"#052e16":"#1e1b4b", color: m.language==="ES"?"#4ade80":"#a5b4fc", fontWeight: 600, flexShrink: 0 }}>{m.language}</div>
            </div></Tip>)}
          </div>
        </>}

        {tab === "detected" && <>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Oportunidades Detectadas por el Bot</div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>El bot busca semanalmente en 16 fuentes (8 Colombia + 8 USA). Aprueba para mover al pipeline o descarta.</div>
          {detected.length === 0 ? (
            <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", padding: 30, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 14, color: "#94a3b8" }}>No hay oportunidades nuevas por revisar</div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>El bot se ejecuta cada lunes. Las nuevas aparecerán aquí.</div>
            </div>
          ) : (
            <div>{detected.map(d => <DetectedCard key={d.id} item={d} onApprove={approveDetected} onDiscard={discardDetected} />)}</div>
          )}
        </>}

        {tab === "fin" && <>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Indicadores Financieros</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
            <Ind label="Pipeline" value={`$${apps.reduce((s,a)=>s+(a.amountNum||0),0).toLocaleString()}`} sub="USD" color="#3b82f6" />
            <Ind label="Enviadas" value={sent} color={sent>0?"#c4b5fd":"#ef4444"} />
            <Ind label="Aprobadas" value={won} color={won>0?"#4ade80":"#64748b"} />
            <Ind label="Funders BD" value={pipeline.length} color="#22c55e" sub="accesibles" />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
            <EK label="Meta Total" value={kpis.meta_total} onChange={v=>saveKpis({...kpis,meta_total:v})} color="#3b82f6" suffix="M" />
            <EK label="Serv. Ecosistémicos" value={kpis.servicios_eco} onChange={v=>saveKpis({...kpis,servicios_eco:v})} color="#22c55e" suffix="M" />
            <EK label="Grants Int." value={kpis.grants_int} onChange={v=>saveKpis({...kpis,grants_int:v})} color="#f97316" suffix="M" />
            <EK label="Proy. Nacionales" value={kpis.proyectos_nac} onChange={v=>saveKpis({...kpis,proyectos_nac:v})} color="#8b5cf6" suffix="M" />
            <EK label="Donaciones" value={kpis.donaciones} onChange={v=>saveKpis({...kpis,donaciones:v})} color="#eab308" suffix="M" />
            <EK label="Faltante" value={faltante} color="#ef4444" suffix="M" editable={false} sub="auto" />
          </div>
          {[{n:"Conservador",g:"2 grants",e:"USD 70K → COP 280M",o:42,c:"#ef4444"},{n:"Base",g:"3-4 grants",e:"USD 195K → COP 780M",o:117,c:"#eab308"},{n:"Optimista",g:"5+ grants",e:"USD 400K → COP 1.6B",o:240,c:"#22c55e"}].map((s,i) =>
            <div key={i} style={{ background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b", padding: "10px 12px", marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}><div><span style={{ fontSize: 13, fontWeight: 700, color: s.c }}>{s.n}</span> <span style={{ fontSize: 11, color: "#94a3b8" }}>{s.g}</span></div><span style={{ fontSize: 13, fontWeight: 700 }}>Overhead: {s.o}M</span></div>
              <div style={{ height: 4, background: "#1e293b", borderRadius: 4, marginTop: 5, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100,faltante>0?(s.o/faltante)*100:100)}%`, background: s.c, borderRadius: 4 }} /></div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{s.e}</div>
            </div>
          )}
        </>}
      </div>
    </div>
  );
}
