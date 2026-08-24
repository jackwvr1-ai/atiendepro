# CLAUDE-KIOSCOS.md

Contexto del producto **Kiosco** para Claude Code.
Lee este archivo completo antes de escribir código en la rama `feature/kiosks`.

---

## 1. Qué estamos construyendo

**Kiosco es un SaaS independiente.** No es una sección de AtiendePro.

Una plataforma mobile-first donde cualquier persona crea su propio kiosco digital:
sube sus productos, elige un tema, publica y obtiene un enlace y un código QR.
Sus clientes abren el kiosco desde el teléfono, arman su carrito y envían el pedido.
El dueño lo recibe por correo y lo ve en su panel.

Comparte infraestructura con AtiendePro por detrás. **El usuario nunca debe notarlo.**

- No hay botón "Ir a AtiendePro".
- No hay menciones a llamadas, Andrea, cocina ni recepcionista virtual.
- Identidad visual propia.
- Login propio, registro propio, panel propio.

Un usuario de Kiosco debe poder usar el producto sin enterarse jamás de que
AtiendePro existe. Esa integración comercial es una fase futura, no ahora.

**El kiosco es el producto.** Cada función debe responder: *¿hace más fácil crear,
administrar, compartir o comprar desde el kiosco?* Si la respuesta es no, puede esperar.

---

## 2. Regla número uno: no romper AtiendePro

AtiendePro está en producción con clientes reales.

**Nunca toques** estos archivos ni sus tablas:

| Archivo | Qué es |
|---|---|
| `index.html` | Landing de AtiendePro |
| `app.html` | Panel del negocio (4.400 líneas) |
| `cocina.html` | Pantalla de cocina |
| `kiosko.html` | Tablet de autoservicio **en el mostrador** — NO es este proyecto |
| `comando.html` | Consola interna |
| `netlify.toml` · `_redirects` | Configuración del sitio de AtiendePro |

Tablas intocables: `negocios`, `productos`, `pedidos`, `clientes`, `llamadas`,
`llamadas_vivo`, `gastos`, `actividad`, `administradores`, `config_global`.

⚠️ **Cuidado con el nombre.** `kiosko.html` (con K) es la tablet del restaurante y ya
existe en producción. Este proyecto usa siempre **`kiosco`** con C. No los confundas.

---

## 3. Estructura en el repositorio

Todo el producto vive dentro de **una sola carpeta**:

```
/kiosco/
    index.html        → landing de Kiosco
    login.html        → iniciar sesión
    crear-cuenta.html → registro
    recuperar.html    → pedir enlace para restablecer contraseña
    nueva-clave.html  → crear nueva contraseña (llega desde el enlace del correo)
    app.html          → panel del dueño
    ver.html          → kiosco público del cliente final
    netlify.toml      → configuración propia
    _redirects        → rutas propias
    css/
    js/
```

Fuera de `/kiosco/` no se toca nada. Ni un archivo.

Sin build. HTML estático, JavaScript vanilla y Supabase por CDN, igual que el resto
del repositorio. Nada de React, Vue, Tailwind ni empaquetadores.

---

## 4. Direcciones públicas

Kiosco ya está **en producción** en `kiosco.atiendepro.net`, servido por un
**segundo sitio de Netlify** conectado al mismo repositorio, desde la rama
`feature/kiosks`, con carpeta base `kiosco/`.

| Dirección | Archivo |
|---|---|
| `kiosco.atiendepro.net/` | `index.html` |
| `kiosco.atiendepro.net/login` | `login.html` |
| `kiosco.atiendepro.net/crear-cuenta` | `crear-cuenta.html` |
| `kiosco.atiendepro.net/recuperar` | `recuperar.html` |
| `kiosco.atiendepro.net/nueva-clave` | `nueva-clave.html` |
| `kiosco.atiendepro.net/app` | `app.html` |
| `kiosco.atiendepro.net/galletas-maria` | `ver.html` |

