import { createSignal, For, Show } from "solid-js";
export const roles = { ADMINISTRADOR: "Administrador", AGENDADOR: "Agendador", MEDICO_TERAPISTA: "Médico / terapista", PACIENTE: "Paciente" };
const camposPerfil = [
  ["nombre", "Nombre", "text", true, 100], ["apellido", "Apellido", "text", true, 100],
  ["numeroDocumento", "Documento", "text", true, 50], ["email", "Correo electrónico", "email", false, 150],
  ["telefono", "Teléfono", "tel", false, 50]
];
const camposUsuario = [["username", "Usuario", "text", true, 100], ["nombre", "Nombre", "text", true, 100], ["apellido", "Apellido", "text", true, 100], ["numeroDocumento", "Documento", "text", true, 50], ["email", "Correo electrónico", "email", true, 150]];
export default function AdminEditor(props) {
  const registro = props.registro;
  const [datos, setDatos] = createSignal({
    username: registro?.username || "", nombre: registro?.nombre || "", apellido: registro?.apellido || "",
    numeroDocumento: registro?.numero_documento || "", email: registro?.email || "", telefono: registro?.telefono || "",
    fechaNacimiento: registro?.fecha_nacimiento?.slice(0,10) || "", direccion: registro?.direccion || "", eps: registro?.eps || "",
    genero: registro?.genero || "HOMBRE", estado: registro?.estado || "ACTIVO", activo: registro?.activo ?? true,
    rol: registro?.rol || "AGENDADOR", profesionalId: registro?.profesional_id || "", pacienteId: registro?.paciente_id || "", password: ""
  });
  const [error, setError] = createSignal(""), [confirmacion, setConfirmacion] = createSignal(null);
  const cambiar = (key, value) => setDatos({ ...datos(), [key]: value });
  const perfiles = () => datos().rol === "MEDICO_TERAPISTA" ? props.profesionales : props.pacientes;
  const vincular = valor => {
    const key = datos().rol === "MEDICO_TERAPISTA" ? "profesionalId" : "pacienteId";
    const perfil = perfiles().find(p => String(p.id) === valor);
    setDatos({ ...datos(), [key]: valor, ...(!registro && perfil ? { nombre: `${perfil.nombre} ${perfil.apellido}`, email: perfil.email || datos().email } : {}) });
  };
  const guardar = async e => {
    e.preventDefault(); setError("");
    const d = datos(); let payload;
    if (props.tipo === "usuarios") {
      payload = { username: d.username.trim(), nombre: d.nombre.trim(), apellido: d.apellido.trim(), numeroDocumento: d.numeroDocumento.trim(), email: d.email.trim(), rol: d.rol,
        profesionalId: d.rol === "MEDICO_TERAPISTA" && d.profesionalId ? Number(d.profesionalId) : null,
        pacienteId: d.rol === "PACIENTE" && d.pacienteId ? Number(d.pacienteId) : null,
        ...(props.keycloak ? { telefono: d.telefono.trim() || null, fechaNacimiento: d.fechaNacimiento || null, direccion: d.direccion.trim() || null, eps: d.eps.trim() || null, genero: d.genero, tipoProfesional: d.tipoProfesional || "MEDICO" } : { activo: d.activo }),
        ...(d.password ? { password: d.password } : {}) };
    } else {
      payload = { nombre: d.nombre.trim(), apellido: d.apellido.trim(), numeroDocumento: d.numeroDocumento.trim(), email: d.email.trim() || null, telefono: d.telefono.trim() || null };
      if (props.tipo === "profesionales") payload.activo = d.activo;
      else Object.assign(payload, { telefono: d.telefono.trim(), fechaNacimiento: d.fechaNacimiento, direccion: d.direccion.trim() || null, eps: d.eps.trim() || null, genero: d.genero, estado: d.estado });
    }
    if (props.tipo === "usuarios" && props.keycloak && !registro) {
      setConfirmacion(payload);
      return;
    }
    try { await props.onSave(payload); } catch (err) { setError(err.message); }
  };
  const confirmar = async () => {
    try { setError(""); await props.onSave(confirmacion()); } catch (err) { setError(err.message); }
  };
  const resumen = () => {
    const d = confirmacion();
    return [["Usuario", d.username], ["Rol", roles[d.rol]], ["Nombre", `${d.nombre} ${d.apellido}`], ["Documento", d.numeroDocumento], ["Correo", d.email],
      ...(d.pacienteId || d.profesionalId ? [["Perfil", d.pacienteId ? `Paciente #${d.pacienteId}` : `Profesional #${d.profesionalId}`]] : [["Perfil", d.rol === "PACIENTE" ? "Se creará un paciente" : d.rol === "MEDICO_TERAPISTA" ? "Se creará un profesional" : "No requiere perfil clínico"]])];
  };
  return <section class="medico-card admin-editor" aria-labelledby="admin-editor-title"><div class="medico-card-header"><span class="medico-icon" aria-hidden="true">＋</span><div><h2 id="admin-editor-title">{confirmacion() ? "Confirmar creación de cuenta" : `${registro ? "Editar" : "Crear"} ${props.tipo === "usuarios" ? "cuenta de acceso" : props.tipo === "profesionales" ? "profesional" : "paciente"}`}</h2><p>{confirmacion() ? "Revisa los datos antes de crear la cuenta y asignar sus permisos." : "Completa los datos y guarda los cambios."}</p></div></div>
    <Show when={confirmacion()} fallback={<form class="admin-form" onSubmit={guardar}><fieldset disabled={props.busy}>
      <Show when={props.tipo === "usuarios"}><label for="admin-rol">Rol<select id="admin-rol" value={datos().rol} onChange={e => setDatos({ ...datos(), rol: e.currentTarget.value, profesionalId: "", pacienteId: "" })}><For each={Object.entries(roles)}>{([value,label]) => <option value={value}>{label}</option>}</For></select></label>
        <Show when={["PACIENTE", "MEDICO_TERAPISTA"].includes(datos().rol)}><label for="admin-perfil">Perfil vinculado<select id="admin-perfil" required={!props.keycloak} value={datos().rol === "MEDICO_TERAPISTA" ? datos().profesionalId : datos().pacienteId} onChange={e => vincular(e.currentTarget.value)}><option value="">{props.keycloak ? "Crear perfil automáticamente" : "Selecciona un perfil"}</option><For each={perfiles()}>{p => <option value={p.id}>{p.nombre} {p.apellido} · {p.numero_documento}{(p.activo === false || p.estado === "INACTIVO") ? " (inactivo)" : ""}</option>}</For></select></label><p class="admin-help">{props.keycloak ? "Puedes vincular un perfil existente o dejarlo vacío para crearlo junto con la cuenta." : "Si no aparece, crea primero el perfil en la sección correspondiente."}</p></Show>
      </Show>
      <For each={props.tipo === "usuarios" ? camposUsuario : camposPerfil}>{([key,label,type,required,max]) => <label for={`admin-${key}`}>{label}{required || (key === "telefono" && props.tipo === "pacientes") ? " *" : " (opcional)"}<input id={`admin-${key}`} type={type} maxLength={max} required={required || (key === "telefono" && props.tipo === "pacientes")} value={datos()[key]} onInput={e => cambiar(key,e.currentTarget.value)} autocomplete={key === "username" ? "off" : undefined} /></label>}</For>
      <Show when={props.tipo === "usuarios"}><label for="admin-password">{registro ? "Nueva contraseña (dejar vacía para conservar)" : "Contraseña inicial *"}<input id="admin-password" type="password" autocomplete="new-password" minLength="8" maxLength="72" required={!registro} value={datos().password} onInput={e => cambiar("password",e.currentTarget.value)} /></label><p class="admin-help">Mínimo 8 caracteres. Los cambios en una cuenta cierran sus sesiones anteriores.</p></Show>
      <Show when={props.tipo === "pacientes" || (props.tipo === "usuarios" && props.keycloak && datos().rol === "PACIENTE" && !datos().pacienteId)}><label for="admin-nacimiento">Fecha de nacimiento *<input id="admin-nacimiento" type="date" required value={datos().fechaNacimiento} onInput={e => cambiar("fechaNacimiento",e.currentTarget.value)} /></label><label for="admin-genero">Género<select id="admin-genero" value={datos().genero} onChange={e => cambiar("genero",e.currentTarget.value)}><option value="HOMBRE">Hombre</option><option value="MUJER">Mujer</option><option value="OTRO">Otro</option></select></label><label for="admin-direccion">Dirección (opcional)<input id="admin-direccion" maxLength="255" value={datos().direccion} onInput={e => cambiar("direccion",e.currentTarget.value)} /></label><label for="admin-eps">EPS (opcional)<input id="admin-eps" maxLength="150" value={datos().eps} onInput={e => cambiar("eps",e.currentTarget.value)} /></label></Show>
      <Show when={props.tipo === "usuarios" && props.keycloak && datos().rol === "MEDICO_TERAPISTA" && !datos().profesionalId}><label for="admin-tipo-profesional">Tipo de profesional<select id="admin-tipo-profesional" value={datos().tipoProfesional || "MEDICO"} onChange={e => cambiar("tipoProfesional", e.currentTarget.value)}><option value="MEDICO">Médico</option><option value="TERAPISTA">Terapista</option></select></label></Show>
      <Show when={props.tipo !== "usuarios" || !props.keycloak}><label for="admin-estado">Estado<select id="admin-estado" value={props.tipo === "pacientes" ? datos().estado : datos().activo ? "ACTIVO" : "INACTIVO"} onChange={e => props.tipo === "pacientes" ? cambiar("estado",e.currentTarget.value) : cambiar("activo", e.currentTarget.value === "ACTIVO")}><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></label></Show>
      <p class="admin-help">Desactivar bloquea el acceso de la cuenta o del perfil vinculado. Sus citas e historial se conservan.</p>
      <Show when={error()}><p class="medico-error" role="alert">{error()}</p></Show>
      <div class="admin-actions"><button class="btn btn-primary" type="submit">{props.busy ? "Guardando…" : "Guardar cambios"}</button><button class="medico-outline" type="button" onClick={props.onClose}>Cancelar</button></div>
    </fieldset></form>}><div class="admin-confirmation"><dl><For each={resumen()}>{([etiqueta, valor]) => <><dt>{etiqueta}</dt><dd>{valor}</dd></>}</For></dl><p class="admin-help">La contraseña no se muestra ni se almacena en Piedra Azul. Al confirmar se creará o vinculará la cuenta en Keycloak.</p><Show when={error()}><p class="medico-error" role="alert">{error()}</p></Show><div class="admin-actions"><button class="btn btn-primary" type="button" disabled={props.busy} onClick={confirmar}>{props.busy ? "Creando…" : "Confirmar y crear cuenta"}</button><button class="medico-outline" type="button" disabled={props.busy} onClick={() => setConfirmacion(null)}>Volver a editar</button><button class="medico-outline" type="button" disabled={props.busy} onClick={props.onClose}>Cancelar</button></div></div></Show>
  </section>;
}
