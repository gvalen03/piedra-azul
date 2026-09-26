import { authorize } from "../../../shared/security/authorize.js";
export async function medicoRoutes(fastify) {
  fastify.post(
    "/",
    {
      preHandler: [
        fastify.authenticate,
        authorize(
          "MEDICO_TERAPISTA",
          "ADMINISTRADOR")
      ]
    },
    async (request, reply) => {
      return fastify.disponibilidadController.crear(
        request,
        reply
      );
    }
  );
  fastify.get("/", fastify.medicoController.listar);
  fastify.get("/:id", fastify.medicoController.buscarPorId);
}