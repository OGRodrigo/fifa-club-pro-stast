# FIFA Club Pro

FIFA Club Pro es una aplicación web full-stack para gestionar clubes de fútbol virtual tipo Pro Clubs / EA FC.

Permite:
- registro e inicio de sesión de usuarios
- creación y administración de clubes
- solicitudes de ingreso a clubes
- gestión de miembros y roles por club
- creación de partidos
- registro de estadísticas individuales (`playerStats`)
- visualización de métricas, tablas y analítica deportiva

---

## Arquitectura del proyecto

El proyecto está dividido en dos aplicaciones:

### Backend
Ubicación: `./src`

Stack principal:
- Node.js
- Express
- MongoDB
- Mongoose
- JWT

### Frontend
Ubicación: `./fifa-club-pro-frontend`

Stack principal:
- React
- Vite
- TailwindCSS
- Axios
- React Router

---

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

## Estructura general

Backend

src/
├─ controllers/
├─ middlewares/
├─ models/
├─ routes/
└─ index.js

## Frontend

fifa-club-pro-frontend/
├─ public/
├─ src/
│  ├─ api/
│  ├─ auth/
│  ├─ components/
│  ├─ layout/
│  ├─ pages/
│  ├─ routes/
│  ├─ season/
│  ├─ ui/
│  ├─ App.jsx
│  ├─ index.css
│  └─ main.jsx
├─ index.html
├─ package.json
└─ vite.config.js


## Funcionalidades principales

Autenticación

registro de usuarios

login con JWT

persistencia de sesión

protección de rutas

Gestión de clubes

crear club

solicitar ingreso a club

aprobar o rechazar solicitudes

administrar miembros

Roles por club

admin

captain

member

Gestión de partidos

crear partidos

registrar marcador

registrar estadísticas individuales

editar estadísticas del partido

Analítica

dashboard de club

dashboard de liga

estadísticas de miembros

visualización de rendimiento

##Instalación

Backend

Desde la raíz del proyecto:

npm install
npm run dev
Frontend

Desde la carpeta del frontend:

cd fifa-club-pro-frontend
npm install
npm run dev
Scripts disponibles
Backend
npm run dev
npm start
Frontend
npm run dev
npm run build
npm run preview
npm run lint


##Variables de entorno

Usa .env.example como base para crear tu archivo .env.

## Variables típicas:

PORT

MONGODB_URI

JWT_SECRET