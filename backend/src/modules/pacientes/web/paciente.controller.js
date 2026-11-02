export function crearPacienteController({ pacienteService }) {
  return {
    registrarAutonomo: async (request, reply) => {
      try {
        const paciente = await pacienteService.registrarAutonomo(request.body);
        return reply.code(201).send(paciente);
      } catch (error) {
        const status = error.statusCode || (error.code === "23505" ? 409 : 400);
        return reply.code(status).send({ error: error.message || "No fue posible crear la cuenta" });
      }
    },
    registrar: async (request, reply) => {
      try {
        const paciente = await pacienteService.registrar(
          request.body,
          request.user?.username ?? request.user?.sub ?? "SISTEMA"
        );

        return reply.code(201).send(paciente);
      } catch (error) {
        const mensaje = error.message || "Error al registrar paciente";
        if (error.statusCode) return reply.code(error.statusCode).send({ error: mensaje });
        if (error.code === "23505") return reply.code(409).send({ error: "Ya existe un paciente con ese documento o correo" });

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
