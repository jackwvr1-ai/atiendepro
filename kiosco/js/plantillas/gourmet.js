/* Plantilla Gourmet: solo presentación.
   Agrega elementos visuales (prefijo "g-") a lo que ver.html ya pintó.
   Nunca toca carrito, checkout, pagos, comprobante ni el envío del pedido,
   y nunca quita ni renombra elementos de ver.html. Todo el texto entra con
   textContent, nunca con innerHTML. */
(function () {
  "use strict";

  if (typeof window.registrarPlantilla !== "function") return;

  // Cada tarjeta del menú (vista por categorías y resultados de búsqueda).
  function decorarProducto(fila, producto, info) {
    var datos = info || {};
    var contenedor = fila.querySelector(".info-producto");
    if (!contenedor) return;

    if (producto.descripcion) {
      var descripcion = document.createElement("p");
      descripcion.className = "g-descripcion-producto";
      descripcion.textContent = producto.descripcion;
      contenedor.appendChild(descripcion);
    }

    // No es un botón real: la tarjeta completa ya es tocable y abre el
    // detalle. Este elemento solo lo indica, así un toque nunca cuenta doble.
    var boton = document.createElement("span");
    boton.className = "g-boton-personalizar";
    boton.setAttribute("aria-hidden", "true");
    if (producto.agotado) {
      boton.classList.add("g-deshabilitado");
      boton.textContent = "Agotado";
    } else if (datos.tieneOpciones) {
      boton.textContent = "Personalizar y agregar";
    } else {
      boton.textContent = "Agregar";
    }
    contenedor.appendChild(boton);
  }

  // Marca cada grupo de opciones con su tipo, para que los de selección
  // múltiple muestren casilla cuadrada y los de una sola opción, círculo.
  function marcarTiposGrupo(contenedor, grupos) {
    (grupos || []).forEach(function (grupo) {
      var bloque = document.getElementById("grupo-detalle-" + grupo.id);
      if (!bloque) return;
      bloque.setAttribute("data-g-tipo", grupo.tipo === "multiple" ? "multiple" : "unica");
    });
  }

  // Título grande al inicio de cada sección del menú. Solo con 2 o más
  // secciones (misma regla que los botones de categoría): con una sola, la
  // tienda queda igual. Va dentro de la sección para que el botón de
  // categoría aterrice justo en el título.
  function titularCategoria(seccion, grupo, indice, totalSecciones) {
    if (!seccion || !grupo || totalSecciones < 2) return;
    var titulo = document.createElement("h2");
    titulo.className = "g-titulo-categoria";
    titulo.textContent = grupo.nombre;
    seccion.insertBefore(titulo, seccion.firstChild);
  }

  var LARGO_MAXIMO_HORARIO = 60;

  // Línea de horario que escribe el dueño. Es solo informativa: no dice
  // abierto ni cerrado. Sin texto, no se muestra nada.
  function mostrarHorario(ajustes) {
    if (!ajustes) return;
    var texto = String(ajustes.horario_texto || "").replace(/\s+/g, " ").trim();
    if (!texto) return;
    if (texto.length > LARGO_MAXIMO_HORARIO) texto = texto.slice(0, LARGO_MAXIMO_HORARIO);

    var linea = document.createElement("p");
    linea.className = "g-horario";
    linea.textContent = texto;

    // "Sobre la portada" solo si hay portada; si no, debajo del nombre.
    var portada = document.getElementById("portadaNegocio");
    if (ajustes.horario_posicion === "portada" && portada && !portada.hidden) {
      linea.classList.add("g-horario-portada");
      portada.appendChild(linea);
      return;
    }

    var nombre = document.getElementById("nombreNegocio");
    if (!nombre || !nombre.parentNode) return;
    nombre.parentNode.insertBefore(linea, nombre.nextSibling);
  }

  window.registrarPlantilla("gourmet", {
    producto: decorarProducto,
    gruposDetalle: marcarTiposGrupo,
    categoria: titularCategoria,
    cabecera: mostrarHorario
  });
})();
