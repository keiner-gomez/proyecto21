(function(){
  // ----- Estado -----
  const NOMBRES = { trabajo:"Trabajo", descanso:"Descanso corto", largo:"Descanso largo" };
  const defecto = { trabajo:25, descanso:5, largo:15 };
  let config = Object.assign({}, defecto);
  try {
    const g = JSON.parse(localStorage.getItem("pomodoro-config") || "null");
    if (g) config = Object.assign(config, g);
  } catch(e) {}

  const estado = { tipo:"trabajo", restante:0, total:0, corriendo:false, fin:0, completadas:0, id:null };

  // ----- Elementos -----
  const $ = id => document.getElementById(id);
  const elTiempo=$("tiempo"), elEstado=$("estado"), elProg=$("progreso"),
        elInicio=$("inicio"), elCont=$("contador"), elAviso=$("aviso");
  const tabs = document.querySelectorAll(".tab");
  const inputs = { trabajo:$("c-trabajo"), descanso:$("c-descanso"), largo:$("c-largo") };

  // ----- Sonido (Web Audio, sin archivos externos) -----
  function sonar(){
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, .3, .6].forEach(t => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(.25, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + t + .25);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + .26);
      });
    } catch(e) {}
  }

  // ----- Vista -----
  function formato(s){
    const m = Math.floor(s/60), r = s % 60;
    return String(m).padStart(2,"0") + ":" + String(r).padStart(2,"0");
  }
  function pintar(){
    elTiempo.textContent = formato(estado.restante);
    elEstado.textContent = NOMBRES[estado.tipo];
    elCont.textContent = estado.completadas;
    elProg.style.width = (100 * (1 - estado.restante / estado.total)) + "%";
    elInicio.textContent = estado.corriendo ? "Pausar"
      : (estado.restante < estado.total ? "Continuar" : "Iniciar");
    document.title = (estado.corriendo ? formato(estado.restante) + " · " : "") + NOMBRES[estado.tipo];
    document.body.className = estado.tipo === "trabajo" ? "" : estado.tipo;
    tabs.forEach(t => t.setAttribute("aria-pressed", t.dataset.tipo === estado.tipo));
  }

  // ----- Lógica -----
  function cargar(tipo){
    detener();
    estado.tipo = tipo;
    estado.total = estado.restante = config[tipo] * 60;
    pintar();
  }
  function detener(){
    clearInterval(estado.id);
    estado.corriendo = false;
  }
  function tick(){
    estado.restante = Math.max(0, Math.round((estado.fin - Date.now()) / 1000));
    if (estado.restante === 0) return terminar();
    pintar();
  }
  function iniciar(){
    estado.fin = Date.now() + estado.restante * 1000;
    estado.corriendo = true;
    estado.id = setInterval(tick, 250);
    pintar();
  }
  function alternar(){
    if (estado.corriendo) { detener(); pintar(); } else iniciar();
  }
  function terminar(){
    sonar();
    let siguiente;
    if (estado.tipo === "trabajo") {
      estado.completadas++;
      siguiente = estado.completadas % 4 === 0 ? "largo" : "descanso";
    } else siguiente = "trabajo";
    elAviso.textContent = "Terminó la sesión. Sigue: " + NOMBRES[siguiente] + ".";
    cargar(siguiente);
  }

  // ----- Eventos -----
  elInicio.addEventListener("click", alternar);
  $("reiniciar").addEventListener("click", () => cargar(estado.tipo));
  tabs.forEach(t => t.addEventListener("click", () => cargar(t.dataset.tipo)));

  Object.keys(inputs).forEach(k => {
    inputs[k].value = config[k];
    inputs[k].addEventListener("change", () => {
      let v = parseInt(inputs[k].value, 10);
      if (!v || v < 1) v = defecto[k];
      config[k] = v; inputs[k].value = v;
      try { localStorage.setItem("pomodoro-config", JSON.stringify(config)); } catch(e) {}
      if (!estado.corriendo && k === estado.tipo) cargar(k);
    });
  });

  // Atajo de teclado: barra espaciadora para iniciar o pausar
  document.addEventListener("keydown", e => {
    if (e.code === "Space" && !/INPUT|BUTTON|SUMMARY/.test(e.target.tagName)) {
      e.preventDefault(); alternar();
    }
  });

  cargar("trabajo");
})();
