// Service worker de la app de pedidos.
//
// A proposito no guarda nada en cache ni intercepta peticiones: la pagina
// siempre se descarga fresca y nunca se queda una version vieja. Existe solo
// para que la app sea instalable y para dejar lista la puerta a los avisos
// con la app cerrada (fase siguiente).
//
// Se registra con alcance /pedidos/, asi que no controla la tienda publica
// ni el panel.

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (evento) {
  evento.waitUntil(self.clients.claim());
});
