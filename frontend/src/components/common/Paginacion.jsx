import { Show } from "solid-js";

export default function Paginacion(props) {
  return (
    <Show when={props.totalPaginas > 1}>
      <nav class="paginacion" aria-label={props.etiqueta || "Paginación"}>
        <button
          class="medico-outline"
          type="button"
          disabled={props.pagina <= 1}
          onClick={() => props.onCambiar(props.pagina - 1)}
        >
          Anterior
        </button>

        <span aria-live="polite">
          Página {props.pagina} de {props.totalPaginas}
        </span>

        <button
          class="medico-outline"
          type="button"
          disabled={props.pagina >= props.totalPaginas}
          onClick={() => props.onCambiar(props.pagina + 1)}
        >
          Siguiente
        </button>
      </nav>
    </Show>
  );
}
