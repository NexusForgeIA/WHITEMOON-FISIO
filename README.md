# WhiteMoon Fisio — demo de clínica de fisioterapia

Demo de WhiteMoon Agencia IA. Clínica **ficticia**: sin precios, cifras, reseñas ni consejo médico.

- HTML/CSS/JS vanilla, GitHub Pages. Frontend heredado de la demo de clínicas dentales (capa holográfica CSS, `holo.js`), paleta verde azulado + terracota.
- Asistente **Sofía** (`assets/js/watio.js`): servicio → día → hora → nombre → teléfono. Guarda en Supabase `leads_web` (`origen='fisio-demo'`, `sector='Fisioterapia'`) y avisa por Telegram con la Edge Function `fisio-notify` (secretos en Supabase Secrets).
- Despliegue: `supabase functions deploy fisio-notify --no-verify-jwt --project-ref mlaqtniujnvfxcvcourm`.
- Fotos: ver `CREDITS.md`. Local: `python3 -m http.server`.
