export function crearAuthenticate(jwtService) {
  return async function authenticate(request, reply) {
    try {
      const authorization =
        request.headers.authorization;

      if (!authorization) {
        return reply.code(401).send({
          error: "Token requerido"
        });
      }

      const [tipo, token] =
        authorization.split(" ");

      if (tipo !== "Bearer" || !token) {
        return reply.code(401).send({
          error: "Formato de token inválido"
        });
      }

      const payload =
        jwtService.verify(token);

      request.user = payload;

    } catch (error) {
      return reply.code(401).send({
        error: "Token inválido o expirado"
      });
    }
  };
}