`kiosco/_redirects`:
```
/login          /login.html          200
/crear-cuenta   /crear-cuenta.html   200
/recuperar      /recuperar.html      200
/nueva-clave    /nueva-clave.html    200
/app            /app.html            200
/app/*          /app.html            200
/*              /ver.html            200
```

El comodín final va **al último**. Cualquier ruta que no sea una página del sistema
se interpreta como el slug de un kiosco.

### Slugs reservados

Como los kioscos viven en la raíz del subdominio, hay nombres que **no** se pueden
entregar a un usuario. Valida esta lista al crear un kiosco y rechaza el nombre con
un mensaje claro:

```
login, crear-cuenta, recuperar, nueva-clave, app, admin, api, cuenta, panel,
ayuda, soporte, precios, terminos, privacidad, contacto, blog, css, js, img,
assets, static, favicon.ico, robots.txt, sitemap.xml, index, home, k, kiosco,
kiosko, atiendepro, null, undefined, www, mail, ftp
```

---

## 5. Conexión a Supabase

```js
const SUPABASE_URL = 'https://wetpjfpefypgzmcfoxui.supabase.co';
const SUPABASE_ANON = 'sb_publishable_e9LsWcWIJ3O_nmt2oGAJ5Q_JntD51xn';
```

**Storage key de auth: `kiosco-auth`.** Distinto al de AtiendePro (`atiendepro-auth`)
a propósito. Las sesiones de los dos productos nunca deben mezclarse.

En el registro, pasa siempre el destino de retorno explícito:

```js
await sb.auth.signUp({
  email, password,
  options: { emailRedirectTo: 'https://kiosco.atiendepro.net/login' }
});
```

La clave anónima es pública y puede estar en el HTML. **Ninguna otra clave** puede
aparecer en el código: todas viven en Supabase Secrets.

---

## 6. Esquema de base de datos (ya creado y probado)

Tablas propias de Kiosco. No comparten ni una fila con AtiendePro.
Lo único compartido es `auth.users`.

### kioscos
`id` · `dueno_id` (→ auth.users) · `nombre` · `slug` (único) · `descripcion` ·
`logo_url` · `portada_url` · `tema` (`claro` \| `moderno`) ·
`color_acento` (`grafito` \| `rojo` \| `naranja` \| `ambar` \| `verde` \|
`turquesa` \| `azul` \| `violeta` \| `rosa`, por defecto `grafito`) · `moneda` ·
`telefono_contacto` · `whatsapp` · `direccion` · `email_pedidos` ·
`pide_direccion` · `publicado` · `creado_en` · `actualizado_en`

El `slug` valida contra `^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$` — minúsculas,
números y guiones, de 3 a 40 caracteres. Genéralo automáticamente a partir del
nombre del negocio y déjalo editable.

### kiosco_categorias
`id` · `kiosco_id` · `nombre` · `orden` · `activa` · `creado_en`

### kiosco_productos
`id` · `kiosco_id` · `categoria_id` · `nombre` · `descripcion` · `precio` ·
`imagen_url` · `imagen_original_url` · `activo` · `agotado` · `orden` ·
`creado_en` · `actualizado_en`

`agotado` es el interruptor rápido del dueño. **No borra el producto.** Debe ser un
botón grande y visible en la lista, accesible con el pulgar en dos toques.

### kiosco_grupos_opciones
`id` · `producto_id` · `nombre` · `tipo` (`unica` \| `multiple`) · `obligatorio` · `orden`

### kiosco_opciones
`id` · `grupo_id` · `nombre` · `precio_extra` · `disponible` · `orden`

### kiosco_sugeridos
`producto_id` · `sugerido_id` · `orden` — los upsells ("¿quieres agregar café?")

### kiosco_pedidos
`id` · `kiosco_id` · `numero` · `cliente_nombre` · `cliente_telefono` ·
`direccion` · `modalidad` (`recoger` \| `entrega`) · `nota` · `subtotal` ·
`total` · `estado` (`nuevo` \| `visto` \| `completado` \| `cancelado`) · `creado_en`

