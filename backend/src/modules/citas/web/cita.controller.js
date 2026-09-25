export function crearCitaController({ citaService }) {
  return {
    consultarPorMedicoYFecha: async (request, reply) => {
      const { medicoId, fecha } = request.query;

      const resultado =
        await citaService.consultarPorMedicoYFecha(
          medicoId,
          fecha
        );

      return reply.send(resultado);
    },

    agendar: async (request, reply) => {
      const cita =
        await citaService.agendar(request.body);

      return reply.code(201).send(cita);
    }
  };
}