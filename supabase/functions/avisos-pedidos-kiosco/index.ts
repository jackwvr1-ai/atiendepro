// avisos-pedidos-kiosco
//
// Envia los avisos (Web Push) de la app de pedidos.
//
// Dos modos:
//   {modo:"pedido", pedido_id}  -> lo llama la base de datos (disparador en
//                                  kiosco_pedidos) con el header x-aviso-secreto.
//   {modo:"prueba", kiosco_id}  -> lo llama la app con la sesion del dueño.
//
// Se despliega con verify_jwt = false: todo se valida aqui.
// Siempre responde 200 con JSON {ok, motivo?, ...}. Nunca lanza un error sin atrapar.
// En los logs solo van conteos e ids: nada de nombres, telefonos ni endpoints.

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const ORIGENES = [
  "https://kiosco.atiendepro.net",
  "https://carritogo.atiendepro.net",
  "http://localhost:8001",
  "http://127.0.0.1:8001",
];

const MS_PEDIDO_VIGENTE = 10 * 60 * 1000;
const MS_ESPERA_PRUEBA = 30 * 1000;
const MAX_FALLOS = 20;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const VAPID_PUBLICA = Deno.env.get("VAPID_PUBLICA") ?? "";
const VAPID_PRIVADA = Deno.env.get("VAPID_PRIVADA") ?? "";
const VAPID_CONTACTO = Deno.env.get("VAPID_CONTACTO") ?? "";
const AVISO_SECRETO = Deno.env.get("AVISO_SECRETO") ?? "";

let vapidListo = false;

function cabecerasCors(origen: string | null): Record<string, string> {
  const h: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-aviso-secreto",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (origen && ORIGENES.includes(origen)) {
    h["Access-Control-Allow-Origin"] = origen;
  }
  return h;
}

function responder(origen: string | null, datos: Record<string, unknown>): Response {
  return new Response(JSON.stringify(datos), {
    status: 200,
    headers: { ...cabecerasCors(origen), "Content-Type": "application/json" },
  });
}

// Compara en tiempo constante: se comparan los resumenes SHA-256 de ambos
// textos, asi que ni el contenido ni el largo influyen en el tiempo.
async function igualesSeguro(a: string, b: string): Promise<boolean> {
  const cod = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", cod.encode(a)),
    crypto.subtle.digest("SHA-256", cod.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diferencia = 0;
  for (let i = 0; i < va.length; i++) diferencia |= va[i] ^ vb[i];
  return diferencia === 0;
}

function clienteServicio() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function dinero(valor: unknown, moneda: unknown): string {
  const monto = Number(valor || 0).toFixed(2);
  const codigo = String(moneda || "").trim().toUpperCase();
  // La tienda y la app muestran "$" + 2 decimales. Solo si el negocio usa
  // otra moneda con codigo de 3 letras se agrega el codigo al final.
  if (!codigo || codigo === "$" || codigo === "USD" || codigo === "MXN") return "$" + monto;
  if (/^[A-Z]{3}$/.test(codigo)) return monto + " " + codigo;
  return "$" + monto;
}

function textoModalidad(modalidad: unknown): string {
  return modalidad === "entrega" ? "A domicilio" : "Para recoger";
}

function recortar(texto: unknown, max: number): string {
  const limpio = String(texto || "").replace(/\s+/g, " ").trim();
  return limpio.length > max ? limpio.slice(0, max - 1) + "…" : limpio;
}

type Dispositivo = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  fallos: number | null;
};

type Resultado = { enviados: number; exitos: number; borrados: number };

