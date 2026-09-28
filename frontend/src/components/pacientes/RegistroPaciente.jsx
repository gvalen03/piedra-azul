import { createSignal, For, Show } from "solid-js";
import { apiJson } from "../../services/api-json.js";
const campos = [
  ["nombre", "Nombre", "text", true, 100], ["apellido", "Apellido", "text", true, 100],
  ["numeroDocumento", "Documento", "text", true, 50], ["fechaNacimiento", "Fecha de nacimiento", "date", true],
  ["telefono", "Teléfono", "tel", true, 50], ["email", "Correo electrónico", "email", false, 150],
  ["direccion", "Dirección", "text", false, 255], ["eps", "EPS", "text", false, 150]
];
export default function RegistroPaciente(props) {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  const [errorFecha, setErrorFecha] = createSignal("");
  const cambiarCampo = (key, input) => {
    setDatos({ ...datos(), [key]: input.value });
    if (key === "fechaNacimiento") {
      const mensaje = input.value && input.value > hoy ? "La fecha de nacimiento no puede ser posterior a hoy." : "";
      setErrorFecha(mensaje);
      input.setCustomValidity(mensaje);
    }
  };
  const [datos, setDatos] = createSignal({ nombre:"", apellido:"", numeroDocumento: props.documento || "", fechaNacimiento:"", telefono:"", email:"", direccion:"", eps:"", genero:"HOMBRE" });
  const [guardando, setGuardando] = createSignal(false), [error,setError] = createSignal("");
  const guardar = async e => {
    e.preventDefault(); if (guardando() || errorFecha()) return;
    setGuardando(true); props.onBusy?.(true); setError("");
    try {
      const payload = Object.fromEntries(Object.entries(datos()).map(([key,value]) => [key, value.trim() || (["email", "direccion", "eps"].includes(key) ? null : "")]));
      const paciente = await apiJson("/pacientes", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      props.onRegistered?.(paciente);
    } catch(e) { setError(e.message); } finally { setGuardando(false); props.onBusy?.(false); }
  };
  return <section class="citas-card"><div class="citas-card-heading"><span class="citas-icon" aria-hidden="true">＋</span><div><h2>Registrar paciente</h2><p>Al guardar, quedará seleccionado para agendar su cita.</p></div></div><form class="agendador-form" onSubmit={guardar}><fieldset disabled={guardando()}><div class="citas-fields"><For each={campos}>{([key,label,type,required,max]) => <label for={`registro-${key}`}>{label}{required ? " *" : " (opcional)"}<input id={`registro-${key}`} class="form-input" required={required} type={type} maxLength={max} max={key === "fechaNacimiento" ? hoy : undefined} aria-invalid={key === "fechaNacimiento" && !!errorFecha()} aria-describedby={key === "fechaNacimiento" && errorFecha() ? "registro-fecha-error" : undefined} value={datos()[key]} onInput={e => cambiarCampo(key, e.currentTarget)} />
        <Show when={key === "fechaNacimiento" && errorFecha()}><span id="registro-fecha-error" class="registro-fecha-error" role="alert">{errorFecha()}</span></Show>
      </label>}</For><label for="registro-genero">Género<select id="registro-genero" class="form-input" value={datos().genero} onChange={e => setDatos({ ...datos(), genero:e.currentTarget.value })}><option value="HOMBRE">Hombre</option><option value="MUJER">Mujer</option><option value="OTRO">Otro</option></select></label></div><p class="citas-agenda-note">Este registro crea el perfil del paciente. El administrador puede vincularlo después con una cuenta de acceso.</p><Show when={error()}><p class="citas-notice is-error" role="alert">{error()}</p></Show><div class="agendador-actions"><button type="submit" class="btn btn-primary">{guardando() ? "Registrando…" : "Guardar y agendar"}</button><button type="button" class="btn citas-btn-outline" onClick={props.onCancel}>Volver a citas</button></div></fieldset></form></section>;
}
