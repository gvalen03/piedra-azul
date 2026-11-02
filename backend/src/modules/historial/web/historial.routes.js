import { authorize } from "../../../shared/security/authorize.js";
import { citaParams, citasPorDocumentoParams, registrarControlSchema } from "../schemas/historial.schema.js";
export async function historialRoutes(app) {
  const identidad = campo => async (request, reply) => {
    const id = Number(request.user[campo]);
    if (!Number.isSafeInteger(id) || id <= 0) return reply.code(403).send({ error: "Tu cuenta no tiene un registro asociado. Contacta al administrador." });
    request.identidad = id;
  };
  const medico = [app.authenticate, authorize("MEDICO_TERAPISTA"), identidad("medicoId")];
  app.get("/pacientes/:documento/citas", {
    preHandler: [app.authenticate, authorize("AGENDADOR", "MEDICO_TERAPISTA"), async (request, reply) => {
      if (request.user.rol !== "MEDICO_TERAPISTA") return;
      const medicoId = Number(request.user.medicoId);
      if (!Number.isSafeInteger(medicoId) || medicoId <= 0) {
        return reply.code(403).send({ error: "Tu cuenta no tiene un médico asociado. Contacta al administrador." });
      }
      request.medicoId = medicoId;
    }],
    schema: { params: citasPorDocumentoParams }
  }, async request => ({
    citas: await app.historialService.consultarCitasPorDocumento(request.params.documento, request.medicoId ?? null)
  }));

  app.get("/mio", { preHandler: [app.authenticate, authorize("PACIENTE"), identidad("pacienteId")] },
    async request => ({ controles: await app.historialRepository.listarControlesPorPaciente(request.identidad) }));
  app.get("/citas/:citaId", { preHandler: medico, schema: { params: citaParams } },
    async request => ({ controles: await app.historialService.obtenerPorCita(request.params.citaId, request.identidad) }));
  app.post("/citas/:citaId", { preHandler: medico, schema: registrarControlSchema }, async (request, reply) => {
    const control = await app.historialService.registrarControl(request.params.citaId, request.identidad, request.body);
    return reply.code(201).send(control);
  });
}
