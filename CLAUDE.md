# AtiendePro

**"Tu negocio siempre responde."**

Plataforma SaaS para pequeños y medianos negocios: recepcionista virtual que
contesta el teléfono, toma pedidos y los envía directo a la pantalla de cocina,
más kiosko de autopedido y panel de administración.

Sitio en vivo: https://atiendepro.net

---

## Regla número uno: el lenguaje del producto

En **toda** la interfaz visible al usuario, en textos, botones, correos y
mensajes de error, está prohibido mencionar la tecnología.

**Nunca escribir:** IA, inteligencia artificial, GPT, ChatGPT, LLM, modelo,
bot, asistente de IA, Vapi, Gemini, prompt.

**Usar en su lugar:** Recepcionista Virtual, Centro de Atención, Sistema
Automático, Atención 24/7, Pedidos Automáticos.

El dueño del negocio no compra tecnología. Compra una recepcionista que
trabaja 24 horas. La tecnología debe ser invisible.

Esto aplica solo a lo que ve el usuario. En comentarios de código y
documentación técnica se pueden nombrar las herramientas reales.

---

## Segunda regla: confiabilidad sobre ingenio

Filosofía explícita del dueño: **"la idea es que funcione bien, siempre."**

Cuando una función causa problemas reales a un cliente, se **elimina**, no se
parcha con más complejidad. Ya ocurrió: el asistente telefónico agregaba
productos al pedido por su cuenta y generaba totales incorrectos. Se quitó esa
capacidad por completo y se reemplazó por una marca `⚠️ REVISAR` para que una
persona verifique.

Corolario: **si no se puede medir, no se muestra.** Nada de porcentajes de
disponibilidad inventados ni indicadores decorativos. Todo número en pantalla
sale de datos reales.

---

## Cómo trabajar en este repositorio

### El dueño no es programador

Trabaja desde un Chromebook, usa dictado por voz y no lee código. Toda
explicación debe ser en **español, directo, sin jerga técnica**. Explicar el
*qué* y el *por qué*, no el *cómo* interno.

Las palabras dictadas llegan a veces deformadas: "Nelly" es Netlify, "wed" es
web, "ladino" es landing, "gion" es guión.

### Reglas de entrega

- **Archivos completos, nunca fragmentos.** No entregar diffs ni parches
  parciales para que él los pegue. Si un archivo cambia, se entrega entero.
- **Validar antes de entregar.** Correr `node --check` sobre el JavaScript de
  cualquier HTML antes de darlo por listo.
- **Un paso a la vez.** Presentar, esperar aprobación, continuar.
- **Probar en local antes de publicar.** Servidor en el puerto 8000, revisar
  con los ojos, y solo entonces commit y push.

### Publicación

Netlify está conectado a este repositorio, rama `main`.
**Todo push a `main` se publica en atiendepro.net en aproximadamente un minuto.**
No hay proceso de construcción: son archivos HTML puros que Netlify copia tal
cual.

Por eso el paso de revisión local no es opcional.

---

## Estructura

| Archivo | Qué es | Dirección pública |
|---|---|---|
| `index.html` | Página de ventas | `/` |
| `app.html` | Panel del negocio | `/app` |
| `cocina.html` | Pantalla de cocina (KDS) | `/cocina/<negocio>` |
| `kiosko.html` | Kiosko de autopedido | `/kiosko/<negocio>` |
| `comando.html` | Consola interna del creador | `/comando` |
| `img/` | Fotos de la página de ventas | — |
| `_redirects` | Reglas de direcciones limpias | — |
| `netlify.toml` | Configuración de publicación | — |

Las rutas limpias las resuelve Netlify. **En local no existen**: hay que abrir
`/app.html`, `/cocina.html`, `/kiosko.html?k=CLAVE`.

Las imágenes se piden como `img/nombre.jpg`. Deben vivir dentro de la carpeta
`img/`, no sueltas en la raíz.

---

## Entorno de desarrollo

GitHub Codespaces, configurado en `.devcontainer/devcontainer.json`.
Al abrir el Codespace se instala Claude Code y arranca solo un servidor
estático en el puerto **8000** con la caché desactivada.

Si el servidor no está corriendo:

```bash
http-server . -p 8000 -c-1
```

Flujo de trabajo: editar → guardar → refrescar el puerto 8000 → verificar con
los ojos → `git add -A`, `git commit`, `git push`.

---

## Base de datos

Supabase, proyecto `wetpjfpefypgzmcfoxui`.
La clave anónima que aparece en el código HTML es **pública a propósito**;
está protegida por reglas de seguridad a nivel de fila (RLS) en el servidor.

**Las claves privadas (Stripe, Vapi, Resend, Gemini) viven exclusivamente en
Supabase Secrets. Nunca en este repositorio. Nunca subir archivos `.env`.**

