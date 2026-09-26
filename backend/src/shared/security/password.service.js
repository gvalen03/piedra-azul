import bcrypt from "bcrypt";

export class PasswordService {
  async hash(password) {
    return bcrypt.hash(password, 12);
  }

  async comparar(password, hash) {
    return bcrypt.compare(password, hash);
  }
}