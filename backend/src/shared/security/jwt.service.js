import jwt from "jsonwebtoken";

export class JwtService {
  constructor({ secret, expiresIn = "8h" }) {
    this.secret = secret;
    this.expiresIn = expiresIn;
  }

  generarToken({ username, rol, pacienteId, medicoId, version }) {
    return jwt.sign(
      {
        version,
        rol,
        pacienteId,
        medicoId
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