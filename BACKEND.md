# FIFA Club Pro Stats - Backend

Backend oficial del proyecto **FIFA Club Pro Stats**.

Esta API REST está construida con **Node.js + Express + MongoDB + Mongoose** y permite gestionar un sistema de clubes estilo **Pro Clubs (FIFA / EA FC)**, incluyendo:

- autenticación de usuarios
- creación y administración de clubes
- gestión de miembros y roles
- solicitudes de ingreso a clubes
- registro de partidos
- estadísticas de jugadores
- estadísticas de equipo
- alineaciones
- calendario
- MVP
- head-to-head entre clubes

---

# Estado actual

Estado del backend:

- funcional
- protegido con JWT
- controlado por roles dentro del club
- validado con testing automatizado
- endurecido con validaciones reales sobre flujos críticos


 # Arquitectura general

Frontend (React + Vite + Tailwind)
        │
        │ HTTP / JSON
        ▼
Backend (Node.js + Express)
        │
        │ Mongoose ODM
        ▼
MongoDB

## Estructura base

```text
src
│
├─ controllers
│   auth.controller.js
│   clubs.controller.js
│   matches.controller.js
│   members.controller.js
│
├─ models
│   User.js
│   Club.js
│   Match.js
│
├─ routes
│   auth.routes.js
│   clubs.routes.js
│   matches.routes.js
│   members.routes.js
│
├─ middlewares
│   auth.js
│   requireClubRole.js
│
├─ tests
│   auth
│   clubs
│   members
│   matches
│
├─ app.js
└─ index.js