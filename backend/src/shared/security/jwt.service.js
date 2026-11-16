import jwt from "jsonwebtoken";

export class JwtService {
  constructor({ secret, expiresIn = "8h" }) {
    this.secret = secret;
    this.expiresIn = expiresIn;
  }

  generarToken({ username, rol, pacienteId, profesionalId, version }) {
    return jwt.sign(
      {
        version,
        rol,
        pacienteId,
        profesionalId
      },
      this.secret,
      {
        subject: username,
        expiresIn: this.expiresIn
      }
    );
  }

  validar(token) {
    return jwt.verify(token, this.secret);
  }
}
