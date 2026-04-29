// /api/approve-opportunity.js
// Cuando apruebas una oportunidad detectada, automáticamente crea:
// - oportunidades
// - scoring
// - aplicaciones con tareas iniciales

const SB_URL = process.env.SUPABASE_URL || "https://tphrglqgzvlwpacurbmu.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaHJnbHFnenZsd3BhY3VyYm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODc0NDYsImV4cCI6MjA5MTc2MzQ0Nn0.oWAe4dJesxU4m3Oj1nklOotUt2OGjfuxgeq44j8zcxs";

export const maxDuration = 30;

async function sbGet(table, query = "") {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
  });
  return r.ok ? r.json() : [];
}

async function sbInsert(table, data) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(data)
  });
  return r.ok ? r.json() : null;
}

async function sbUpdate(table, id, data) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return r.ok;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { opp_id } = req.body;

    // 1. Get the detected opportunity
    const detected = await sbGet("oportunidades_detectadas", `id=eq.${opp_id}`);
    if (!detected.length) return res.status(404).json({ error: "Opportunity not found" });

    const opp = detected[0];

    // 2. Generate IDs
    const oppId = `BH-O-${Date.now().toString().slice(-6)}`;
    const appId = `BH-A-${Date.now().toString().slice(-6)}`;
    const scoringId = `BH-S-${Date.now().toString().slice(-6)}`;

    // 3. Create oportunidades record
    const oppRecord = await sbInsert("oportunidades", {
      id: oppId,
      titulo: opp.titulo,
      funder: opp.funder_nombre,
      descripcion: opp.descripcion,
      url: opp.url,
      monto: opp.monto_estimado,
      deadline: opp.deadline,
      idioma: opp.idioma,
      estado: "En evaluación",
      fecha_deteccion: new Date().toISOString(),
      fuente: opp.fuente
    });

    if (!oppRecord) throw new Error("Failed to create opportunity");

    // 4. Create scoring record
    const scoringRecord = await sbInsert("scoring", {
      id: scoringId,
      oportunidad_id: oppId,
      alineacion: 0,
      viabilidad: 0,
      impacto: 0,
      urgencia: 0,
      score_promedio: 0,
      recomendacion: "Por evaluar"
    });

    // 5. Create aplicaciones record with initial tasks
    const appRecord = await sbInsert("aplicaciones", {
      id: appId,
      funder: opp.funder_nombre,
      status: "Preseleccionada",
      briefing: opp.descripcion || "",
      tasks: [
        { id: "T1", title: "Revisar convocatoria completa", due: null, status: "pending" },
        { id: "T2", title: "Evaluar alineación con misión", due: null, status: "pending" },
        { id: "T3", title: "Preparar carta de intención", due: opp.deadline, status: "pending" },
        { id: "T4", title: "Completar aplicación formal", due: opp.deadline, status: "pending" }
      ]
    });

    if (!appRecord) throw new Error("Failed to create application");

    // 6. Mark detected opportunity as aprobada
    await sbUpdate("oportunidades_detectadas", opp_id, {
      estado: "Aprobada",
      fecha_aprobacion: new Date().toISOString()
    });

    // 7. Log the action
    await sbInsert("log_interacciones", {
      id: `BH-L-${Date.now()}`,
      fecha: new Date().toISOString().split("T")[0],
      tipo_interaccion: "Oportunidad aprobada → Aplicación",
      resumen: `${opp.funder_nombre} movida a aplicaciones activas`,
      resultado: `App ${appId} creada con 4 tareas iniciales`
    });

    return res.status(200).json({
      status: "ok",
      message: "Oportunidad aprobada y aplicación creada",
      application_id: appId,
      opportunity_id: oppId
    });

  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