### Tablas principales

| Tabla | Para qué |
|---|---|
| `negocios` | Cada cuenta de cliente: datos, horario, guión, suscripción |
| `productos` | Menú de cada negocio: precio, stock, disponibilidad, foto |
| `pedidos` | Órdenes: cliente, items, total, estado, ruta de cocina |
| `llamadas` | Historial telefónico: duración, transcripción, costo |
| `llamadas_vivo` | Llamadas en curso |
| `clientes` | Historial y frecuencia por número de teléfono |
| `actividad` | Bitácora de eventos por negocio |
| `gastos` | Gastos registrados por el negocio |
| `administradores` | Cuentas de acceso; `es_creador` marca al dueño |
| `solicitudes_demo` | Prospectos desde la página de ventas |
| `config_global`, `api_creador` | Configuración interna |

Todas tienen RLS activo.

### Antes de escribir cualquier consulta

Verificar los nombres reales de columnas con `information_schema.columns`.
No asumirlos de memoria: estas tablas han cambiado varias veces.

### Cambios de estructura en tablas activas

Anteponer siempre:

```sql
SELECT set_config('lock_timeout', '3s', false);
```

Sin eso, un `ALTER TABLE` sobre una tabla con suscriptores de Realtime se
queda colgado indefinidamente.

### Probar permisos anónimos

`SET LOCAL role anon` dentro de la consulta reproduce fielmente lo que
experimenta el navegador con la clave pública.

Detalle conocido: un `INSERT ... RETURNING` desde el kiosko necesita también
permiso de SELECT para el rol anónimo.

---

## Funciones del servidor (Supabase Edge Functions)

| Función | Para qué |
|---|---|
| `smart-worker` | Cerebro del asistente telefónico: toma y valida pedidos |
| `hyper-responder` | Recibe eventos de las llamadas |
| `recibir-pedido` | Entrada de pedidos al sistema |
| `gestor-vapi` | Operaciones de la línea telefónica y saldo |
| `asistente-web` | Chat de la página de ventas |
| `crear-suscripcion` | Inicia el cobro mensual |
| `stripe-webhook` | Recibe confirmaciones de pago |
| `solicitud-demo` | Registra prospectos y envía correo |

Reglas al desplegarlas:

- **`verify_jwt: false`** en toda función que reciba llamadas externas
  (Stripe, Vapi, formularios públicos).
- El arreglo `files` usa `name: 'index.ts'` con `entrypoint_path: 'index.ts'`.
- **CORS completo**, incluyendo el manejo de la petición `OPTIONS` previa.
- **Nunca devolver un error HTTP al asistente telefónico.** Siempre responder
  con un `results[]` válido; si se devuelve un error, el asistente entra en un
  bucle infinito.
- `get_logs` de las funciones muestra peticiones HTTP, **no** los `console.log`.
  Para depurar lógica de negocio, usar la transcripción guardada en
  `llamadas.transcripcion`.

---

## Tiempo real

Toda la plataforma se actualiza sola mediante suscripciones de Supabase
Realtime. **Nunca agregar un botón de "actualizar".**

Un pedido nuevo aparece al instante. Una llamada que termina aparece sola. Un
cambio de estado se refleja de inmediato en todas las pantallas.

---

## Cobros

Stripe, en modo real. Cada negocio tiene prueba gratuita y luego plan mensual.

- Esencial: $79/mes
- Completo: $149/mes

Si un negocio deja de pagar, la cuenta queda **suspendida**, nunca se borran
sus datos. La bandera `acceso_libre` exime del cobro a cuentas heredadas.

---

## Diseño

Referencias: Stripe, Linear, Notion, Shopify Admin, Vercel Dashboard.

Minimalista, premium, con aire bancario. Azul oscuro, blanco, gris claro, con
detalles en azul eléctrico. Mucho espacio en blanco, tarjetas amplias, bordes
suaves, sombras ligeras, menú lateral.

Debe parecer software empresarial serio, no una aplicación de moda.

---

## Detalles técnicos que ya costaron tiempo

- El bloque HTML del chat debe ir en el documento **antes** del bloque de
  script. Si el script corre antes de que existan los elementos, falla con
  referencias nulas.
- Modelo de Gemini: usar `gemini-flash-lite-latest`. La variante
  `gemini-2.5-flash-lite` devuelve error 404 con las claves nuevas.
- Al detectar productos pedidos en una transcripción, separar los turnos del
  asistente de los turnos del cliente. Mezclarlos genera pedidos fantasma.
- El costo del modelo afecta directamente la viabilidad del negocio a estos
  precios. Al estimar costos, mostrar siempre los decimales.