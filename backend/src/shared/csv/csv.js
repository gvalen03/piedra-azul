// CSV compatible con hojas de cálculo: UTF-8 con BOM y formato RFC 4180.
// También neutraliza fórmulas para que datos ingresados por usuarios no se
// interpreten como instrucciones al abrir el archivo.
export const BOM_UTF8 = "﻿";

const INICIO_FORMULA = /^\s*[=+\-@]|^[\t\r]/;

export function neutralizarFormula(texto) {
  return INICIO_FORMULA.test(texto) ? `'${texto}` : texto;
}

export function escaparCampo(valor) {
  if (valor === null || valor === undefined) return "";

  const texto = neutralizarFormula(String(valor));

  return /[",\r\n]/.test(texto)
    ? `"${texto.replaceAll('"', '""')}"`
    : texto;
}

export function serializarCsv(encabezados, filas) {
  const lineas = [encabezados, ...filas].map((fila) =>
    fila.map(escaparCampo).join(",")
  );

  return BOM_UTF8 + lineas.join("\r\n") + "\r\n";
}
