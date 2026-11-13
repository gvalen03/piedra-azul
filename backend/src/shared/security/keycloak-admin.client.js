const fallo = (message, statusCode = 502) => Object.assign(new Error(message), { statusCode });

export class KeycloakAdminClient {
  constructor({ issuer, clientId, clientSecret, fetchImpl = fetch }) {
    const url = new URL(issuer);
    const match = url.pathname.match(/^\/realms\/([^/]+)$/);
    if (!match || !clientId || !clientSecret) throw new Error("La configuración del aprovisionador de Keycloak está incompleta");
    this.baseUrl = url.origin;
    this.realm = decodeURIComponent(match[1]);
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.fetch = fetchImpl;
  }

  async token() {
    const response = await this.fetch(`${this.baseUrl}/realms/${encodeURIComponent(this.realm)}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: this.clientId, client_secret: this.clientSecret })
    });
    if (!response.ok) throw fallo("No fue posible obtener autorización para aprovisionar en Keycloak");
    const body = await response.json();
    if (!body.access_token) throw fallo("Keycloak no devolvió un token de aprovisionamiento");
    return body.access_token;
  }

  async request(path, options = {}) {
    const token = await this.token();
    const response = await this.fetch(`${this.baseUrl}/admin/realms/${encodeURIComponent(this.realm)}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers }
    });
    return response;
  }

  async buscarUsuario(username) {
    const response = await this.request(`/users?username=${encodeURIComponent(username)}&exact=true`);
    if (!response.ok) throw fallo("No fue posible consultar usuarios en Keycloak");
    return (await response.json()).find(usuario => usuario.username === username) ?? null;
  }

  async crearOEncontrarUsuario({ username, email, nombre, apellido, password }) {
    const existente = await this.buscarUsuario(username);
    if (existente) {
      if (email && existente.email && existente.email.toLowerCase() !== email.toLowerCase()) {
        throw fallo("Ya existe una cuenta de Keycloak con ese usuario y otro correo", 409);
      }
      return { id: existente.id, creado: false };
    }
    const response = await this.request("/users", {
      method: "POST",
      body: JSON.stringify({ username, email, firstName: nombre, lastName: apellido, enabled: true, credentials: [{ type: "password", value: password, temporary: true }] })
    });
    if (response.status === 409) {
      const concurrente = await this.buscarUsuario(username);
      if (concurrente) return { id: concurrente.id, creado: false };
    }
    if (response.status !== 201) throw fallo("Keycloak no pudo crear la cuenta");
    const location = response.headers.get("location");
    const id = location?.split("/").pop();
    if (!id) throw fallo("Keycloak creó la cuenta sin devolver su identificador");
    return { id, creado: true };
  }

  async asignarRol(userId, rol) {
    const role = await this.request(`/roles/${encodeURIComponent(rol)}`);
    if (!role.ok) throw fallo("El rol solicitado no existe en Keycloak", 400);
    const definition = await role.json();
    const response = await this.request(`/users/${encodeURIComponent(userId)}/role-mappings/realm`, { method: "POST", body: JSON.stringify([definition]) });
    if (!response.ok && response.status !== 204) throw fallo("Keycloak no pudo asignar el rol solicitado");
  }

  async activarUsuario(userId) {
    const response = await this.request(`/users/${encodeURIComponent(userId)}`, { method: "PUT", body: JSON.stringify({ enabled: true }) });
    if (!response.ok && response.status !== 204) throw fallo("Keycloak no pudo activar la cuenta");
  }

  async eliminarUsuarioCreado(userId) {
    const response = await this.request(`/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
    if (!response.ok && response.status !== 404) throw fallo("No fue posible compensar la cuenta creada en Keycloak");
  }
}
