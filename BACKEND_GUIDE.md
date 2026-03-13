# BACKEND_GUIDE.md
Guía completa del backend  
Proyecto: FIFA Club Pro Stats

---

# 1. Qué es este backend

Este backend es una API REST construida con Node.js y Express que permite gestionar una liga de clubes estilo Pro Clubs (FIFA / EA FC).

El sistema permite:

- registrar usuarios
- crear clubes
- gestionar miembros y roles
- solicitudes de ingreso a clubes
- registrar partidos
- registrar alineaciones
- registrar estadísticas de jugadores
- registrar estadísticas de equipo
- calcular MVP del partido
- generar calendario
- analizar head-to-head entre clubes

El backend está diseñado para ser consumido por un frontend construido con React.

---

# 2. Estado actual del backend

Estado:

Backend funcional  
Backend protegido con JWT  
Backend con control de roles por club  
Backend probado con testing automatizado  

Resultados actuales de testing:

Test Suites: 21 passed  
Tests: 194 passed  
Failures: 0  

Esto significa que el backend está completamente validado con pruebas automatizadas.

---

# 3. Stack tecnológico

Tecnologías utilizadas:

Backend

Node.js  
Express  
MongoDB  
Mongoose  
JWT Authentication  

Testing

Jest  
Supertest  

Frontend (se conecta a esta API)

React  
Vite  
TailwindCSS  

---

# 4. Arquitectura del sistema

Arquitectura general del proyecto:

Frontend (React)
        │
        │ HTTP / JSON API
        ▼
Backend (Express API)
        │
        │ Mongoose ODM
        ▼
MongoDB

---

# 5. Estructura del backend

Estructura principal del proyecto:

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

---

# 6. app.js vs index.js

app.js

Responsable de configurar Express.

Contiene:

- middlewares
- configuración CORS
- body parser
- rutas
- manejo de errores

Ejemplo conceptual:

app.use(cors())
app.use(express.json())

app.use("/auth", authRoutes)
app.use("/clubs", clubsRoutes)
app.use("/matches", matchesRoutes)

app.use(errorHandler)

---

index.js

Responsable de iniciar el servidor.

Contiene:

- conexión a MongoDB
- arranque del servidor

Ejemplo conceptual:

mongoose.connect(MONGO_URI)

app.listen(PORT)

---

# 7. Modelos de datos

El backend utiliza Mongoose ODM.

Modelos principales:

User  
Club  
Match  

---

# 8. Modelo User

Representa un usuario del sistema.

Campos principales:

username  
email  
passwordHash  
gamerTag  
platform  
country  

---

# 9. Modelo Club

Representa un club dentro del sistema.

Campos principales:

name  
country  
founded  
isPrivate  

---

Members dentro del club

members contiene:

user  
role  
joinedAt  

Roles disponibles:

admin  
captain  
member  

---

# 10. Modelo Match

Representa un partido entre dos clubes.

Campos principales:

homeClub  
awayClub  
date  
stadium  
scoreHome  
scoreAway  
season  
competition  
status  

---

playerStats

Estadísticas individuales de jugadores:

user  
club  
goals  
assists  
shots  
shotsOnTarget  
rating  
isMVP  

---

teamStats

Estadísticas de equipo:

possession  
shots  
shotsOnTarget  
corners  
fouls  
yellowCards  
redCards  

---

lineups

Alineaciones del partido:

formation  
players[]

Cada jugador tiene:

user  
position  
shirtNumber  
starter  

---

# 11. Seguridad

El backend utiliza autenticación JWT.

Flujo:

login/register  
      │  
      ▼  
token JWT  
      │  
      ▼  
middleware auth  
      │  
      ▼  
requireClubRole  

---

# 12. Middleware auth

Verifica el token enviado en la request.

Ejemplo:

Authorization: Bearer TOKEN

Si el token es válido:

req.user

queda disponible para el backend.

---

# 13. Middleware requireClubRole

Controla permisos dentro del club.

Ejemplo:

requireClubRole("admin")

Permite solo administradores.

