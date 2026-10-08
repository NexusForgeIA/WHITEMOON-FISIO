/* WhiteMoon Fisio · comportamiento de la landing: entrada al scroll, menú y chat de Sofía.
   La lógica del chat y el envío del lead (leads_web + fisio-notify) son los de siempre. */
(function () {
'use strict';

document.getElementById('yr').textContent = new Date().getFullYear();
var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Entrada al hacer scroll. Sin IntersectionObserver, todo visible. */
(function reveals() {
  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(els, function (el) { el.classList.add('is-in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  Array.prototype.forEach.call(els, function (el) { io.observe(el); });
})();

/* ==================================================================
   3) AGENTE IA — CHAT "SOFÍA"
   ================================================================== */
(function sofia(){
  var SUPABASE_URL = 'https://mlaqtniujnvfxcvcourm.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_6no6BuOgiA_2nonTJntAuQ_DTqEgrcV';

  var panel = document.getElementById('chat');
  var body  = document.getElementById('chatBody');
  var form  = document.getElementById('chatForm');
  var input = document.getElementById('chatInput');
  var send  = document.getElementById('chatSend');
  var close = document.getElementById('chatClose');

  var SERVICES = ['Valoración inicial','Fisioterapia deportiva','Rehabilitación','Punción seca','Suelo pélvico','Otra consulta'];

  var state = 'service';
  var lead  = { servicio:'', nombre:'', telefono:'' };
  var started = false;

  function scroll(){ body.scrollTop = body.scrollHeight; }

  function bubble(text, who){
    var el = document.createElement('div');
    el.className = 'msg ' + who;
    el.textContent = text;
    body.appendChild(el);
    scroll();
    return el;
  }

  function typing(){
    var el = document.createElement('div');
    el.className = 'typing';
    el.innerHTML = '<i></i><i></i><i></i>';
    body.appendChild(el);
    scroll();
    return el;
  }

  /* mensaje del bot con retardo de "escribiendo" */
  function bot(text, after){
    var t = typing();
    setTimeout(function(){
      t.remove();
      bubble(text, 'bot');
      if (after) after();
    }, reduced ? 120 : 520);
  }

  function options(list, onPick){
    var box = document.createElement('div');
    box.className = 'opts';
    list.forEach(function(label){
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt';
      b.textContent = label;
      b.addEventListener('click', function(){
        box.remove();
        bubble(label, 'me');
        onPick(label);
      });
      box.appendChild(b);
    });
    body.appendChild(box);
    scroll();
  }

  function enableInput(placeholder, type){
    input.disabled = false;
    send.disabled = false;
    input.type = type || 'text';
    input.placeholder = placeholder;
    input.focus();
  }
  function disableInput(placeholder){
    input.disabled = true;
    send.disabled = true;
    input.value = '';
    input.placeholder = placeholder || 'Conversación finalizada';
  }

  function digits(s){ return (s || '').replace(/\D/g, ''); }

  /* ---------- envío del lead ---------- */
  function sendLead(){
    var payload = {
      nombre:   lead.nombre,
      telefono: lead.telefono,
      sector:   'Fisioterapia',
      interes:  lead.servicio,
      mensaje:  'Solicitud de cita vía chat Sofía (demo)',
      origen:   'fisio-demo'
    };

    fetch(SUPABASE_URL + '/rest/v1/leads_web', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    }).catch(function(){ /* la UI nunca se rompe por el envío */ });

    fetch(SUPABASE_URL + '/functions/v1/fisio-notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      },
      body: JSON.stringify({
        nombre:   lead.nombre,
        telefono: lead.telefono,
        sector:   'fisioterapia',
        servicio: lead.servicio,
        origen:   'fisio-demo'
      })
    }).catch(function(){ /* idem */ });
  }

  /* ---------- flujo ---------- */
  function start(){
    if (started) return;
    started = true;
    bot('¡Hola! Soy Sofía, el asistente de WhiteMoon Fisio.', function(){
      bot('¿Qué necesitas?', function(){
        options(SERVICES, function(pick){
          lead.servicio = pick;
          state = 'name';
          bot('Perfecto. ¿Cómo te llamas?', function(){
            enableInput('Tu nombre');
          });
        });
      });
    });
  }

  function handle(text){
    if (state === 'name'){
      if (text.length < 2){
        bot('¿Me dices tu nombre, por favor?');
        return;
      }
      lead.nombre = text;
      state = 'phone';
      disableInput('…');
      bot('Encantada, ' + lead.nombre + '. ¿A qué teléfono te llamamos?', function(){
        enableInput('Tu teléfono', 'tel');
      });
      return;
    }

    if (state === 'phone'){
      var d = digits(text);
      if (d.length < 9){
        bot('Necesito un teléfono válido (9 dígitos o más).');
        return;
      }
      lead.telefono = text.trim();
      state = 'done';
      disableInput('Conversación finalizada');
      sendLead();
      bot('¡Listo, ' + lead.nombre + '! Te llamamos para cerrar tu cita de ' + lead.servicio.toLowerCase() + '.', function(){
        bot('Si prefieres, también puedes llamarnos al 643 199 580.');
      });
    }
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    bubble(text, 'me');
    input.value = '';
    handle(text);
  });

  /* el chat se abre desde los CTA [data-chat] (cabecera, hero, secciones y botón flotante) */
  var lastTrigger = null;
  var fab = document.getElementById('chatFab');

  function open(trigger){
    if (trigger) lastTrigger = trigger;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    if (fab) fab.hidden = true;
    start();
  }
  function shut(){
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    if (fab) fab.hidden = false;
    if (lastTrigger) lastTrigger.focus();
  }

  close.addEventListener('click', shut);
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && panel.classList.contains('open')) shut();
  });
  document.querySelectorAll('[data-chat]').forEach(function(el){
    el.setAttribute('aria-haspopup', 'dialog');
    el.setAttribute('aria-controls', 'chat');
    el.addEventListener('click', function(e){ e.preventDefault(); open(el); });
  });
})();

})();
