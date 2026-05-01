// /api/approve-opportunity.js
const SB_URL = process.env.SUPABASE_URL || "https://tphrglqgzvlwpacurbmu.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaHJnbHFnenZsd3BhY3VyYm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODc0NDYsImV4cCI6MjA5MTc2MzQ0Nn0.oWAe4dJesxU4m3Oj1nklOotUt2OGjfuxgeq44j8zcxs";
const HEADERS = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

export const maxDuration = 30;

async function sbGet(table, query = "") {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, { headers: HEADERS });
  if (!r.ok) throw new Error(`GET ${table} failed: ${r.status}`);
  return r.json();
}

async function sbInsert(table, data) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "return=representation" },
    body: JSON.stringify(data)
  });
  const json = await r.json();
  if (!r.ok) {
    console.error(`INSERT ${table} ERROR:`, JSON.stringify(json));
    console.error(`INSERT ${table} DATA:`, JSON.stringify(data));
    throw new Error(`Insert ${table} failed: ${JSON.stringify(json)}`);
  }
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

    // 1. Get the detected opportunity with ALL fields
    const detected = await sbGet("oportunidades_detectadas", `id=eq.${opp_id}`);
    if (!detected.length) return res.status(404).json({ error: "Opportunity not found" });
    const opp = detected[0];

    // 2. Check for duplicates first
    const existing = await sbGet("aplicaciones", `proyecto_bh=eq.${encodeURIComponent(opp.titulo || "")}&estado_aplicacion=neq.Archivada`);
    if (existing.length > 0) {
      console.log(`⚠️ Duplicado evitado: ${opp.titulo}`);
      await sbPatch("oportunidades_detectadas", opp_id, { estado: "Aprobada", fecha_revisada: new Date().toISOString() });
      return res.status(200).json({ status: "exists", message: "Ya existe aplicación activa", application_id: existing[0].id });
    }

    // 3. Parse monto safely — field could be "USD 25,000" or "25000" or null
    let montoNum = null;
    if (opp.monto_estimado) {
      const parsed = parseFloat(String(opp.monto_estimado).replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed) && parsed > 0) montoNum = parsed;
    }

    // 3. Generate ID
    const appId = `BH-A-${Date.now().toString().slice(-6)}`;

    // 4. Store ALL detected data as structured JSON in nota_revision
    // so App.jsx can read it reliably without regex
    const detectedData = {
      funder: opp.funder_nombre || "Sin nombre",
      titulo: opp.titulo || "Sin título",
      descripcion: opp.descripcion || "",
      monto_original: opp.monto_estimado || null,
      monto_num: montoNum,
      deadline: opp.deadline || null,
      idioma: opp.idioma || "Por verificar",
      entidad: opp.entidad_sugerida || "Por definir",
      relevancia: opp.relevancia_score || 0,
      url: opp.url || null,
      fuente: opp.fuente || null,
      palabras_clave: opp.palabras_clave || null,
      fecha_aprobacion: new Date().toISOString()
    };

    // 5. Insert into aplicaciones with correct column names
    await sbInsert("aplicaciones", {
      id: appId,
      proyecto_bh: opp.titulo || "Sin título",
      entidad_aplicante: opp.entidad_sugerida || "Por definir",
      estado_aplicacion: "Preseleccionada",
      monto_solicitado: montoNum,
      moneda_sol: "USD",
      fecha_limite: opp.deadline || null,
      proxima_accion: `Revisar convocatoria completa: ${opp.funder_nombre || opp.titulo}`,
      horas_estimadas_prep: 24,
      enlace_propuesta: opp.url || null,
      nota_revision: JSON.stringify(detectedData),
      fecha_creacion: new Date().toISOString(),
      fecha_modificacion: new Date().toISOString()
    });

    // 6. Mark detected opportunity as Aprobada
    await sbPatch("oportunidades_detectadas", opp_id, {
      estado: "Aprobada",
      fecha_revisada: new Date().toISOString(),
      revisado_por: "Chelo"
    });

    console.log(`✅ Aprobada: ${opp.titulo} → ${appId}`);
    return res.status(200).json({
      status: "ok",
      message: "Oportunidad aprobada y aplicación creada",
      application_id: appId,
      funder: opp.funder_nombre,
      monto: montoNum
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
