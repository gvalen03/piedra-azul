import { createSignal, createMemo, onMount, For, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { useAuth } from "../../stores/auth.store.js";
import { apiFetch } from "../../services/api.js";
import AdminEditor, { roles } from "../../components/admin/AdminEditor.jsx";
import "../../styles/modules/medico.css";
import "../../styles/modules/admin.css";
const secciones = { usuarios: "Usuarios", medicos: "Médicos", pacientes: "Pacientes" };
const activo = r => r.activo ?? r.estado === "ACTIVO";
export default function AdminPage() {
  const auth = useAuth(), navigate = useNavigate();
  const [tipo,setTipo] = createSignal("usuarios"), [datos,setDatos] = createSignal({ usuarios: [], medicos: [], pacientes: [] });
  const [busqueda,setBusqueda] = createSignal(""), [estado,setEstado] = createSignal(""), [rol,setRol] = createSignal("");
  const [editor,setEditor] = createSignal(null), [busy,setBusy] = createSignal(false), [error,setError] = createSignal(""), [mensaje,setMensaje] = createSignal("");
  const [listo,setListo] = createSignal(false);
  const visibles = createMemo(() => datos()[tipo()].filter(r =>
    (!estado() || activo(r) === (estado() === "ACTIVO")) &&
    (tipo() !== "usuarios" || !rol() || r.rol === rol()) &&
    `${r.nombre} ${r.apellido || ""} ${r.username || ""} ${r.numero_documento || ""} ${r.email || ""}`.toLocaleLowerCase().includes(busqueda().trim().toLocaleLowerCase())
  ));
  const api = async (path, options) => {
    const res = await apiFetch(`/admin/${path}`, options); const data = await res.json();
    if (!res.ok) throw new Error(res.status === 401 ? "Tu sesión debe renovarse. Cierra sesión e ingresa nuevamente." : data.message || data.error || "No se pudo completar la operación");
    return data;
  };
  const cargar = async () => {
    const respuestas = await Promise.all(Object.keys(secciones).map(async key => [key, await api(key)]));
    setDatos(Object.fromEntries(respuestas)); setListo(true);
  };
  const actualizar = async () => {
    if (busy()) return; setBusy(true); setError("");
    try { await cargar(); } catch(e) { setError(e.message); } finally { setBusy(false); }
  };
  onMount(actualizar);
  const cambiar = key => { setTipo(key); setEditor(null); setBusqueda(""); setEstado(""); setRol(""); setMensaje(""); };
  const guardar = async payload => {
    if (busy()) return; setBusy(true); setMensaje("");
    try {
      const id = editor().registro?.id;
      await api(`${tipo()}${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setEditor(null); setMensaje(id ? "Cambios guardados correctamente." : "Registro creado correctamente.");
      try { await cargar(); } catch (e) { setError(`El registro se guardó, pero no se pudo actualizar el listado. ${e.message}`); }
    } finally { setBusy(false); }
  };
  const perfilNombre = r => {
    const perfil = r.rol === "MEDICO_TERAPISTA" ? datos().medicos.find(m => String(m.id) === String(r.medico_id)) : r.rol === "PACIENTE" ? datos().pacientes.find(p => String(p.id) === String(r.paciente_id)) : null;
    return perfil ? `${perfil.nombre} ${perfil.apellido}` : "Sin perfil asociado";
  };
  return <div class="medico-page admin-page"><header class="medico-topbar"><div class="medico-container medico-topbar-inner"><A class="medico-brand" href="/admin"><span aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" /></svg></span>PiedraAzul</A><div class="medico-account"><span>{auth.user()?.nombre}<small>Administración</small></span><button class="medico-outline" disabled={busy()} onClick={() => { auth.cerrarSesion(); navigate("/", { replace:true }); }}>Cerrar sesión</button></div></div></header>
    <main class="medico-container medico-main"><div class="medico-heading"><div><span class="medico-eyebrow">ATENCIÓN Y BIENESTAR</span><h1>Administración</h1><p>Organiza cada encuentro, cuida cada detalle.</p></div><span class="medico-label">Gestión de personas y accesos</span></div>
      <div class="medico-stats"><For each={Object.entries(secciones)}>{([key,label]) => <div class="medico-stat"><span>{label} activos</span><strong>{listo() ? datos()[key].filter(activo).length : "—"}</strong><small>{listo() ? `${datos()[key].length} registros en total` : "Consultando registros"}</small></div>}</For></div>
      <nav class="medico-tabs" aria-label="Secciones de administración"><For each={Object.entries(secciones)}>{([key,label]) => <button class="medico-outline" disabled={busy()} aria-pressed={tipo() === key} onClick={() => cambiar(key)}>{label}</button>}</For></nav>
      <Show when={error()}><div class="medico-error" role="alert">{error()}<button class="medico-outline" disabled={busy()} onClick={actualizar}>Reintentar</button></div></Show>
      <Show when={mensaje()}><p class="admin-success" role="status">{mensaje()}</p></Show>
      <Show when={busy()}><p class="admin-help" role="status">Procesando…</p></Show>
      <div classList={{ "admin-grid": true, "admin-grid-editor": !!editor() }}>
        <section class="medico-card"><div class="medico-card-header"><span class="medico-icon" aria-hidden="true">☷</span><div><h2>{secciones[tipo()]}</h2><p>{tipo() === "usuarios" ? "Gestiona las cuentas y sus permisos." : "Crea los perfiles antes de vincular sus cuentas."}</p></div></div>
          <div class="admin-list-body"><div class="admin-actions"><button class="btn btn-primary" disabled={busy() || !listo()} onClick={() => setEditor({ registro:null })}>Crear {tipo() === "usuarios" ? "usuario" : tipo() === "medicos" ? "médico" : "paciente"}</button><button class="medico-outline" disabled={busy()} onClick={actualizar}>Actualizar</button></div>
            <div class="admin-filters"><label for="admin-buscar">Buscar<input id="admin-buscar" type="search" placeholder="Nombre, correo, usuario o documento" value={busqueda()} onInput={e => setBusqueda(e.currentTarget.value)} /></label><label for="admin-filtro-estado">Estado<select id="admin-filtro-estado" value={estado()} onChange={e => setEstado(e.currentTarget.value)}><option value="">Todos</option><option value="ACTIVO">Activos</option><option value="INACTIVO">Inactivos</option></select></label><Show when={tipo() === "usuarios"}><label for="admin-filtro-rol">Rol<select id="admin-filtro-rol" value={rol()} onChange={e => setRol(e.currentTarget.value)}><option value="">Todos los roles</option><For each={Object.entries(roles)}>{([value,label]) => <option value={value}>{label}</option>}</For></select></label></Show></div>
            <Show when={listo() && !visibles().length}><p class="medico-empty">No hay registros que coincidan con la búsqueda.</p></Show>
            <ul class="admin-list"><For each={visibles()}>{r => <li><div class="admin-record"><div><strong>{r.nombre} {r.apellido || ""}</strong><small>{tipo() === "usuarios" ? `${r.username} · ${roles[r.rol]}` : `Documento: ${r.numero_documento}`}</small><small>{r.email || "Sin correo registrado"}</small><Show when={tipo() === "usuarios" && ["MEDICO_TERAPISTA", "PACIENTE"].includes(r.rol)}><small>Perfil: {perfilNombre(r)}</small></Show></div><span class={`medico-badge ${activo(r) ? "estado-atendida" : "estado-cancelada"}`}>{activo(r) ? "Activo" : "Inactivo"}</span></div><Show when={tipo() !== "usuarios" || Number(r.id) !== Number(auth.user()?.usuarioId)} fallback={<small class="admin-help">Tu cuenta actual</small>}><button class="medico-outline" disabled={busy()} onClick={() => setEditor({ registro:r })}>Editar</button></Show></li>}</For></ul>
          </div></section>
        <Show keyed when={editor()}>{ed => <AdminEditor tipo={tipo()} registro={ed.registro} medicos={datos().medicos} pacientes={datos().pacientes} busy={busy()} onSave={guardar} onClose={() => setEditor(null)} />}</Show>
      </div>
      <footer class="medico-footer">PiedraAzul · Atención y bienestar</footer>
    </main>
  </div>;
}
