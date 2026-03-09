# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


# FIFA Club Pro

FIFA Club Pro es una aplicación web full-stack diseñada para gestionar clubes de fútbol virtual (Pro Clubs / EAFC / FIFA).  
Permite administrar clubes, jugadores, partidos y estadísticas avanzadas dentro de una liga.

La aplicación implementa autenticación segura, gestión de miembros, registro de partidos y un sistema completo de analítica deportiva.

---

# Demo del sistema

Flujo principal de uso:

Usuario  
→ Registro / Login  
→ Crear o unirse a club  
→ Registrar partidos  
→ Registrar estadísticas de jugadores  
→ Analizar rendimiento del club y la liga

---

# Arquitectura del proyecto

El sistema está dividido en dos capas principales.

Frontend  
React + Vite + TailwindCSS

Backend  
Node.js + Express + MongoDB

Comunicación  
REST API con autenticación JWT

---

# Arquitectura general

Usuario
│
▼
Frontend (React)
│
▼
API Client (Axios)
│
▼
Backend (Express)
│
▼
Controllers
│
▼
MongoDB


---

# Tecnologías utilizadas

## Frontend

React  
Vite  
TailwindCSS  
Axios  
React Router

## Backend

Node.js  
Express  
MongoDB  
Mongoose  
JWT Authentication

---

# Funcionalidades principales

## Autenticación

Registro de usuarios  
Login con JWT  
Persistencia de sesión  
Logout automático si el token expira

---

## Gestión de clubes

Crear club  
Solicitar unirse a club  
Aprobar o rechazar solicitudes  
Gestión de miembros

Roles implementados:

admin  
captain  
member

Permisos:

admin  
- cambiar roles  
- eliminar miembros  
- aprobar solicitudes  
- crear partidos

captain  
- revisar estadísticas  
- gestionar algunos aspectos deportivos

member  
- ver estadísticas personales

---

## Gestión de partidos

Crear partido  
Registrar marcador  
Registrar estadísticas individuales de jugadores  
Cálculo automático de MVP del partido

---

## Estadísticas y analítica

El sistema incluye un módulo completo de estadísticas.

### Estadísticas de club

Club stats  
Advanced club stats  
Club averages  
Home vs Away stats  
Club streaks  
Club rivals  
Club summary

### Estadísticas de liga

League table  
Historical ranking  
Average points ranking  
League dashboard  
League trends  
Power ranking

### Comparaciones

Head to head entre clubes  
Comparación por temporada  
Mejores temporadas de club  
Mejor y peor temporada

---

# Dashboard

El dashboard principal muestra:

Tabla de liga  
Mejores equipos  
Mejor ataque  
Mejor defensa  
Últimos partidos registrados

---

# Estructura del proyecto

## Backend

src
├ controllers
│ ├ users.controller.js
│ ├ clubs.controller.js
│ ├ matches.controller.js
│ ├ stats.controller.js
│ └ league.controller.js
│
├ models
│ ├ User.js
│ ├ Club.js
│ └ Match.js
│
├ routes
│ ├ users.routes.js
│ ├ clubs.routes.js
│ ├ matches.routes.js
│ ├ stats.routes.js
│ └ league.routes.js
│
├ middlewares
│ ├ auth.middleware.js
│ └ authClubRole.js
│
├ docs
│ └ README.md
│
└ index.js


## Frontend


src
├ api
│ ├ client.js
│ ├ auth.js
│ └ clubs.js
│
├ auth
│ ├ AuthContext.jsx
│ ├ ProtectedRoute.jsx
│ └ sessionManager.js
│
├ components
│ └ FifaLoader.jsx
│
├ pages
│ ├ Login.jsx
│ ├ Register.jsx
│ ├ Clubs.jsx
│ ├ CreateClub.jsx
│ ├ JoinRequests.jsx
│ ├ MemberStats.jsx
│ ├ League.jsx
│ └ Dashboard.jsx
│
├ ui
│ └ ToastContext.jsx
│
└ App.jsx


---

# Seguridad implementada

El backend incluye:

JWT Authentication  
Role Based Access Control  
Permisos por club  
Validación de endpoints protegidos

---

# Flujo del sistema

Registro usuario
│
▼
Login
│
▼
Seleccionar o crear club
│
▼
Gestionar miembros
│
▼
Registrar partidos
│
▼
Registrar playerStats
│
▼
Sistema calcula estadísticas
│
▼
Visualización en dashboard


