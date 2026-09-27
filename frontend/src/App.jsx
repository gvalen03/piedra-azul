import { Route } from "@solidjs/router";

import { useAuth } from "./stores/auth.store.js";

import LoginPage from "./pages/auth/LoginPage.jsx";
import PacientePage from "./pages/pacientes/PacientePage.jsx";
import MedicoPage from "./pages/medicos/MedicoPage.jsx";
import CitasPage from "./pages/citas/CitasPage.jsx";
import AdminPage from "./pages/admin/AdminPage.jsx";

import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";

function App() {
  const auth = useAuth();

  // Recuperar la sesión antes de evaluar las rutas protegidas al recargar.
  auth.restaurarSesion();

  return (
    <>
      <Route
        path="/"
        component={LoginPage}
      />

      <Route
        path="/paciente"
        component={() => (
          <ProtectedRoute
            allowedRoles={[
              "PACIENTE"
            ]}
          >
            <PacientePage />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/medico"
        component={() => (
          <ProtectedRoute
            allowedRoles={[
              "MEDICO_TERAPISTA"
            ]}
          >
            <MedicoPage />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/citas"
        component={() => (
          <ProtectedRoute
            allowedRoles={[
              "AGENDADOR"
            ]}
          >
            <CitasPage />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin"
        component={() => (
          <ProtectedRoute
            allowedRoles={[
              "ADMINISTRADOR"
            ]}
          >
            <AdminPage />
          </ProtectedRoute>
        )}
      />


    </>
  );
}

export default App;