`numero` se asigna solo por trigger: 1, 2, 3… correlativo por cada kiosco.
Nunca lo mandes desde el navegador.

### kiosco_pedido_items
`id` · `pedido_id` · `producto_id` · `nombre_snapshot` · `opciones` (jsonb) ·
`cantidad` · `precio_unitario` · `total`

`nombre_snapshot` guarda el nombre tal como estaba al momento del pedido. Si el
dueño después renombra o borra el producto, el pedido histórico no se rompe.

---

## 7. Seguridad (RLS ya configurada y verificada)

- El dueño solo ve y edita lo suyo. Garantizado en la base de datos.
- El visitante anónimo solo ve kioscos con `publicado = true`.
- El visitante anónimo **no puede leer** `email_pedidos` ni `dueno_id`. El permiso
  está revocado columna por columna, no escondido en el frontend.
- El visitante anónimo **no tiene acceso** a las tablas de pedidos.

**Por lo tanto el pedido NO se inserta desde el navegador.** Va por una función del
servidor. Ver la siguiente sección.

Nunca confíes en el frontend para la seguridad. Si algo funciona solo porque el
JavaScript lo esconde, está mal hecho.

---

## 8. La función `crear-pedido-kiosco`

El navegador manda solamente: `slug`, datos del cliente y una lista de
`{producto_id, cantidad, opciones[]}`.

La función, con permisos de servidor:

1. Busca el kiosco por slug y verifica que esté publicado.
2. Lee los precios reales **de la base de datos**, nunca del navegador.
3. Verifica que ningún producto esté agotado o inactivo.
4. Calcula subtotal y total en el servidor.
5. Inserta el pedido y sus renglones.
6. Envía el correo al dueño por Resend, desde `kiosco@atiendepro.net` con nombre
   de remitente **"Kiosco"**.
7. Devuelve `{ ok: true, numero, total }`.

Reglas obligatorias de toda función del servidor en este proyecto:
- `verify_jwt: false`
- CORS completo, incluyendo el preflight `OPTIONS`
- Entrypoint `index.ts`
- **Nunca devolver un error HTTP crudo.** Siempre una respuesta JSON entendible.

El correo al dueño no debe mencionar AtiendePro por ninguna parte.

---

## 9. Almacenamiento de imágenes

Bucket **`kioscos`**, público, máximo 8 MB, solo imágenes.

Estructura obligatoria de rutas:
```
{user_id}/{kiosco_id}/logo/...
{user_id}/{kiosco_id}/portada/...
{user_id}/{kiosco_id}/productos/...
{user_id}/{kiosco_id}/originales/...
```

La primera carpeta **debe** ser el `user_id`. La política de almacenamiento lo exige:
si la ruta no empieza así, la subida se rechaza.

Antes de subir una foto de producto, redimensiónala en el navegador con `<canvas>`
a 1080×1080 y conviértela a WebP con calidad 0.82. Guarda también el original en
`originales/`. Sin librerías pesadas para esto.

---

## 10. Cómo debe verse

Mobile-first de verdad. El teléfono es la plataforma principal, no una adaptación.

- Botones de mínimo 48 px de alto. Todo alcanzable con el pulgar de una mano.
- Fotografías grandes. Tipografía clara. Mucho espacio.
- Carrito siempre accesible, fijo abajo.
- Animaciones sutiles, nunca lentas.
- Carga inicial rápida: imágenes en lazy loading, sin dependencias pesadas.
  El usuario final está en Latinoamérica con datos móviles imperfectos.

