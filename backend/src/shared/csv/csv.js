// Serializador CSV (RFC 4180) para hojas de cálculo.
// - Separador coma, saltos de línea CRLF, UTF-8 con BOM (Excel muestra bien las tildes).
// - Escapa comillas, separadores y saltos de línea dentro de los campos.
// - Neutraliza "inyección de fórmulas" (OWASP CSV Injection): un texto que
//   empieza por = + - @ (también tras espacios) o por tabulador/retorno se
//   antepone con una comilla simple para que la hoja lo trate como texto.

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
  const lineas = [encabezados, ...filas].map(fila =>
    fila.map(escaparCampo).join(",")
  );

  return BOM_UTF8 + lineas.join("\r\n") + "\r\n";
}
