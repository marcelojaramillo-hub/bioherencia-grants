// /api/approve-opportunity.js
const SB_URL = process.env.SUPABASE_URL || "https://tphrglqgzvlwpacurbmu.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaHJnbHFnenZsd3BhY3VyYm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODc0NDYsImV4cCI6MjA5MTc2MzQ0Nn0.oWAe4dJesxU4m3Oj1nklOotUt2OGjfuxgeq44j8zcxs";
const HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

export const maxDuration = 30;

async function sbGet(table, query = "") {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, { headers: HEADERS });
  return r.ok ? r.json() : [];
}

async function sbInsert(table, data) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "return=representation" },
    body: JSON.stringify(data)
  });
  const json = await r.json();
  if (!r.ok) throw new Error(`Insert ${table} failed: ${JSON.stringify(json)}`);
  return json;
}

async function sbPatch(table, id, data) {
  await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify(data)
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { opp_id } = req.body;
    if (!opp_id) return res.status(400).json({ error: "opp_id required" });

    // 1. Get the detected opportunity
    const detected = await sbGet("oportunidades_detectadas", `id=eq.${opp_id}`);
    if (!detected.length) return res.status(404).json({ error: "Opportunity not found" });
    const opp = detected[0];

    // 2. Generate IDs
    const ts = Date.now().toString().slice(-6);
    const appId = `BH-A-${ts}`;

    // 3. Create aplicacion using REAL column names
    await sbInsert("aplicaciones", {
      id: appId,
      proyecto_bh: opp.titulo || "Sin título",
      entidad_aplicante: opp.entidad_sugerida || "Por definir",
      estado_aplicacion: "Preseleccionada",
      monto_solicitado: opp.monto_estimado ? parseFloat(String(opp.monto_estimado).replace(/[^0-9.]/g, '')) || null : null,
      moneda_sol: "USD",
      fecha_limite: opp.deadline || null,
      proxima_accion: `Revisar convocatoria: ${opp.titulo}`,
      horas_estimadas_prep: 24,
      nota_revision: `Detectada por bot. Funder: ${opp.funder_nombre}. Relevancia: ${opp.relevancia_score}%`,
      fecha_creacion: new Date().toISOString(),
      fecha_modificacion: new Date().toISOString()
    });

    // 4. Mark detected opportunity as Aprobada
    await sbPatch("oportunidades_detectadas", opp_id, {
      estado: "Aprobada",
      fecha_revisada: new Date().toISOString(),
      revisado_por: "Chelo"
    });

    return res.status(200).json({
      status: "ok",
      message: "Oportunidad aprobada y aplicación creada",
      application_id: appId
    });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
}

