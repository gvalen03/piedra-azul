import jwt from "jsonwebtoken";

export const jwtService = {
  generarToken(payload) {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET no está configurado");
    }

    return jwt.sign(
      payload,
      secret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "8h"
      }
    );
  },

  verificarToken(token) {
    return jwt.verify(
      token,
      process.env.JWT_SECRET
    );
  }
};