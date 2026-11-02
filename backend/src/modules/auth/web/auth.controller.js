export function crearAuthController({ authService }) {
  return {
    login: async (request, reply) => {
      try {
        const { username, password } = request.body;

        const resultado = await authService.login(
          username,
          password
        );

        return reply
          .code(200)
          .send(resultado);

      } catch (error) {
        return reply
          .code(401)
          .send({
            message: "Usuario o contraseña incorrectos"
          });
      }
    },
    cambiarPassword: async (request, reply) => {
      try {
        await authService.cambiarPassword(request.user.username, request.body.passwordActual, request.body.passwordNueva);
        return reply.code(204).send();
      } catch (error) {
        return reply.code(error.statusCode || 400).send({ error: error.message || "No fue posible cambiar la contraseña" });
      }
    }
  };
}
