import { useNavigate } from "@solidjs/router";
import { useAuth } from "../../stores/auth.store.js";

function AdminPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.cerrarSesion();
    navigate("/");
  };

  return (
    <main>
      <h1>Panel de administración</h1>

      <button onClick={handleLogout}>
        Cerrar sesión
      </button>
    </main>
  );
}

export default AdminPage;