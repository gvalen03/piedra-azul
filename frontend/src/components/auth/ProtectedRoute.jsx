import { Navigate } from "@solidjs/router";

import { useAuth } from "../../stores/auth.store.js";

function ProtectedRoute(props) {
  const auth = useAuth();

  if (!auth.estaAutenticado()) {
    return <Navigate href="/" />;
  }

  const usuario = auth.user();

  if (!usuario) {
    return <Navigate href="/" />;
  }

  if (
    props.allowedRoles &&
    !props.allowedRoles.includes(usuario.rol)
  ) {
    return <Navigate href="/" />;
  }

  return props.children;
}

export default ProtectedRoute;