export async function authenticate(request, reply) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return reply.code(401).send({
        error: "Token requerido"
      });
    }

    const token = authHeader.substring(7);

    request.user =
      request.server.jwtService.validar(token);

  } catch {
    return reply.code(401).send({
      error: "Token inválido o expirado"
    });
  }
}