También puede aceptar múltiples roles:

requireClubRole(["admin","captain"])

---

# 14. Módulos del backend

El backend está dividido en 4 módulos principales:

Auth  
Clubs  
Members  
Matches  

---

# 15. Auth

Endpoints:

POST /auth/register  
POST /auth/login  
GET /auth/me  

Funciones:

crear cuenta  
login  
verificar sesión  

---

# 16. Clubs

Endpoints principales:

POST   /clubs  
GET    /clubs  
GET    /clubs/:id  
PUT    /clubs/:id  
DELETE /clubs/:id  

Funciones:

crear club  
listar clubes  
obtener club  
editar club  
eliminar club  

---

# 17. Members

Endpoints:

POST   /clubs/:clubId/join-requests  
GET    /clubs/:clubId/join-requests  
PATCH  /clubs/:clubId/join-requests/:requestId  
PATCH  /clubs/:clubId/members/:memberId/role  
DELETE /clubs/:clubId/members/:memberId  
DELETE /clubs/:clubId/leave  

Funciones:

solicitar ingreso  
aprobar solicitud  
rechazar solicitud  
cambiar rol  
expulsar miembro  
abandonar club  

---

# 18. Matches

Endpoints principales:

POST   /matches  
GET    /matches  
GET    /matches/:id  
GET    /matches/:id/full  
PUT    /matches/:id/clubs/:clubId  
PATCH  /matches/:id/clubs/:clubId/player-stats  
PATCH  /matches/:id/clubs/:clubId/team-stats  
PATCH  /matches/:id/clubs/:clubId/lineups  
DELETE /matches/:id  

Funciones:

crear partido  
editar partido  
registrar estadísticas de jugadores  
registrar estadísticas de equipo  
registrar alineaciones  
eliminar partido  

---

# 19. Analytics

MVP del partido

Endpoint:

GET /matches/:id/mvp

Cálculo:

points =
goals * 2
+ assists
+ rating
± bonus victoria

---

Calendario

Endpoint:

GET /matches/calendar

Filtros:

season  
future  
past  

---

Head-to-Head

Endpoint:

GET /matches/h2h/:clubA/:clubB

Devuelve:

partidos jugados  
victorias  
empates  
goles  
historial de partidos  

---

# 20. Testing automatizado

Frameworks:

Jest  
Supertest  

Suites de test:

Auth

auth.register.test.js  
auth.login.test.js  
auth.me.test.js  

Clubs

clubs.create.test.js  
clubs.create.extra.test.js  
clubs.read.test.js  
clubs.update.test.js  
clubs.delete.test.js  

Members

members.join-requests.create.test.js  
members.join-requests.read.test.js  
members.join-requests.resolve.test.js  
members.update-role.test.js  
members.remove.test.js  
members.leave.test.js  

Matches

matches.create.test.js  
matches.read.test.js  
matches.update.test.js  
matches.delete.test.js  
matches.player-stats.test.js  
matches.team-stats.test.js  
matches.lineups.test.js  

Resultados actuales:

21 suites  
194 tests  
100% passing  

---

# 21. Cómo ejecutar el backend

Instalar dependencias

npm install

Ejecutar servidor

npm run dev

Ejecutar tests

npm test

---

# 22. Variables de entorno

Archivo `.env`

Ejemplo:

PORT=5000  
MONGO_URI=mongodb://localhost:27017/fifa-club-pro  
JWT_SECRET=your_secret_key  

---

# 23. Estado actual del backend

El backend se encuentra:

estable  
probado  
modular  
seguro  

Con:

21 test suites  
194 tests  
100% passing  

---

# 24. Próximo foco del proyecto

El siguiente trabajo se centra en el frontend:

React dashboard  
tablas de goleadores  
tablas de asistencias  
ranking MVP  
vista de calendario  
gestión visual de partidos  

---

# 25. Recomendación importante

Guardar este archivo como:

BACKEND_GUIDE.md

Esto permitirá retomar el proyecto en el futuro sin perder el contexto técnico del backend.
