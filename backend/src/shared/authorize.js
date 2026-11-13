export function authorize(...rolesPermitidos) {
  return async function (request, reply) {
    if (!rolesPermitidos.includes(request.user.rol)) {
      return reply.code(403).send({
        error: "No autorizado"
      });
    }
  };
}