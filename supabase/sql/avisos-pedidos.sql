-- ============================================================================
-- Avisos de pedido nuevo con la app cerrada (Web Push)
--
-- SOLO DOCUMENTACION. Este archivo no se ejecuta desde el repositorio.
-- Cada bloque lo aplica el equipo en Supabase, con aprobacion del dueño.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- B1 (YA APLICADO)
-- Las dos tablas, con RLS, politicas y permisos.
-- Se deja aqui como referencia de lo que existe. Si hay diferencias, manda lo
-- que esta en la base: verificar con information_schema.columns y pg_policies.
-- ----------------------------------------------------------------------------
--
-- create table public.kiosco_avisos_dispositivos (
--   id              uuid primary key default gen_random_uuid(),
--   kiosco_id       uuid not null references public.kioscos(id) on delete cascade,
--   endpoint        text not null unique,
--   p256dh          text not null,
--   auth            text not null,
--   agente          text,
--   fallos          int  not null default 0,
--   creado_en       timestamptz not null default now(),
--   actualizado_en  timestamptz not null default now(),
--   ultimo_envio_en timestamptz
-- );
-- alter table public.kiosco_avisos_dispositivos enable row level security;
--
-- -- El dueño solo lee, agrega, cambia y borra las de su negocio.
-- create policy ... for select to authenticated using (public.kiosco_es_mio(kiosco_id));
-- create policy ... for insert to authenticated with check (public.kiosco_es_mio(kiosco_id));
-- create policy ... for update to authenticated using (public.kiosco_es_mio(kiosco_id))
--                                               with check (public.kiosco_es_mio(kiosco_id));
-- create policy ... for delete to authenticated using (public.kiosco_es_mio(kiosco_id));
--
-- revoke all on public.kiosco_avisos_dispositivos from public, anon, authenticated;
-- grant select, insert, update, delete on public.kiosco_avisos_dispositivos to authenticated;
--
-- create table public.kiosco_avisos_enviados (
--   pedido_id    uuid primary key references public.kiosco_pedidos(id) on delete cascade,
--   enviado_en   timestamptz not null default now(),
--   dispositivos int,
--   exitos       int
-- );
-- alter table public.kiosco_avisos_enviados enable row level security;  -- sin politicas
-- revoke all on public.kiosco_avisos_enviados from public, anon, authenticated;
-- -- Solo la usa la funcion avisos-pedidos-kiosco con service role.


-- ----------------------------------------------------------------------------
-- B2 (TODAVIA NO APLICADO)
-- Disparador al insertar en kiosco_pedidos. Queda APAGADO hasta B3: sin el
-- secreto en la boveda no hace nada.
--
-- Por que no puede frenar un pedido:
--   * corre despues de guardar el pedido;
--   * net.http_post solo deja la peticion en una cola: no espera respuesta,
--     y si el pedido no llega a guardarse, la peticion se descarta;
--   * cualquier error queda atrapado por el bloque exception.
-- ----------------------------------------------------------------------------

create or replace function public.kiosco_aviso_pedido_nuevo()
returns trigger language plpgsql security definer
set search_path = public, extensions
as $$
declare v_secreto text;
begin
  begin
    select decrypted_secret into v_secreto
      from vault.decrypted_secrets where name = 'aviso_pedidos_secreto' limit 1;
    if coalesce(v_secreto, '') = '' then return new; end if;
    perform net.http_post(
      url := 'https://wetpjfpefypgzmcfoxui.supabase.co/functions/v1/avisos-pedidos-kiosco',
      body := jsonb_build_object('modo','pedido','pedido_id', new.id),
      headers := jsonb_build_object('Content-Type','application/json','x-aviso-secreto', v_secreto),
      timeout_milliseconds := 5000);
  exception when others then
    raise warning 'aviso de pedido no enviado: %', sqlerrm;
  end;
  return new;
end $$;

revoke all on function public.kiosco_aviso_pedido_nuevo() from public, anon, authenticated;

set lock_timeout = '3s';
drop trigger if exists kiosco_pedidos_aviso on public.kiosco_pedidos;
create trigger kiosco_pedidos_aviso after insert on public.kiosco_pedidos
  for each row execute function public.kiosco_aviso_pedido_nuevo();


-- ----------------------------------------------------------------------------
-- B3 (ENCENDER)
-- <AVISO_SECRETO> es un marcador. El valor real lo pone el equipo al
-- ejecutarlo y debe ser identico al secreto AVISO_SECRETO de la funcion.
-- Nunca escribir el valor real en este archivo.
-- ----------------------------------------------------------------------------
--
-- select vault.create_secret('<AVISO_SECRETO>', 'aviso_pedidos_secreto', 'Avisos de pedidos');


-- ----------------------------------------------------------------------------
-- APAGAR (inmediato, sin borrar nada mas)
-- ----------------------------------------------------------------------------
--
-- delete from vault.secrets where name = 'aviso_pedidos_secreto';
--
-- Quitar el disparador por completo:
-- set lock_timeout = '3s';
-- drop trigger if exists kiosco_pedidos_aviso on public.kiosco_pedidos;
