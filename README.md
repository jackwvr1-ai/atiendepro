# AtiendePro

**Tu negocio siempre responde.**

Plataforma de recepcionista virtual, pedidos automaticos, kiosko de
autopedido y pantalla de cocina para restaurantes y comercios.

Sitio en vivo: https://atiendepro.net

---

## Archivos

| Archivo | Que es | Direccion publica |
|---|---|---|
| `index.html` | Pagina de ventas (landing) | `/` |
| `app.html` | Panel del negocio | `/app` |
| `cocina.html` | Pantalla de cocina (KDS) | `/cocina/<negocio>` |
| `kiosko.html` | Kiosko de autopedido | `/kiosko/<negocio>` |
| `comando.html` | Consola de operaciones (interna) | `/comando` |
| `img/` | Fotos de la pagina de ventas | — |
| `_redirects` | Reglas de direcciones limpias | — |
| `netlify.toml` | Configuracion de publicacion | — |

## Como se publica

Netlify esta conectado a este repositorio.
**Cada cambio guardado aqui se publica solo en atiendepro.net** en
aproximadamente un minuto. No hay que arrastrar archivos nunca mas.

## Importante

- No hay proceso de construccion: son archivos HTML puros.
- La clave de Supabase que aparece en el codigo es **publica a proposito**
  (esta protegida por reglas de seguridad en el servidor). Las claves
  privadas viven solo en Supabase y Netlify, nunca aqui.
- Nunca subir archivos `.env` ni claves privadas a este repositorio.

## Base de datos y funciones

Supabase: proyecto `wetpjfpefypgzmcfoxui`
Las funciones del servidor (pedidos, llamadas, pagos, correos) se
administran desde el panel de Supabase, no desde este repositorio.
