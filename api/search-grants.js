// /api/search-grants.js
const SB_URL = process.env.SUPABASE_URL || "https://tphrglqgzvlwpacurbmu.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwaHJnbHFnenZsd3BhY3VyYm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODc0NDYsImV4cCI6MjA5MTc2MzQ0Nn0.oWAe4dJesxU4m3Oj1nklOotUt2OGjfuxgeq44j8zcxs";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
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

async function searchWithClaude(funders) {
  const sourceList = funders.map(f => {
    const entidad = [
      f.acepta_colombia === 'si' ? "Bioherencia (COL)" : "",
      f.acepta_501c3 === 'si' ? "Biolegacy (USA)" : ""
    ].filter(x => x).join(", ");
    const keywords = "conservation,biodiversity,Colombia,Latin America,grants";
    return `- ${f.nombre} (${f.enlace_web}) [${entidad}] keywords: ${keywords}`;
  }).join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{
        role: "user",
        content: `You are a grants research assistant for Fundación Bioherencia. Search CURRENT open grant opportunities from these sources:\n${sourceList}\n\nReturn ONLY a JSON array with title, funder, description, url, amount, deadline, language, entity, relevance (0-100), source. Only include relevance >= 40.`
      }]
    })
  });

  const data = await response.json();
  const textBlocks = (data.content || []).filter(b => b.type === "text");
  const text = textBlocks.map(b => b.text).join("\n");

  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.log("Parse error:", text.substring(0, 200));
    return [];
  }
}

async function sendEmail(subject, html) {
  if (!RESEND_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Bioherencia Bot <onboarding@resend.dev>",
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
    console.log("🔍 Bot iniciado...");

    const sources = await sbGet("funders", "select=id,nombre,enlace_web,acepta_colombia,acepta_501c3");
    console.log(`📋 ${sources.length} fuentes`);

    if (!ANTHROPIC_KEY) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
    }

    const existingDetected = await sbGet("oportunidades_detectadas", "select=titulo,funder_nombre");
    const opportunities = await searchWithClaude(sources);
    console.log(`🔎 ${opportunities.length} detectadas`);

    let inserted = 0;
    const newOpps = [];

    for (const opp of opportunities) {
      if (!opp.title) continue;

      const isDupe = existingDetected.some(d =>
        d.titulo?.toLowerCase().trim() === opp.title?.toLowerCase().trim()
      );
      if (isDupe) continue;

      const record = {
        fuente: opp.source || "Claude Search",
        titulo: opp.title,
        descripcion: opp.description || null,
        url: opp.url || null,
        funder_nombre: opp.funder || "Desconocido",
        monto_estimado: opp.amount || null,
        deadline: opp.deadline || null,
        idioma: opp.language || null,
        entidad_sugerida: opp.entity || "Por definir",
        relevancia_score: opp.relevance || 50,
        palabras_clave: "conservation,biodiversity,Colombia",
        estado: "Por verificar"
      };

      const success = await sbInsert("oportunidades_detectadas", record);
      if (success) {
        inserted++;
        newOpps.push(record);
      }
    }

    if (inserted > 0) {
      const oppList = newOpps.map(o =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>${o.titulo}</strong><br><span style="color:#666">${o.funder_nombre}</span></td><td style="padding:8px">${o.monto_estimado || "?"}</td><td style="padding:8px">${o.deadline || "Abierta"}</td></tr>`
      ).join("");

      await sendEmail(
        `🔍 ${inserted} nueva${inserted > 1 ? "s" : ""} oportunidad${inserted > 1 ? "es" : ""}`,
        `<div style="font-family:Arial,sans-serif;max-width:600px"><h2 style="color:#059669">Nuevas oportunidades</h2><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f8f8f8"><th style="text-align:left;padding:8px">Oportunidad</th><th style="text-align:left;padding:8px">Monto</th><th style="text-align:left;padding:8px">Deadline</th></tr></thead><tbody>${oppList}</tbody></table><p><a href="https://bioherencia-grants.vercel.app/" style="background:#059669;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">Ver en plataforma →</a></p></div>`
      );
    }

    return res.status(200).json({
      status: "ok",
      sources_checked: sources.length,
      opportunities_found: opportunities.length,
      new_inserted: inserted,
      email_sent: inserted > 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