// Envia el mismo aviso a cada dispositivo y deja la tabla limpia:
// 404/410 se borra; otro error suma un fallo (y a los 20 se borra);
// si sale bien, fallos = 0 y ultimo_envio_en = ahora.
async function enviarATodos(
  // deno-lint-ignore no-explicit-any
  sb: any,
  dispositivos: Dispositivo[],
  payload: Record<string, unknown>,
  opciones: Record<string, unknown>,
): Promise<Resultado> {
  const cuerpo = JSON.stringify(payload);
  const resultado: Resultado = { enviados: dispositivos.length, exitos: 0, borrados: 0 };

  await Promise.all(dispositivos.map(async (d) => {
    try {
      await webpush.sendNotification(
        { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
        cuerpo,
        opciones,
      );
      resultado.exitos++;
      try {
        await sb.from("kiosco_avisos_dispositivos")
          .update({ fallos: 0, ultimo_envio_en: new Date().toISOString() })
          .eq("id", d.id);
      } catch (_e) { /* el aviso ya salio; no importa */ }
    } catch (error) {
      // deno-lint-ignore no-explicit-any
      const codigo = Number((error as any)?.statusCode || 0);
      const fallos = Number(d.fallos || 0) + 1;
      try {
        if (codigo === 404 || codigo === 410 || fallos >= MAX_FALLOS) {
          await sb.from("kiosco_avisos_dispositivos").delete().eq("id", d.id);
          resultado.borrados++;
        } else {
          await sb.from("kiosco_avisos_dispositivos").update({ fallos }).eq("id", d.id);
        }
      } catch (_e) { /* limpieza fallida: se reintenta en el proximo envio */ }
      console.log("aviso fallido", JSON.stringify({ dispositivo: d.id, codigo }));
    }
  }));

  return resultado;
}

async function leerDispositivos(
  // deno-lint-ignore no-explicit-any
  sb: any,
  kioscoId: string,
): Promise<Dispositivo[] | null> {
  const { data, error } = await sb.from("kiosco_avisos_dispositivos")
    .select("id, endpoint, p256dh, auth, fallos, ultimo_envio_en")
    .eq("kiosco_id", kioscoId);
  if (error) return null;
  return data || [];
}

// ---- Modo "pedido" ----

async function modoPedido(req: Request, cuerpo: Record<string, unknown>) {
  const secreto = req.headers.get("x-aviso-secreto") || "";
  if (!AVISO_SECRETO || !(await igualesSeguro(secreto, AVISO_SECRETO))) {
    return { ok: false, motivo: "no_autorizado" };
  }

  const pedidoId = String(cuerpo.pedido_id || "");
  if (!UUID.test(pedidoId)) return { ok: false, motivo: "solicitud_invalida" };

  const sb = clienteServicio();

  const { data: pedido, error: errorPedido } = await sb.from("kiosco_pedidos")
    .select("id, kiosco_id, numero, cliente_nombre, total, modalidad, creado_en")
    .eq("id", pedidoId)
    .maybeSingle();
  if (errorPedido) return { ok: false, motivo: "error_lectura" };
  if (!pedido) return { ok: false, motivo: "sin_pedido" };

  const edad = Date.now() - new Date(pedido.creado_en).getTime();
  if (!(edad <= MS_PEDIDO_VIGENTE)) return { ok: true, motivo: "antiguo" };

  // Antiduplicado: solo el primero que logra guardar el pedido_id envia.
  const { error: errorRegistro } = await sb.from("kiosco_avisos_enviados")
    .insert({ pedido_id: pedidoId });
  if (errorRegistro) {
    if (errorRegistro.code === "23505") return { ok: true, motivo: "ya_enviado" };
    return { ok: false, motivo: "error_registro" };
  }

  const { data: kiosco } = await sb.from("kioscos")
    .select("moneda")
    .eq("id", pedido.kiosco_id)
    .maybeSingle();

  const dispositivos = await leerDispositivos(sb, pedido.kiosco_id);
  if (dispositivos === null) return { ok: false, motivo: "error_lectura" };

  let resultado: Resultado = { enviados: 0, exitos: 0, borrados: 0 };
  if (dispositivos.length) {
    const nombre = recortar(pedido.cliente_nombre, 40) || "Sin nombre";
    resultado = await enviarATodos(sb, dispositivos, {
      titulo: "Nuevo pedido #" + pedido.numero,
      cuerpo: nombre + " · " + dinero(pedido.total, kiosco?.moneda) + " · " + textoModalidad(pedido.modalidad),
      url: "/pedidos.html",
      pedido_id: pedido.id,
    }, {
      TTL: 14400,
      urgency: "high",
      topic: pedido.id.replace(/-/g, ""),
    });
  }

  try {
    await sb.from("kiosco_avisos_enviados")
      .update({ dispositivos: resultado.enviados, exitos: resultado.exitos })
      .eq("pedido_id", pedidoId);
  } catch (_e) { /* solo es el conteo */ }

  console.log("aviso pedido", JSON.stringify({
    pedido: pedidoId, kiosco: pedido.kiosco_id,
    dispositivos: resultado.enviados, exitos: resultado.exitos, borrados: resultado.borrados,
  }));

  return { ok: true, enviados: resultado.enviados, exitos: resultado.exitos };
}

// ---- Modo "prueba" ----

async function modoPrueba(req: Request, cuerpo: Record<string, unknown>) {
  const autorizacion = req.headers.get("authorization") || "";
  const token = autorizacion.toLowerCase().startsWith("bearer ") ? autorizacion.slice(7).trim() : "";
  if (!token) return { ok: false, motivo: "sin_sesion" };

  const publico = createClient(SUPABASE_URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: datosUsuario, error: errorUsuario } = await publico.auth.getUser(token);
  const usuario = datosUsuario?.user;
  if (errorUsuario || !usuario) return { ok: false, motivo: "sin_sesion" };

  const kioscoId = String(cuerpo.kiosco_id || "");
  if (!UUID.test(kioscoId)) return { ok: false, motivo: "no_autorizado" };

  const sb = clienteServicio();

  const { data: kiosco, error: errorKiosco } = await sb.from("kioscos")
    .select("id, dueno_id")
    .eq("id", kioscoId)
    .maybeSingle();
  if (errorKiosco) return { ok: false, motivo: "error_lectura" };
  if (!kiosco || kiosco.dueno_id !== usuario.id) return { ok: false, motivo: "no_autorizado" };

  const dispositivos = await leerDispositivos(sb, kioscoId);
  if (dispositivos === null) return { ok: false, motivo: "error_lectura" };
  if (!dispositivos.length) return { ok: false, motivo: "sin_dispositivos" };

  const ahora = Date.now();
  const reciente = dispositivos.some((d) => {
    // deno-lint-ignore no-explicit-any
    const ultimo = (d as any).ultimo_envio_en;
    return ultimo && ahora - new Date(ultimo).getTime() < MS_ESPERA_PRUEBA;
  });
  if (reciente) return { ok: false, motivo: "espera" };

  const resultado = await enviarATodos(sb, dispositivos, {
    titulo: "Avisos activados",
    cuerpo: "Así te llegarán los pedidos nuevos.",
    url: "/pedidos.html",
  }, {
    TTL: 300,
    urgency: "high",
  });

  console.log("aviso prueba", JSON.stringify({
    kiosco: kioscoId, dispositivos: resultado.enviados, exitos: resultado.exitos, borrados: resultado.borrados,
  }));

  return { ok: true, enviados: resultado.enviados, exitos: resultado.exitos };
}

// ---- Entrada ----

Deno.serve(async (req: Request) => {
  const origen = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: cabecerasCors(origen) });
  }

  try {
    if (req.method !== "POST") return responder(origen, { ok: false, motivo: "solicitud_invalida" });

    if (!VAPID_PUBLICA || !VAPID_PRIVADA || !VAPID_CONTACTO || !SUPABASE_URL || !SERVICE_ROLE) {
      return responder(origen, { ok: false, motivo: "sin_configurar" });
    }
    if (!vapidListo) {
      webpush.setVapidDetails(VAPID_CONTACTO, VAPID_PUBLICA, VAPID_PRIVADA);
      vapidListo = true;
    }

    let cuerpo: Record<string, unknown> = {};
    try {
      const leido = await req.json();
      if (leido && typeof leido === "object") cuerpo = leido as Record<string, unknown>;
    } catch (_e) {
      return responder(origen, { ok: false, motivo: "solicitud_invalida" });
    }

    if (cuerpo.modo === "pedido") return responder(origen, await modoPedido(req, cuerpo));
    if (cuerpo.modo === "prueba") return responder(origen, await modoPrueba(req, cuerpo));
    return responder(origen, { ok: false, motivo: "solicitud_invalida" });
  } catch (error) {
    console.log("error avisos", String((error as Error)?.name || "desconocido"));
    return responder(origen, { ok: false, motivo: "error_interno" });
  }
});
