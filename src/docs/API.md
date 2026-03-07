# FIFA Club Pro – API (v1)
Base URL: http://localhost:3000

---

## 1) Users

### 1.1 Crear usuario
- POST /users

Body:
{
  "username": "juan",
  "email": "juan@email.com",
  "gamerTag": "JuanPro",
  "platform": "ps",
  "country": "Chile"
}

Respuestas:
- 201: usuario creado
- 409: username o email ya existe
- 400/500: error

---

### 1.2 Listar usuarios
- GET /users
- 200: array de usuarios

---

### 1.3 Obtener usuario por ID
- GET /users/:id
- 200: usuario
- 404: usuario no encontrado
- 400: id inválido

---

## 2) Clubs

### 2.1 Listar clubs
- GET /clubs
- 200: array de clubs

---

### 2.2 Obtener club por ID
- GET /clubs/:id
- 200: club
- 404: Club no encontrado

---

### 2.3 Crear club
- POST /clubs

Body:
{
  "name": "Universidad de Chile",
  "country": "Chile",
  "founded": 1927
}

- 201: club creado

---

### 2.4 Editar club
- PUT /clubs/:id
- Body parcial permitido
- 200: club actualizado
- 404: club no encontrado

---

### 2.5 Eliminar club
- DELETE /clubs/:id
- 200: Club eliminado
- 404: club no encontrado

---

### 2.6 Dashboard del club
- GET /clubs/:clubId/dashboard
- 200: resumen del club (stats + miembros)

---

### 2.7 Form (racha últimos partidos)
- GET /clubs/:clubId/form
- 200: { lastMatches, pointsLast5, currentStreak }

---

### 2.8 Head to Head entre clubs
- GET /clubs/:clubAId/vs/:clubBId
- 200: estadísticas H2H

---

## 3) Members (dentro de /clubs)

> Header requerido en la mayoría de rutas:
- x-user-id: <userId>

---

### 3.1 Ver miembros del club
- GET /clubs/:clubId/members
- Requiere ser miembro

---

### 3.2 Saber mi rol en el club
- GET /clubs/:clubId/me
- Header: x-user-id
- 200: { clubId, userId, role }

⚠️ Nota técnica: existe duplicidad interna de getMyClubRole (pendiente de limpieza).

---

### 3.3 Agregar miembro al club (admin)
- POST /clubs/:clubId/members

Body:
{
  "userId": "<userId>",
  "role": "member"
}

---

### 3.4 Cambiar rol de miembro (admin)
- PUT /clubs/:clubId/members/:userId/role

Body:
{
  "role": "captain"
}

---

### 3.5 Bootstrap admin (admin inicial)
- PUT /clubs/:clubId/bootstrap-admin/:userId

---

### 3.6 Eliminar miembro del club
- DELETE /clubs/:clubId/members/:userId

⚠️ Nota técnica: remove / kick usan la misma ruta y lógica (deuda técnica).

---

### 3.7 Solicitar unirse a un club
- POST /clubs/:clubId/join-requests
- Header: x-user-id

---

### 3.8 Ver solicitudes de unión
- GET /clubs/:clubId/join-requests
- Requiere admin

---

### 3.9 Resolver solicitud
- PUT /clubs/:clubId/join-requests/:userId

Body:
{
  "action": "accept" // o "reject"
}

---

### 3.10 Salir del club
- DELETE /clubs/:clubId/leave
- Header: x-user-id

---

## 4) Matches

### 4.1 Crear match (season automática + playerStats)
- POST /matches

Body:
{
  "homeClub": "<clubId>",
  "awayClub": "<clubId>",
  "date": "2028-02-02",
  "stadium": "Estadio Nacional",
  "scoreHome": 2,
  "scoreAway": 1,
  "playerStats": [
    {
      "user": "<userId>",
      "club": "<clubId>",
      "goals": 1,
      "assists": 0
    }
  ]
}

- 201: match creado

---

### 4.2 Listar matches (filtros + paginación)
- GET /matches

Query opcional:
- season
- club
- from
- to
- stadium
- page
- limit

---

### 4.3 Obtener match por ID
- GET /matches/:id

---

### 4.4 Obtener match FULL (playerStats poblado)
- GET /matches/:id/full

---

### 4.5 MVP del partido
- GET /matches/:id/mvp

---

### 4.6 Editar match
- PUT /matches/:id

---

### 4.7 Eliminar match
- DELETE /matches/:id

---

### 4.8 Calendario
- GET /matches/calendar
- Filtros: season, type=future|past

---

### 4.9 Head to Head de partidos
- GET /matches/h2h/:clubA/:clubB

---

## 5) Player Stats (lectura)

> Todas estas rutas requieren ser miembro del club

---

### 5.1 Stats de un jugador (yo)
- GET /clubs/:clubId/players/me/stats
Query:
- season
- from
- to

---

### 5.2 Stats de un jugador específico
- GET /clubs/:clubId/players/:userId/stats

---

### 5.3 Tabla de jugadores del club
- GET /clubs/:clubId/players/stats

⚠️ Requiere season o rango de fechas

---

### 5.4 Top scorers
- GET /clubs/:clubId/players/top-scorers
Query:
- season
- limit

---

### 5.5 Top assists
- GET /clubs/:clubId/players/top-assists
Query:
- season
- limit

---

### 5.6 MVP de la season
- GET /clubs/:clubId/players/mvp-season?season=2029

---

### 5.7 Leaderboards unificados
- GET /clubs/:clubId/players/leaderboards

Incluye:
- topScorers
- topAssists
- topContrib
- mvpSeason

---

## 6) Stats (club & liga)

### 6.1 Stats básicas de club
- GET /stats/:clubId

---

### 6.2 Stats avanzadas de club
- GET /stats/club/:clubId/advanced

---

### 6.3 Home / Away
- GET /stats/club/:clubId/home-away
- GET /stats/club/:clubId/home-away-pro

---

### 6.4 Rachas
- GET /stats/club/:clubId/streaks

---

### 6.5 Promedios
- GET /stats/club/:clubId/averages

---

### 6.6 Stats por temporada
- GET /stats/club/:clubId/season/:seasonYear

---

### 6.7 Comparación entre temporadas
- GET /stats/club/:clubId/seasons

---

### 6.8 Mejores temporadas
- GET /stats/club/:clubId/best-seasons

---

### 6.9 Mejor / peor temporada
- GET /stats/club/:clubId/best-worst-season

---

### 6.10 Comparar clubes por temporada
- GET /stats/compare/:clubA/:clubB/:season

---

## 7) Liga

### 7.1 Tabla histórica
- GET /stats/ranking

---

### 7.2 Tabla por promedio de puntos
- GET /stats/ranking/average-points

---

### 7.3 Dashboard de liga
- GET /stats/league/dashboard

---

### 7.4 Tendencias por temporada
- GET /stats/league/trends?from=2026&to=2028

---

### 7.5 Power Ranking
- GET /stats/league/power-ranking?limit=10&last=5

---

## 8) Advanced Stats

### 8.1 Stats avanzadas independientes
- GET /advanced-stats/:clubId

---

## Estado actual del proyecto

- Núcleo completo
- playerStats funcionando y validado
- Capa analítica amplia
- Pendiente:
  - Limpieza de duplicidades
  - Autenticación JWT
  - QA / tests
  - Preparación frontend