**Identidad visual propia**, distinta de AtiendePro. AtiendePro es azul corporativo
y bancario. Kiosco por ahora es **blanco y negro**, sin color de marca todavía:
fondo blanco puro, texto casi negro (`#111`), botones negros con texto blanco,
bordes y separadores en gris claro (`#e5e5e5`), texto secundario en gris medio
(`#666`). Sin naranja, sin crema, sin emoji de logo — solo la palabra "Kiosco"
en texto, peso fuerte. Simple y neutro: es para la señora que vende galletas
desde su casa, no para un gerente de operaciones. Un color de marca propio puede
llegar más adelante; no es prioridad ahora.

Dos temas para el kiosco público, nada más: **claro** y **moderno**. Comparten
exactamente la misma estructura de datos; el tema solo cambia CSS. Jamás dupliques
contenido por tema.

El color de acento (`kioscos.color_acento`) es una **paleta cerrada de nueve
colores**, no un selector libre: grafito, rojo, naranja, ámbar, verde,
turquesa, azul, violeta, rosa. Pinta solo botones y detalles de acción
(agregar, carrito, botones de acción); nunca fondos grandes ni el texto de
los productos. El tema sigue mandando sobre fondo, texto y contraste.

---

## 11. Lenguaje

Todo en español. Cálido y directo, sin jerga técnica.

**Nunca** uses en la interfaz: IA, GPT, modelo, LLM, inteligencia artificial, bot,
algoritmo. Si algún día se agrega la mejora de fotos, el botón dice
**"Mejorar foto"** y punto.

Tampoco menciones AtiendePro en ninguna pantalla de Kiosco. Esto aplica dentro
de la aplicación: pantallas, botones, mensajes de error. El dominio del
remitente de los correos (`kiosco@atiendepro.net`) sí es `atiendepro.net` —
eso es infraestructura, no interfaz, y el usuario no lo ve como una mención de
marca porque el nombre de remitente que aparece en su bandeja de entrada es
"Kiosco".

---

## 12. Forma de trabajar

Entregas pequeñas y verificables. Después de cada una, **parar** y probar en
`localhost:8000` antes de seguir:

1. Registro e inicio de sesión → probar
2. Crear kiosco → probar
3. Categorías y productos → probar
4. Subir foto → probar
5. Ver el kiosco público en su dirección → probar
6. Carrito → probar
7. Checkout y pedido → probar
8. Correo al dueño → probar
9. Panel de pedidos → probar
10. QR y compartir → probar

Reglas de ejecución:
- Rama `feature/kiosks`. **Nunca** hagas push a `main`.
- **Nunca** hagas push por tu cuenta. El dueño revisa y sube manualmente.
- Valida todo JavaScript con `node --check` antes de darlo por terminado.
- Entrega archivos completos, nunca fragmentos ni diffs.

---

## 13. Cuando dudes entre dos caminos

**A:** perfecta, enorme, tarda mucho.
**B:** limpia, segura, simple, suficiente para validar.

Elige **B**. Siempre.

Nada de abstracciones prematuras, sistemas genéricos ni infraestructura "por si
acaso". No estamos construyendo Shopify. Estamos construyendo un kiosco que una
señora que vende galletas pueda usar desde su teléfono.

---

## 14. Qué NO construir todavía

Stripe · pasarelas de pago · facturación · contabilidad · punto de venta · pantalla
de cocina · inventario avanzado · reparto avanzado · apps nativas · promociones
complejas · marketplace · puntos · analítica · multi-sucursal · WhatsApp API ·
temas premium · constructor visual libre · dominio personalizado · cualquier
integración con AtiendePro.

---

## 15. Cuándo está listo

Cuando esto funcione de principio a fin:

> Una persona crea su cuenta desde el teléfono, crea su kiosco, agrega productos,
> publica, comparte el QR, un cliente abre el kiosco, hace un pedido, y el dueño
> lo recibe correctamente.

Ese ciclo completo es el producto. Todo lo demás viene después, y solo si tres
usuarios reales lo piden.

---

## 16. Filosofía

> **La idea es que funcione bien, siempre.**

Confiabilidad antes que ingenio. Honestidad antes que apariencia: si no se puede
medir, no se muestra.
