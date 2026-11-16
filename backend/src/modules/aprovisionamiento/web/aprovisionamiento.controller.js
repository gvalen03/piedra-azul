export function crearAprovisionamientoController({ service }) {
  return {
    aprovisionar: async (request, reply) => {
      try { return reply.code(201).send(await service.aprovisionar(request.body, request.user.sub)); }
      catch (error) { return reply.code(error.statusCode || 500).send({ error: error.message || "No fue posible aprovisionar la cuenta" }); }
    }
  };
}
