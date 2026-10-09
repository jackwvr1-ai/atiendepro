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

  window.registrarPlantilla("gourmet", {
    producto: decorarProducto,
    gruposDetalle: marcarTiposGrupo
  });
})();
