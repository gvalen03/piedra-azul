export function crearAuthController({ authService }) {
  return {
    login: async (request, reply) => {
      const { username, password } = request.body;

      const resultado = await authService.login(
        username,
        password
      );

      return reply.send(resultado);
    }
  };
}