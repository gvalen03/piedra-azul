import { createSignal, onMount, For } from "solid-js";

const DIAS = ["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO","DOMINGO"];

function DisponibilidadForm() {
  const [medicos, setMedicos] = createSignal([]);
  const [medicoId, setMedicoId] = createSignal("");
  const [diaSemana, setDiaSemana] = createSignal(DIAS[0]);
  const [horaInicio, setHoraInicio] = createSignal("08:00");
  const [horaFin, setHoraFin] = createSignal("12:00");
  const [intervaloMinutos, setIntervaloMinutos] = createSignal(30);
  const [semanasHabilitadas, setSemanasHabilitadas] = createSignal(4);
  const [mensaje, setMensaje] = createSignal("");

  onMount(async () => {
    const res = await fetch("http://localhost:3000/api/medicos");
    setMedicos(await res.json());
  });

  const enviar = async (e) => {
    e.preventDefault();
    setMensaje("");
    try {
      const res = await fetch("http://localhost:3000/api/disponibilidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicoId: Number(medicoId()),
          diaSemana: diaSemana(),
          horaInicio: horaInicio(),
          horaFin: horaFin(),
          intervaloMinutos: Number(intervaloMinutos()),
          semanasHabilitadas: Number(semanasHabilitadas())
        })
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error al guardar");
      setMensaje("Disponibilidad guardada correctamente.");
    } catch (err) {
      setMensaje(err.message);
    }
  };

  return (
    <form onSubmit={enviar}>
      <h2>Configurar disponibilidad</h2>
      <label>Médico
        <select value={medicoId()} onInput={(e) => setMedicoId(e.target.value)} required>
          <option value="">Seleccione...</option>
          <For each={medicos()}>{(m) => <option value={m.id}>{m.nombre} {m.apellido}</option>}</For>
        </select>
      </label>
      <label>Día
        <select value={diaSemana()} onInput={(e) => setDiaSemana(e.target.value)}>
          <For each={DIAS}>{(d) => <option value={d}>{d}</option>}</For>
        </select>
      </label>
      <label>Hora inicio<input type="time" value={horaInicio()} onInput={(e) => setHoraInicio(e.target.value)} /></label>
      <label>Hora fin<input type="time" value={horaFin()} onInput={(e) => setHoraFin(e.target.value)} /></label>
      <label>Intervalo (min)<input type="number" min="1" value={intervaloMinutos()} onInput={(e) => setIntervaloMinutos(e.target.value)} /></label>
      <label>Semanas habilitadas<input type="number" min="1" value={semanasHabilitadas()} onInput={(e) => setSemanasHabilitadas(e.target.value)} /></label>
      <button type="submit">Guardar</button>
      {mensaje() && <p>{mensaje()}</p>}
    </form>
  );
}

export default DisponibilidadForm;