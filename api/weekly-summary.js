// /api/weekly-summary.js
// Se ejecuta domingos a las 2:10 PM Colombia
// Genera resumen semanal: oportunidades detectadas, aplicaciones aprobadas, tareas completadas

const SB_URL = process.env.SUPABASE_URL || "https://tphrglqgzvlwpacurbmu.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInJlZiI6InRwaHJnbHFnenZsd3BhY3VyYm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODc0NDYsImV4cCI6MjA5MTc2MzQ0Nn0.oWAe4dJesxU4m3Oj1nklOotUt2OGjfuxgeq44j8zcxs";
const RESEND_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "chelojaramillo@gmail.com";

export const maxDuration = 60;

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
  return r.ok;
}

async function sendEmail(subject, html) {
  if (!RESEND_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Bioherencia Reports <onboarding@resend.dev>",
        to: [NOTIFY_EMAIL],
        subject,
        html
      })
    });
  } catch (e) {
    console.error("Email error:", e);
  }
}

export default async function handler(req, res) {
  try {
    console.log("📊 Informe semanal iniciado...");

    // Get this week's data (last 7 days)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];

    // 1. Oportunidades detectadas esta semana
    const detected = await sbGet("oportunidades_detectadas", `select=*&fecha_deteccion=gte.${weekAgoStr}`);
    const approved = detected.filter(d => d.estado === "Aprobada");
    const pending = detected.filter(d => d.estado === "Por verificar");

    // 2. Aplicaciones creadas esta semana
    const apps = await sbGet("aplicaciones", "select=*");

    // 3. Tareas completadas
    const tasks = await sbGet("tareas", "select=*");

    // Build summary
    const summary = {
      semana: `${weekAgoStr} a ${now.toISOString().split("T")[0]}`,
      oportunidades_detectadas: detected.length,
      oportunidades_aprobadas: approved.length,
      oportunidades_por_revisar: pending.length,
      aplicaciones_activas: apps.length,
      tareas_totales: tasks.length,
      tareas_completadas: tasks.filter(t => t.status === "completed").length,
      timestamp: now.toISOString()
    };

    // Build HTML email
    const detectedList = detected.slice(0, 5).map(d =>
      `<tr><td style="padding:8px">${d.titulo}</td><td style="padding:8px">${d.funder_nombre}</td><td style="padding:8px"><span style="background:${d.estado === 'Aprobada' ? '#10b981' : '#f59e0b'};color:white;padding:2px 8px;border-radius:3px;font-size:11px">${d.estado}</span></td></tr>`
    ).join("");

    const html = `
    <div style="font-family:Arial,sans-serif;max-width:700px;color:#333">
      <h1 style="color:#059669;border-bottom:3px solid #059669;padding-bottom:10px">📊 Informe Semanal Bioherencia</h1>
      <p style="color:#666">Período: <strong>${summary.semana}</strong></p>

      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:16px 0">
        <h2 style="color:#059669;margin-top:0">🔍 Búsqueda de Oportunidades</h2>
        <table style="width:100%">
          <tr><td style="padding:8px">Detectadas:</td><td style="padding:8px;font-weight:bold;color:#059669">${summary.oportunidades_detectadas}</td></tr>
          <tr><td style="padding:8px">Aprobadas para evaluar:</td><td style="padding:8px;font-weight:bold;color:#10b981">${summary.oportunidades_aprobadas}</td></tr>
          <tr><td style="padding:8px">Pendientes de revisar:</td><td style="padding:8px;font-weight:bold;color:#f59e0b">${summary.oportunidades_por_revisar}</td></tr>
        </table>
      </div>

      <div style="background:#f0f9ff;border:1px solid #93c5fd;border-radius:8px;padding:16px;margin:16px 0">
        <h2 style="color:#3b82f6;margin-top:0">📋 Aplicaciones</h2>
        <table style="width:100%">
          <tr><td style="padding:8px">Activas:</td><td style="padding:8px;font-weight:bold">${summary.aplicaciones_activas}</td></tr>
          <tr><td style="padding:8px">Tareas completadas:</td><td style="padding:8px;font-weight:bold;color:#10b981">${summary.tareas_completadas} / ${summary.tareas_totales}</td></tr>
        </table>
      </div>

      ${detectedList ? `<div style="margin:16px 0">
        <h3 style="color:#059669">Últimas oportunidades detectadas:</h3>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#f3f4f6"><th style="padding:8px;text-align:left">Oportunidad</th><th style="padding:8px;text-align:left">Funder</th><th style="padding:8px;text-align:left">Estado</th></tr></thead>
          <tbody>${detectedList}</tbody>
        </table>
      </div>` : ''}

      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:16px 0">
        <p style="color:#92400e"><strong>⏭️ Próximas acciones:</strong></p>
        <ul style="color:#92400e">
          <li>Revisar ${summary.oportunidades_por_revisar} oportunidades pendientes</li>
          <li>Completar ${summary.tareas_totales - summary.tareas_completadas} tareas en ejecución</li>
          <li>Siguiente búsqueda automática: mañana a las 1:10 PM</li>
        </ul>
      </div>

      <p style="text-align:center;color:#999;font-size:12px;margin-top:32px">
        <a href="https://bioherencia-grants.vercel.app/" style="color:#059669;text-decoration:none">Ver plataforma completa →</a> | 
        Informe automático de Bioherencia
      </p>
    </div>
    `;

    // Send email
    await sendEmail(
      `📊 Informe Semanal Bioherencia ${summary.semana}`,
      html
    );

    // Store summary in database
    await sbInsert("log_interacciones", {
      id: `BH-L-WEEKLY-${Date.now()}`,
      fecha: new Date().toISOString().split("T")[0],
      tipo_interaccion: "Informe semanal generado",
      resumen: `${summary.oportunidades_detectadas} detectadas, ${summary.oportunidades_aprobadas} aprobadas, ${summary.tareas_completadas} tareas completadas`,
      resultado: "Email enviado a " + NOTIFY_EMAIL
    });

    return res.status(200).json({
      status: "ok",
      message: "Informe semanal generado y enviado",
      summary
    });

  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
