import bcrypt from "bcrypt";

export const passwordService = {
  async comparar(passwordPlano, passwordHash) {
    return bcrypt.compare(
      passwordPlano,
      passwordHash
    );
  },

  async hashear(passwordPlano) {
    return bcrypt.hash(
      passwordPlano,
      10
    );
  }
};