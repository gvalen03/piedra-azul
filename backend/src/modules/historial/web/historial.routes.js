import { authorize } from "../../../shared/security/authorize.js";
import { citaParams, registrarControlSchema } from "../schemas/historial.schema.js";
export async function historialRoutes(app) {
  const identidad = campo => async (request, reply) => {
    const id = Number(request.user[campo]);
    if (!Number.isSafeInteger(id) || id <= 0) return reply.code(403).send({ error: "Tu cuenta no tiene un registro asociado. Contacta al administrador." });
    request.identidad = id;
  };
  const medico = [app.authenticate, authorize("MEDICO_TERAPISTA"), identidad("medicoId")];
  app.get("/mio", { preHandler: [app.authenticate, authorize("PACIENTE"), identidad("pacienteId")] },
    async request => ({ controles: await app.historialRepository.listarControlesPorPaciente(request.identidad) }));
  app.get("/citas/:citaId", { preHandler: medico, schema: { params: citaParams } },
    async request => ({ controles: await app.historialService.obtenerPorCita(request.params.citaId, request.identidad) }));
  app.post("/citas/:citaId", { preHandler: medico, schema: registrarControlSchema }, async (request, reply) => {
    const control = await app.historialService.registrarControl(request.params.citaId, request.identidad, request.body);
    return reply.code(201).send(control);
  });
}
