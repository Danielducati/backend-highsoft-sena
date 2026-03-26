# comando Instalacion de primsa vamos a usar version 5


### npm install prisma@5.10.2 @prisma/client@5.10.2


## para desinstalar - npm uninstall prisma @prisma/client

### npm install 

### Metodos para usar en thunder client  
###  POST http://localhost:3001/clients
### {
###  "firstName": "Diego rios",
###  "lastName": "Rios Rios",
###  "documentType": "CC",
###  "document": "1002003200",
###  "email": "mrstevenTC@spa.com",
###  "phone": "3109876543",
###  "address": "Belencito heart"
### }


### Pasos para desplegar el proyecto

### 1. Clonar el repo
git clone <tu-repo>

# 2. Instalar dependencias
cd backend && npm install
cd ../frontend && npm install

# 3. Configurar .env con la URL de la BD
# DATABASE_URL="postgresql://..."

# 4. Correr migraciones de Prisma
cd backend && npx prisma migrate deploy

# 5. Crear el primer admin  ← el seed
node src/seed.js

# 6. Arrancar
npm run dev
