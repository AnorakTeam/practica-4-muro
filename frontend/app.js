const API = "__BACKEND_URL__";
const COLORES = ["#c8102e", "#1f6feb", "#2e7d32", "#8e44ad", "#d35400", "#00838f"];

function colorDe(nombre) {
  let suma = 0;
  for (const letra of nombre) suma += letra.codePointAt(0);
  return COLORES[suma % COLORES.length];
}

async function enviarReaccion(id, emoji) {
  if (!id || !emoji) return;
  try {
    const res = await fetch(`${API}/mensajes/${encodeURIComponent(id)}/reaccionar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji })
    });
    if (res.ok) {
      await cargar();
    } else {
      const err = await res.json().catch(() => ({}));
      console.warn("No se pudo registrar la reacción:", err);
    }
  } catch (error) {
    console.error("Error al enviar reacción:", error);
  }
}

async function cargar() {
  if (document.activeElement && document.activeElement.classList.contains("input-teclado")) {
    return;
  }
  try {
    const respuesta = await fetch(API + "/mensajes");
    if (!respuesta.ok) {
      const errorMsg = await respuesta.text().catch(() => "");
      throw new Error(`Error ${respuesta.status}: ${errorMsg.slice(0, 80) || respuesta.statusText}`);
    }
    const datos = await respuesta.json();
    const lista = document.getElementById("lista");
    lista.innerHTML = "";
    for (const m of datos.mensajes) {
      const li = document.createElement("li");
      const inicial = document.createElement("div");
      inicial.className = "inicial";
      inicial.textContent = (m.autor[0] || "?").toUpperCase();
      inicial.style.background = colorDe(m.autor);

      const contenido = document.createElement("div");
      contenido.className = "contenido";

      const autor = document.createElement("div");
      autor.className = "autor";
      autor.textContent = m.autor;

      const cuerpo = document.createElement("div");
      cuerpo.className = "cuerpo";
      cuerpo.textContent = m.texto;

      // Contenedor de reacciones
      const reaccionesWrap = document.createElement("div");
      reaccionesWrap.className = "reacciones-wrap";

      // Ordenar reacciones por cantidad descendente (los mayores primero)
      const ordenadas = Object.entries(m.reacciones || {}).sort((a, b) => b[1] - a[1]);

      for (const [emoji, conteo] of ordenadas) {
        const btnReaccion = document.createElement("button");
        btnReaccion.type = "button";
        btnReaccion.className = "reaccion-btn";
        btnReaccion.title = `Reaccionar con ${emoji} (${conteo})`;
        btnReaccion.innerHTML = `<span>${emoji}</span> <span class="conteo">${conteo}</span>`;
        btnReaccion.onclick = () => enviarReaccion(m.id, emoji);
        reaccionesWrap.append(btnReaccion);
      }

      // Botón para agregar nueva reacción / abrir entrada de emoji desde teclado
      const btnAgregar = document.createElement("button");
      btnAgregar.type = "button";
      btnAgregar.className = "btn-agregar";
      btnAgregar.title = "Elige cualquier emoji desde tu teclado";
      btnAgregar.textContent = "+ 😊";

      btnAgregar.onclick = () => {
        btnAgregar.style.display = "none";

        const inputBox = document.createElement("div");
        inputBox.className = "emoji-input-box";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "input-teclado";
        input.placeholder = "😊";
        input.maxLength = 8;
        input.title = "Escribe o pega cualquier emoji desde tu teclado";

        const btnOk = document.createElement("button");
        btnOk.type = "button";
        btnOk.className = "btn-accion-mini";
        btnOk.textContent = "✓";
        btnOk.title = "Confirmar emoji";

        const btnCancelar = document.createElement("button");
        btnCancelar.type = "button";
        btnCancelar.className = "btn-cancelar-mini";
        btnCancelar.textContent = "✕";
        btnCancelar.title = "Cancelar";

        const confirmar = async () => {
          const val = input.value.trim();
          if (val) {
            await enviarReaccion(m.id, val);
          }
          inputBox.remove();
          btnAgregar.style.display = "";
        };

        btnOk.onclick = confirmar;
        btnCancelar.onclick = () => {
          inputBox.remove();
          btnAgregar.style.display = "";
        };
        input.onkeydown = (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            confirmar();
          } else if (e.key === "Escape") {
            inputBox.remove();
            btnAgregar.style.display = "";
          }
        };

        inputBox.append(input, btnOk, btnCancelar);
        reaccionesWrap.append(inputBox);
        input.focus();
      };

      reaccionesWrap.append(btnAgregar);
      contenido.append(autor, cuerpo, reaccionesWrap);
      li.append(inicial, contenido);
      lista.append(li);
    }
    document.getElementById("estado").textContent = "Respondió la instancia " + datos.instancia;
  } catch (error) {
    document.getElementById("estado").textContent = "No se pudo hablar con el backend: " + error;
  }
}

document.getElementById("enviar").onclick = async () => {
  const boton = document.getElementById("enviar");
  const autor = document.getElementById("autor").value.trim();
  const texto = document.getElementById("texto").value.trim();
  if (!autor || !texto) return;
  boton.disabled = true;
  try {
    await fetch(API + "/mensajes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autor, texto })
    });
    document.getElementById("texto").value = "";
    await cargar();
  } finally {
    boton.disabled = false;
  }
};

// Actualización impulsada por acciones (Action-Driven) con cooldown de 5s para ahorrar lecturas de Firestore
const TIEMPO_COOLDOWN = 5;
let tiempoRestante = 0;
let temporizadorCooldown = null;

async function ejecutarRecargaManual() {
  const btn = document.getElementById("recargar");
  if (btn.disabled || tiempoRestante > 0) return;

  btn.disabled = true;
  await cargar();

  tiempoRestante = TIEMPO_COOLDOWN;
  btn.textContent = `⏳ Espera (${tiempoRestante}s)`;

  temporizadorCooldown = setInterval(() => {
    tiempoRestante--;
    if (tiempoRestante > 0) {
      btn.textContent = `⏳ Espera (${tiempoRestante}s)`;
    } else {
      clearInterval(temporizadorCooldown);
      btn.disabled = false;
      btn.textContent = "🔄 Actualizar muro";
    }
  }, 1000);
}

document.getElementById("recargar").onclick = ejecutarRecargaManual;

// Carga inicial al abrir la página
cargar();
