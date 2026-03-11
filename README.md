# FIFA Club Pro

FIFA Club Pro es una aplicación web full-stack para gestionar clubes de fútbol virtual tipo Pro Clubs / EA FC.

## Funcionalidades principales

- Registro e inicio de sesión de usuarios
- Creación y administración de clubes
- Solicitudes de ingreso a clubes
- Gestión de miembros y roles por club
- Creación de partidos
- Registro de estadísticas individuales (`playerStats`)
- Visualización de métricas, tablas y analítica deportiva

## Arquitectura del proyecto

El proyecto está dividido en dos aplicaciones:

### Backend
**Ubicación:** `./src`

**Stack principal:**
- Node.js
- Express
- MongoDB
- Mongoose
- JWT

### Frontend
**Ubicación:** `./fifa-club-pro-frontend`

**Stack principal:**
- React
- Vite
- TailwindCSS
- Axios
- React Router

## Estructura del repositorio

```text
fifa-club-pro-stast/
├─ fifa-club-pro-frontend/     # Frontend
├─ src/                        # Backend
├─ .env.example
├─ .gitignore
├─ BACKEND.md
├─ README.md
├─ package.json
└─ package-lock.json