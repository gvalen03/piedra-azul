export function authorize(...rolesPermitidos) {
  return async function (request, reply) {
    if (!request.user) {
      return reply.code(401).send({
        error: "Usuario no autenticado"
      });
    }

    if (
      !rolesPermitidos.includes(
        request.user.rol
      )
    ) {
      return reply.code(403).send({
        error: "No tiene permisos para esta operación"
      });
    }
  };
}