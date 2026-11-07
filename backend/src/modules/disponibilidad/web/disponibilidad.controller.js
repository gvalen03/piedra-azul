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

    actualizar: async (request, reply) => {
      const resultado = await disponibilidadService.actualizar(
        request.params.id,
        request.body
      );
      return reply.send(resultado);
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
