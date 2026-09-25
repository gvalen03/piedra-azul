export function crearDisponibilidadController({
  disponibilidadService
}) {
  return {
    configurar: async (request, reply) => {
      const resultado =
        await disponibilidadService.configurar(
          request.body
        );

      return reply.code(201).send(resultado);
    },

    consultarFranjas: async (request, reply) => {
      const { medicoId, fecha } = request.query;

      const franjas =
        await disponibilidadService.obtenerFranjasDisponibles({
          medicoId,
          fecha
        });

      return reply.send(franjas);
    }
  };
}