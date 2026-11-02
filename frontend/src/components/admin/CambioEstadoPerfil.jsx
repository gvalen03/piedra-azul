import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { mensajeConteoCambiado, mensajeDesactivacion, mensajeExito, mensajeReactivacion, resumenCita } from "./desactivacion.js";

// ADM-01: diálogo de confirmación para desactivar o reactivar un médico/paciente.
// Props: tipo ("medicos"|"pacientes"), registro, accion ("desactivar"|"reactivar"),
//        api(path, options) → lanza Error con { status, data }, onClose(), onDone(texto).
export default function CambioEstadoPerfil(props) {
  const desactivar = props.accion === "desactivar";
  const nombre = `${props.registro.nombre} ${props.registro.apellido}`.trim();
  const ruta = `${props.tipo}/${props.registro.id}`;
  const [previa, setPrevia] = createSignal(null);
  const [cargando, setCargando] = createSignal(desactivar);
  const [enviando, setEnviando] = createSignal(false);
  const [error, setError] = createSignal("");
  const [aviso, setAviso] = createSignal("");
  let botonCancelar;

  const texto = () => desactivar
    ? mensajeDesactivacion({ tipo: props.tipo, nombre, cantidad: previa()?.cantidad ?? 0 })
    : mensajeReactivacion({ tipo: props.tipo, nombre });

  const cargarPrevia = async () => {
    setCargando(true); setError("");
    try { setPrevia(await props.api(`${ruta}/desactivacion`)); }
    catch (e) { setError(e.message); }
    finally { setCargando(false); }
  };

  const alTeclear = e => { if (e.key === "Escape" && !enviando()) props.onClose(); };
  onMount(() => {
    document.addEventListener("keydown", alTeclear);
    botonCancelar?.focus(); // el foco inicia en la opción no destructiva
    if (desactivar) cargarPrevia();
  });
  onCleanup(() => document.removeEventListener("keydown", alTeclear));

  const confirmar = async () => {
    setEnviando(true); setError(""); setAviso("");
    try {
      if (desactivar) {
        const cantidadEsperada = previa().cantidad;
        const r = await props.api(`${ruta}/desactivar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cantidadEsperada }) });
        props.onDone(mensajeExito({ tipo: props.tipo, nombre, accion: "desactivar", cantidad: r.cantidadCanceladas }));
      } else {
        await props.api(`${ruta}/reactivar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        props.onDone(mensajeExito({ tipo: props.tipo, nombre, accion: "reactivar" }));
      }
    } catch (e) {
      if (e.status === 409 && e.data?.cantidadActual !== undefined) {
        // El conteo cambió: se muestra el valor actual y se exige una nueva confirmación.
        setPrevia({ ...previa(), cantidad: e.data.cantidadActual, citas: e.data.citas });
        setAviso(mensajeConteoCambiado({ anterior: e.data.cantidadEsperada, actual: e.data.cantidadActual }));
      } else setError(e.message);
    } finally { setEnviando(false); }
  };

  return <div class="admin-dialog-fondo" onClick={e => { if (e.target === e.currentTarget && !enviando()) props.onClose(); }}>
    <div class="admin-dialog" role="alertdialog" aria-modal="true" aria-labelledby="admin-dialog-titulo" aria-describedby="admin-dialog-texto">
      <h2 id="admin-dialog-titulo">{texto().titulo}</h2>
      <Show when={!cargando()} fallback={<p class="admin-help" role="status">Contando las citas pendientes…</p>}>
        <div id="admin-dialog-texto">
          <Show when={!desactivar || previa()}>
            <p class="admin-dialog-resultado">{texto().resultado}</p>
            <p>{texto().conservacion}</p>
            <Show when={desactivar && previa()?.citas?.length}>
              <details open={previa().citas.length <= 5}><summary>Ver las {previa().citas.length} citas</summary>
                <ul class="admin-dialog-citas"><For each={previa().citas}>{c => <li>{resumenCita(c)}</li>}</For></ul></details>
            </Show>
            <Show when={aviso()}><p class="medico-error" role="alert">{aviso()}</p></Show>
            <p><strong>{texto().pregunta}</strong></p>
          </Show>
        </div>
      </Show>
      <Show when={error()}><p class="medico-error" role="alert">{error()}</p></Show>
      <div class="admin-actions">
        <button ref={botonCancelar} type="button" class="medico-outline" disabled={enviando()} onClick={props.onClose}>Cancelar</button>
        <Show when={error() && desactivar && !previa()}><button type="button" class="medico-outline" onClick={cargarPrevia}>Reintentar</button></Show>
        <Show when={!desactivar || previa()}>
          <button type="button" class="btn btn-primary admin-dialog-confirmar" disabled={enviando() || cargando()} onClick={confirmar}>
            {enviando() ? "Procesando…" : desactivar ? (aviso() ? `Confirmar con ${previa().cantidad} ${previa().cantidad === 1 ? "cita" : "citas"}` : "Desactivar") : "Reactivar"}
          </button>
        </Show>
      </div>
    </div>
  </div>;
}
