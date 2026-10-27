# Piedra Azul

Proyecto full stack desarrollado con:

- Frontend: SolidJS + Vite
- Backend: Fastify
- Base de datos: PostgreSQL

## 1. Requisitos previos

Cada integrante debe tener instalado:

- Git
- Node.js
- npm
- PostgreSQL

Verificar con:

```bash
git --version
node -v
npm -v
psql --version
```

## Eliminación irreversible de perfiles

La administración permite eliminar físicamente médicos y pacientes solo cuando no tienen citas (incluidas las canceladas), controles o historias clínicas, disponibilidades ni cuentas de usuario vinculadas. Si existen relaciones, la API responde `409 Conflict` y recomienda desactivar el perfil; la desactivación conserva sus registros relacionados.

La eliminación requiere confirmación explícita en la interfaz y registra el tipo, identificador y actor en `auditorias` dentro de la misma transacción. Si la auditoría o una clave foránea impiden completar la operación, la transacción se revierte. No se eliminan cuentas de usuario ni se usan eliminaciones en cascada.

Para validar los cambios:

```bash
cd backend
npm test
cd ../frontend
npm run build
```