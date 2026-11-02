# SEC-01 y SEC-02 - revisión ZAP, mitigación y retest

**Proyecto:** Piedra Azul  
**Issues:** #18 (SEC-01) y #19 (SEC-02)  
**Fecha:** 2 de noviembre de 2026  
**Entorno autorizado:** API local Fastify y PostgreSQL local; no se consultó producción ni se usaron datos personales reales.

## Alcance y herramientas

- OWASP ZAP 2.17.0, escaneo pasivo y activo contra `http://127.0.0.1:3000`.
- Reproducciones manuales con `curl` contra una instancia temporal actualizada en `http://127.0.0.1:3001`.
- `npm audit` para dependencias de producción.

ZAP descubrió cuatro URL públicas (raíz, barra final, `robots.txt` y `sitemap.xml`). El aviso de contenido cacheable correspondía a respuestas 404 y se clasifica como informativo; no se contabiliza como vulnerabilidad.

## Hallazgo SEC-01-01 - CORS permisivo

| Campo | Resultado |
|---|---|
| Clasificación | OWASP Top 10 2021 A05 - Security Misconfiguration |
| Severidad inicial | Media |
| Evidencia inicial | ZAP activo detectó `Access-Control-Allow-Origin` reflejando un origen aleatorio; la reproducción manual obtuvo la misma cabecera para `https://attacker.example`. |
| Impacto | Un origen no confiable podía recibir permiso CORS. Con Bearer tokens el navegador no adjunta la credencial automáticamente, pero la configuración ampliaba innecesariamente la superficie si existía una ruta pública sensible o un token comprometido. |
| Mitigación | `loadCorsOptions` acepta solo `CORS_ORIGINS`; en producción la lista es obligatoria, sin comodines ni rutas, y `credentials` permanece desactivado. |
| Retest manual | `Origin: http://localhost:5173` recibe `Access-Control-Allow-Origin`; `Origin: https://attacker.example` no recibe esa cabecera. |
| Estado residual | Mitigado; el retest ZAP activo no reportó alertas. |

## Hallazgo SEC-01-02 - intentos de login sin límite

| Campo | Resultado |
|---|---|
| Clasificación | OWASP Top 10 2021 A07 - Identification and Authentication Failures |
| Severidad inicial | Media |
| Evidencia inicial | Doce solicitudes sintéticas inválidas consecutivas a `POST /api/auth/login` respondieron 401; no hubo 429 ni bloqueo. |
| Impacto | Facilitaba ataques automatizados de adivinación de contraseñas contra cuentas conocidas. |
| Mitigación | Se añadió `@fastify/rate-limit` solo al login, con límite configurable de cinco intentos por IP en 60 segundos. |
| Retest manual | Cinco intentos sintéticos inválidos recibieron 401 y el sexto recibió 429. La prueba automatizada `login bloquea el sexto intento desde la misma IP` también aprobó. |
| Estado residual | Mitigado; el retest ZAP activo no reportó alertas. |

## Dependencias

`npm audit` inicial reportó una vulnerabilidad moderada transitiva en `fast-uri` y una baja directa en Fastify. Se ejecutó `npm audit fix`; el retest reportó **0 vulnerabilidades**.

## Resultados de pruebas

| Comando o prueba | Resultado |
|---|---|
| `npm test` | 113 aprobadas, 0 fallidas, 1 omitida por requerir configuración de integración de PostgreSQL específica |
| `npm run build` en frontend | Aprobada |
| Prueba CORS permitida/no permitida | Aprobada |
| Prueba de límite de login | Aprobada |
| `npm audit --json` posterior | 0 vulnerabilidades |
| ZAP activo posterior | 143 reglas aprobadas; 0 alertas, advertencias o hallazgos nuevos |

## Pendiente de cierre

Los reportes saneados del retest están en `docs/evidencias/zap/sec-02-zap-retest-2026-11-02.html` y `docs/evidencias/zap/sec-02-zap-retest-2026-11-02.json`.

## Pendiente de cierre en GitHub

1. Crear el commit y PR que contengan las mitigaciones y esta evidencia.
2. Vincular dicho PR a los issues #18 y #19.
3. Solicitar revisión cruzada; no se cierra SEC-02 sin ella.
