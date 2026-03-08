# FIFA Club Pro

Aplicación full stack para gestión de clubes de FIFA/Pro Clubs.

## Objetivo

FIFA Club Pro busca ser una plataforma para:

- crear clubes
- unirse a clubes
- administrar miembros y roles
- registrar partidos
- guardar estadísticas individuales por jugador
- visualizar tabla de liga
- mostrar leaderboards, MVP y estadísticas de temporada

---

## Stack

### Backend
- Node.js
- Express
- MongoDB
- Mongoose
- JWT

### Frontend
- React
- Vite
- Tailwind CSS
- Axios

---

## Estructura del proyecto

```text
fifa-club-pro/
│
├── src/                         # Backend
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   └── index.js
│
├── fifa-club-pro-frontend/      # Frontend
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── components/
│   │   ├── layout/
│   │   ├── pages/
│   │   └── season/
│   └── vite.config.js
│
├── package.json
└── README.md