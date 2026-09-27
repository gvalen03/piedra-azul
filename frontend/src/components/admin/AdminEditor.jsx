import { createSignal, For, Show } from "solid-js";
export const roles = { ADMINISTRADOR: "Administrador", AGENDADOR: "Agendador", MEDICO_TERAPISTA: "Médico / terapista", PACIENTE: "Paciente" };
const camposPerfil = [
  ["nombre", "Nombre", "text", true, 100], ["apellido", "Apellido", "text", true, 100],
  ["numeroDocumento", "Documento", "text", true, 50], ["email", "Correo electrónico", "email", false, 150],
  ["telefono", "Teléfono", "tel", false, 50]
];
const camposUsuario = [["username", "Usuario", "text", true, 100], ["nombre", "Nombre para mostrar", "text", true, 150], ["email", "Correo electrónico", "email", true, 150]];
export default function AdminEditor(props) {
  const registro = props.registro;
  const [datos, setDatos] = createSignal({
    username: registro?.username || "", nombre: registro?.nombre || "", apellido: registro?.apellido || "",
    numeroDocumento: registro?.numero_documento || "", email: registro?.email || "", telefono: registro?.telefono || "",
    fechaNacimiento: registro?.fecha_nacimiento?.slice(0,10) || "", direccion: registro?.direccion || "", eps: registro?.eps || "",
    genero: registro?.genero || "HOMBRE", estado: registro?.estado || "ACTIVO", activo: registro?.activo ?? true,
    rol: registro?.rol || "AGENDADOR", medicoId: registro?.medico_id || "", pacienteId: registro?.paciente_id || "", password: ""
  });
  const [error, setError] = createSignal("");
  const cambiar = (key, value) => setDatos({ ...datos(), [key]: value });
  const perfiles = () => datos().rol === "MEDICO_TERAPISTA" ? props.medicos : props.pacientes;
  const vincular = valor => {
    const key = datos().rol === "MEDICO_TERAPISTA" ? "medicoId" : "pacienteId";
    const perfil = perfiles().find(p => String(p.id) === valor);
    setDatos({ ...datos(), [key]: valor, ...(!registro && perfil ? { nombre: `${perfil.nombre} ${perfil.apellido}`, email: perfil.email || datos().email } : {}) });
  };
  const guardar = async e => {
    e.preventDefault(); setError("");
    const d = datos(); let payload;
    if (props.tipo === "usuarios") {
      payload = { username: d.username.trim(), nombre: d.nombre.trim(), email: d.email.trim(), rol: d.rol, activo: d.activo,
        medicoId: d.rol === "MEDICO_TERAPISTA" ? Number(d.medicoId) : null,
        pacienteId: d.rol === "PACIENTE" ? Number(d.pacienteId) : null,
        ...(d.password ? { password: d.password } : {}) };
    } else {
      payload = { nombre: d.nombre.trim(), apellido: d.apellido.trim(), numeroDocumento: d.numeroDocumento.trim(), email: d.email.trim() || null, telefono: d.telefono.trim() || null };
      if (props.tipo === "medicos") payload.activo = d.activo;
      else Object.assign(payload, { telefono: d.telefono.trim(), fechaNacimiento: d.fechaNacimiento, direccion: d.direccion.trim() || null, eps: d.eps.trim() || null, genero: d.genero, estado: d.estado });
    }
    try { await props.onSave(payload); } catch (err) { setError(err.message); }
  };
  return <section class="medico-card admin-editor" aria-labelledby="admin-editor-title"><div class="medico-card-header"><span class="medico-icon" aria-hidden="true">＋</span><div><h2 id="admin-editor-title">{registro ? "Editar" : "Crear"} {props.tipo === "usuarios" ? "usuario" : props.tipo === "medicos" ? "médico" : "paciente"}</h2><p>Completa los datos y guarda los cambios.</p></div></div>
    <form class="admin-form" onSubmit={guardar}><fieldset disabled={props.busy}>
      <Show when={props.tipo === "usuarios"}><label for="admin-rol">Rol<select id="admin-rol" value={datos().rol} onChange={e => setDatos({ ...datos(), rol: e.currentTarget.value, medicoId: "", pacienteId: "" })}><For each={Object.entries(roles)}>{([value,label]) => <option value={value}>{label}</option>}</For></select></label>
        <Show when={["PACIENTE", "MEDICO_TERAPISTA"].includes(datos().rol)}><label for="admin-perfil">Perfil vinculado<select id="admin-perfil" required value={datos().rol === "MEDICO_TERAPISTA" ? datos().medicoId : datos().pacienteId} onChange={e => vincular(e.currentTarget.value)}><option value="">Selecciona un perfil</option><For each={perfiles()}>{p => <option value={p.id}>{p.nombre} {p.apellido} · {p.numero_documento}{(p.activo === false || p.estado === "INACTIVO") ? " (inactivo)" : ""}</option>}</For></select></label><p class="admin-help">Si no aparece, crea primero el perfil en la sección de médicos o pacientes. Cada perfil puede vincularse a una sola cuenta.</p></Show>
      </Show>
      <For each={props.tipo === "usuarios" ? camposUsuario : camposPerfil}>{([key,label,type,required,max]) => <label for={`admin-${key}`}>{label}{required || (key === "telefono" && props.tipo === "pacientes") ? " *" : " (opcional)"}<input id={`admin-${key}`} type={type} maxLength={max} required={required || (key === "telefono" && props.tipo === "pacientes")} value={datos()[key]} onInput={e => cambiar(key,e.currentTarget.value)} autocomplete={key === "username" ? "off" : undefined} /></label>}</For>
      <Show when={props.tipo === "usuarios"}><label for="admin-password">{registro ? "Nueva contraseña (dejar vacía para conservar)" : "Contraseña inicial *"}<input id="admin-password" type="password" autocomplete="new-password" minLength="8" maxLength="72" required={!registro} value={datos().password} onInput={e => cambiar("password",e.currentTarget.value)} /></label><p class="admin-help">Mínimo 8 caracteres. Los cambios en una cuenta cierran sus sesiones anteriores.</p></Show>
      <Show when={props.tipo === "pacientes"}><label for="admin-nacimiento">Fecha de nacimiento *<input id="admin-nacimiento" type="date" required value={datos().fechaNacimiento} onInput={e => cambiar("fechaNacimiento",e.currentTarget.value)} /></label><label for="admin-genero">Género<select id="admin-genero" value={datos().genero} onChange={e => cambiar("genero",e.currentTarget.value)}><option value="HOMBRE">Hombre</option><option value="MUJER">Mujer</option><option value="OTRO">Otro</option></select></label><label for="admin-direccion">Dirección (opcional)<input id="admin-direccion" maxLength="255" value={datos().direccion} onInput={e => cambiar("direccion",e.currentTarget.value)} /></label><label for="admin-eps">EPS (opcional)<input id="admin-eps" maxLength="150" value={datos().eps} onInput={e => cambiar("eps",e.currentTarget.value)} /></label></Show>
      <label for="admin-estado">Estado<select id="admin-estado" value={props.tipo === "pacientes" ? datos().estado : datos().activo ? "ACTIVO" : "INACTIVO"} onChange={e => props.tipo === "pacientes" ? cambiar("estado",e.currentTarget.value) : cambiar("activo", e.currentTarget.value === "ACTIVO")}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></label>
      <p class="admin-help">Desactivar bloquea el acceso de la cuenta o del perfil vinculado. Sus citas e historial se conservan.</p>
      <Show when={error()}><p class="medico-error" role="alert">{error()}</p></Show>
      <div class="admin-actions"><button class="btn btn-primary" type="submit">{props.busy ? "Guardando…" : "Guardar cambios"}</button><button class="medico-outline" type="button" onClick={props.onClose}>Cancelar</button></div>
    </fieldset></form>
  </section>;
}
