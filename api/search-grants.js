// /api/search-grants.js
// Bot de búsqueda automática de convocatorias para Bioherencia
// Se ejecuta via CRON o manualmente visitando la URL

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

async function sbUpdate(table, id, data) {
  await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(data)
  });
}

async function searchWithClaude(sources) {
  const sourceList = sources.map(s => `- ${s.fuente} (${s.url_monitoreo}) [${s.entidad_objetivo}] keywords: ${s.keywords}`).join("\n");

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
        content: `You are a grants research assistant for Fundación Bioherencia, a Colombian conservation NGO focused on:
- Harpy Eagle (Águila Arpía) monitoring at the Harpy Eagle Reserve in Meta/Macarena region
- Biodiversity conservation in buffer zone of PNN La Macarena
- Community-based conservation in post-conflict territory (PDET municipality)
- They also have a US 501(c)(3) affiliate called Biolegacy

Search for CURRENT open calls for proposals, grants, or funding opportunities from these sources:
${sourceList}

For each opportunity found that is currently open or recently announced, provide:
- title: name of the grant/call
- funder: organization name
- description: 1-2 sentences
- url: direct link
- amount: estimated grant amount
- deadline: if known
- language: application language (English/Spanish)
- entity: which entity should apply (Bioherencia COL / Biolegacy USA / Either)
- relevance: 0-100 score for how relevant this is to Bioherencia's mission
- source: which source from the list above

Return ONLY a JSON array. No markdown, no explanation. If nothing found, return [].
Only include opportunities with relevance >= 40.`
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
  } catch {
    console.log("Could not parse Claude response:", text.substring(0, 200));
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
  // Simple auth check
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && req.query.key !== cronSecret) {
    // Allow without auth if no secret is set (for initial testing)
    if (cronSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    console.log("🔍 Bot de búsqueda iniciado...");

    // 1. Get active sources
    const sources = await sbGet("bot_config", "select=*&activo=eq.true");
    console.log(`📋 ${sources.length} fuentes activas`);

    if (!ANTHROPIC_KEY) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
    }

    // 2. Get existing funders for dedup
    const existingFunders = await sbGet("funders", "select=id,nombre,enlace_web");
    const existingDetected = await sbGet("oportunidades_detectadas", "select=titulo,funder_nombre");

    // 3. Search with Claude
    const opportunities = await searchWithClaude(sources);
    console.log(`🔎 ${opportunities.length} oportunidades encontradas`);

    // 4. Dedup and insert
    let inserted = 0;
    const newOpps = [];

    for (const opp of opportunities) {
      if (!opp.title) continue;

      // Check if already detected
      const isDupe = existingDetected.some(d =>
        d.titulo?.toLowerCase().trim() === opp.title?.toLowerCase().trim() &&
        d.funder_nombre?.toLowerCase().trim() === opp.funder?.toLowerCase().trim()
      );
      if (isDupe) {
        console.log(`⏭️ Ya existe: ${opp.title}`);
        continue;
      }

      // Check if funder exists in DB
      const existingFunder = existingFunders.find(f =>
        f.nombre?.toLowerCase().includes(opp.funder?.toLowerCase()) ||
        opp.funder?.toLowerCase().includes(f.nombre?.toLowerCase())
      );

      const record = {
        fuente: opp.source || "Claude Search",
        titulo: opp.title,
        descripcion: opp.description || null,
        url: opp.url || null,
        funder_nombre: opp.funder || "Desconocido",
        funder_id_existente: existingFunder?.id || null,
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
        console.log(`✅ Nueva: ${opp.title}`);
      }
    }

    // 5. Update last execution for all sources
    for (const src of sources) {
      await sbUpdate("bot_config", src.id, {
        ultima_ejecucion: new Date().toISOString()
      });
    }

    // 6. Send email summary
    if (inserted > 0) {
      const oppList = newOpps.map(o =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee"><strong>${o.titulo}</strong><br><span style="color:#666">${o.funder_nombre}</span></td>
          <td style="padding:8px;border-bottom:1px solid #eee">${o.monto_estimado || "?"}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${o.deadline || "Abierta"}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${o.entidad_sugerida}</td>
          <td style="padding:8px;border-bottom:1px solid #eee"><a href="${o.url || '#'}">Ver</a></td>
        </tr>`
      ).join("");

      await sendEmail(
        `🔍 Bioherencia Bot: ${inserted} nueva${inserted > 1 ? "s" : ""} oportunidad${inserted > 1 ? "es" : ""}`,
        `<div style="font-family:Arial,sans-serif;max-width:600px">
          <h2 style="color:#059669">Bioherencia — Nuevas oportunidades detectadas</h2>
          <p>El bot encontró <strong>${inserted}</strong> nueva${inserted > 1 ? "s" : ""} oportunidad${inserted > 1 ? "es" : ""} de ${sources.length} fuentes consultadas.</p>
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:#f8f8f8">
              <th style="padding:8px;text-align:left">Oportunidad</th>
              <th style="padding:8px;text-align:left">Monto</th>
              <th style="padding:8px;text-align:left">Deadline</th>
              <th style="padding:8px;text-align:left">Entidad</th>
              <th style="padding:8px;text-align:left">Link</th>
            </tr></thead>
            <tbody>${oppList}</tbody>
          </table>
          <p style="margin-top:20px"><a href="https://bioherencia-grants.vercel.app/" style="background:#059669;color:white;padding:10px 20px;border-radius:8px;text-decoration:none">Revisar en la plataforma →</a></p>
          <p style="color:#999;font-size:12px;margin-top:20px">Bot automático · ${new Date().toLocaleDateString('es')} · ${sources.length} fuentes consultadas</p>
        </div>`
      );
    }

    // 7. Log execution
    await sbInsert("log_interacciones", {
      id: `BH-L-BOT-${Date.now()}`,
      fecha: new Date().toISOString().split("T")[0],
      tipo_interaccion: "Monitoreo automático (bot)",
      resumen: `Bot ejecutado. ${sources.length} fuentes. ${opportunities.length} detectadas. ${inserted} nuevas.`,
      resultado: inserted > 0 ? `${inserted} nuevas por revisar` : "Sin novedades"
    });

    const summary = {
      status: "ok",
      sources_checked: sources.length,
      opportunities_found: opportunities.length,
      new_inserted: inserted,
      email_sent: inserted > 0,
      timestamp: new Date().toISOString()
    };

    console.log("📊 Resumen:", JSON.stringify(summary));
    return res.status(200).json(summary);

  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
