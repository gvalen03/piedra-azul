export function crearCitaController({ citaService }) {
  return {
    consultarPorMedicoYFecha: async (request, reply) => {
      try {
        const { medicoId, fecha } = request.query;

        const resultado =
          await citaService.consultarPorMedicoYFecha(
            medicoId,
            fecha
          );

        return reply.send(resultado);
      } catch (error) {
        const mensaje =
          error.message ||
          "Error al consultar las citas";

        return reply.code(500).send({
          error: mensaje
        });
      }
    },

    agendar: async (request, reply) => {
      try {
        const cita =
          await citaService.agendar(
            request.body
          );

        return reply
          .code(201)
          .send(cita);

      } catch (error) {
        const mensaje =
          error.message ||
          "Error al agendar la cita";

        if (
          mensaje.includes(
            "no está disponible"
          ) ||
          mensaje.includes(
            "ya se encuentra reservado"
          )
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

    confirmar: async (request, reply) => {
      try {
        const { id } = request.params;

        const cita =
          await citaService.confirmar(id);

        return reply.send(cita);

      } catch (error) {
        const mensaje =
          error.message ||
          "Error al confirmar la cita";

        if (
          mensaje.includes(
            "Cita no encontrada"
          )
        ) {
          return reply.code(404).send({
            error: mensaje
          });
        }

        if (
          mensaje.includes(
            "ya se encuentra confirmada"
          ) ||
          mensaje.includes(
            "Solo se pueden confirmar"
          )
        ) {
          return reply.code(409).send({
            error: mensaje
          });
        }

        return reply.code(500).send({
          error: mensaje
        });
      }
    }
  };
}