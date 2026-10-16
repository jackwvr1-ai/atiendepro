// Service worker de la app de pedidos.
//
// A proposito no guarda nada en cache ni intercepta peticiones: la pagina
// siempre se descarga fresca y nunca se queda una version vieja. Existe para
// que la app sea instalable y para mostrar los avisos de pedido nuevo con la
// app cerrada o el telefono bloqueado.
//
// Se registra con alcance /pedidos.html (exactamente la app). Los nombres de
// tienda no pueden llevar punto, asi que no controla la tienda publica, ni el
// panel, ni ninguna otra pagina.

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (evento) {
  evento.waitUntil(self.clients.claim());
});

// Aviso recibido. SIEMPRE se muestra una notificacion: el iPhone quita el
// permiso si llega un aviso y no se muestra nada.
self.addEventListener("push", function (evento) {
  var datos = {};
  try {
    datos = (evento.data && evento.data.json()) || {};
  } catch (e) {
    datos = {};
  }

  var titulo = typeof datos.titulo === "string" && datos.titulo ? datos.titulo : "Nuevo pedido";
  var cuerpo = typeof datos.cuerpo === "string" && datos.cuerpo ? datos.cuerpo : "Abre la app para verlo.";
  var etiqueta = typeof datos.pedido_id === "string" && datos.pedido_id ? datos.pedido_id : "pedidos";

  evento.waitUntil(self.registration.showNotification(titulo, {
    body: cuerpo,
    icon: "/img/pedidos-192.png",
    badge: "/img/pedidos-192.png",
    tag: etiqueta,
    // Siempre abre la app, nunca otra direccion que venga en el mensaje.
    data: { url: "/pedidos.html" }
  }));
});

// Toque en el aviso: si la app ya esta abierta se trae al frente; si no, se abre.
self.addEventListener("notificationclick", function (evento) {
  evento.notification.close();
  var destino = "/pedidos.html";

  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (ventanas) {
      for (var i = 0; i < ventanas.length; i++) {
        var ventana = ventanas[i];
        if (new URL(ventana.url).pathname === destino && "focus" in ventana) {
          return ventana.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(destino);
      }
    })
  );
});
