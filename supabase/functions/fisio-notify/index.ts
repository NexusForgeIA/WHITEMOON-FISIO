import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// fisio-notify — notifica por Telegram un nuevo lead de la demo de
// fisioterapia (WHITEMOON-FISIO). El lead ya se inserta en leads_web desde el
// cliente (origen='fisio-demo'); esta función SOLO envía la notificación vía
// Telegram Bot API, con el token EXCLUSIVAMENTE server-side.
//
// Recibe (POST JSON o text/plain): { nombre, telefono, sector, servicio|motivo, dia, hora, zona, origen }.
// Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
// Despliegue: supabase functions deploy fisio-notify --no-verify-jwt --project-ref mlaqtniujnvfxcvcourm

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(await req.text());
  } catch {
    payload = {};
  }

  const data = (payload.args ?? payload) as Record<string, unknown>;
  const nombre = String(data.nombre ?? "").trim();
  const telefono = String(data.telefono ?? "").trim();
  const sector = String(data.sector ?? "fisioterapia").trim();
  const servicio = String(data.servicio ?? data.motivo ?? "").trim();
  const dia = String(data.dia ?? "").trim();
  const hora = String(data.hora ?? "").trim();
  const zona = String(data.zona ?? "").trim();
  const origen = String(data.origen ?? "fisio-demo").trim();

  if (!nombre || !telefono) {
    return json({ ok: false, error: "lead incompleto" }, 400);
  }

  let message =
    `🔔 Nuevo lead (${origen}) · ${sector}\n` +
    `Nombre: ${nombre || "-"}\n` +
    `Teléfono: ${telefono || "-"}\n` +
    `Servicio: ${servicio || "-"}`;
  if (dia || hora) message += `\nCita pedida: ${dia || "-"} · ${hora || "-"}`;
  if (zona) message += `\nZona: ${zona}`;

  let notified = false;
  try {
    const tgToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const tgChat = Deno.env.get("TELEGRAM_CHAT_ID");
    if (tgToken && tgChat) {
      const r = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: tgChat, text: message }),
      });
      notified = r.ok;
      if (!r.ok) {
        console.warn("[fisio-notify] Telegram falló:", r.status, await r.text());
      }
    } else {
      console.warn("[fisio-notify] sin TELEGRAM_BOT_TOKEN/CHAT_ID, mensaje:", message);
    }
  } catch (e) {
    console.warn("[fisio-notify] error enviando Telegram:", e);
  }

  return json({ ok: true, notified });
});
