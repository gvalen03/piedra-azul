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
        console.error("ERROR REAL LOGIN:", error);

        return reply
          .code(401)
          .send({
            message: "Usuario o contraseña incorrectos"
          });
      }
    }
  };
}