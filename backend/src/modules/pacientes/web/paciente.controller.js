export function crearPacienteController({ pacienteService }) {
  return {
    registrar: async (request, reply) => {
      try {
        const paciente = await pacienteService.registrar(
          request.body,
          request.user?.username ?? "SISTEMA"
        );

        return reply.code(201).send(paciente);
      } catch (error) {
        const mensaje = error.message || "Error al registrar paciente";

        if (
          mensaje.includes("Ya existe un paciente") ||
          mensaje.includes("documento")
        ) {
          return reply.code(409).send({
            error: mensaje
          });
        }

        return reply.code(500).send({
          error: mensaje
        });
      }
    },

    buscarPorDocumento: async (request, reply) => {
      try {
        const paciente =
          await pacienteService.buscarPorDocumento(
            request.params.documento
          );

        return reply.send(paciente);
      } catch (error) {
        const mensaje = error.message || "Paciente no encontrado";

        return reply.code(404).send({
          error: mensaje
        });
      }
    }
  };
}