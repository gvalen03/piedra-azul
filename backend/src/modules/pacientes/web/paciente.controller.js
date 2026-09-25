export function crearPacienteController({ pacienteService }) {
  return {
    registrar: async (request, reply) => {
      const paciente = await pacienteService.registrar(
        request.body,
        request.user?.username ?? "SISTEMA"
      );

      return reply.code(201).send(paciente);
    },

    buscarPorDocumento: async (request, reply) => {
      const paciente =
        await pacienteService.buscarPorDocumento(
          request.params.documento
        );

      return reply.send(paciente);
    }
  };
}