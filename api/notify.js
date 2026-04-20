// /api/notify.js
// Sends email notifications for task assignments, deadlines, and status changes

const RESEND_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "chelojaramillo@gmail.com";

const TEAM_EMAILS = {
  "Chelo": process.env.EMAIL_CHELO || NOTIFY_EMAIL,
  "Marcela": process.env.EMAIL_MARCELA || NOTIFY_EMAIL,
  "Juanca": process.env.EMAIL_JUANCA || NOTIFY_EMAIL,
  "Luis": process.env.EMAIL_LUIS || NOTIFY_EMAIL,
};

async function sendEmail(to, subject, html) {
  if (!RESEND_KEY) return { error: "No RESEND_API_KEY" };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Bioherencia <onboarding@resend.dev>",
      to: Array.isArray(to) ? to : [to],
      subject,
      html
    })
  });
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { type, data } = req.body;

    if (type === "task_assigned") {
      const { assignee, task_title, funder, deadline, app_url } = data;
      const email = TEAM_EMAILS[assignee] || NOTIFY_EMAIL;
      await sendEmail(email,
        `📋 Nueva tarea asignada: ${task_title}`,
        `<div style="font-family:Arial,sans-serif;max-width:500px">
          <h2 style="color:#059669">Tarea asignada</h2>
          <p>Hola <strong>${assignee}</strong>,</p>
          <p>Se te asignó una nueva tarea:</p>
          <div style="background:#f0f9ff;border-left:4px solid #3b82f6;padding:12px 16px;margin:16px 0;border-radius:4px">
            <strong>${task_title}</strong><br>
            <span style="color:#666">Funder: ${funder || "N/A"}</span><br>
            ${deadline ? `<span style="color:#ea580c">Deadline: ${deadline}</span>` : ""}
          </div>
          <p><a href="${app_url || 'https://bioherencia-grants.vercel.app'}" style="background:#059669;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block">Ver en la plataforma →</a></p>
        </div>`
      );
      return res.status(200).json({ sent: true, to: email });
    }

    if (type === "deadline_warning") {
      const { tasks } = data;
      const taskList = tasks.map(t =>
        `<li style="margin-bottom:8px">
          <strong>${t.title}</strong> — ${t.funder}<br>
          <span style="color:#ea580c">${t.days_left <= 0 ? `⚠️ VENCIDA hace ${Math.abs(t.days_left)} días` : `⏰ ${t.days_left} días restantes`}</span>
        </li>`
      ).join("");
      await sendEmail(NOTIFY_EMAIL,
        `⏰ Bioherencia: ${tasks.length} tarea${tasks.length > 1 ? "s" : ""} con deadline próximo`,
        `<div style="font-family:Arial,sans-serif;max-width:500px">
          <h2 style="color:#ea580c">Alertas de deadline</h2>
          <ul style="padding-left:20px">${taskList}</ul>
          <p><a href="https://bioherencia-grants.vercel.app/" style="background:#059669;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block">Revisar en la plataforma →</a></p>
        </div>`
      );
      return res.status(200).json({ sent: true, tasks: tasks.length });
    }

    if (type === "status_change") {
      const { funder, old_status, new_status, changed_by } = data;
      await sendEmail(NOTIFY_EMAIL,
        `📊 Cambio de estado: ${funder} → ${new_status}`,
        `<div style="font-family:Arial,sans-serif;max-width:500px">
          <h2 style="color:#059669">Cambio de estado</h2>
          <p><strong>${funder}</strong></p>
          <p><span style="color:#999">${old_status}</span> → <span style="color:#059669;font-weight:bold">${new_status}</span></p>
          ${changed_by ? `<p style="color:#666">Cambio realizado por: ${changed_by}</p>` : ""}
          <p><a href="https://bioherencia-grants.vercel.app/" style="background:#059669;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block">Ver detalles →</a></p>
        </div>`
      );
      return res.status(200).json({ sent: true });
    }

    return res.status(400).json({ error: "Unknown type. Use: task_assigned, deadline_warning, status_change" });

  } catch (error) {
    console.error("Notification error:", error);
    return res.status(500).json({ error: error.message });
  }
}
