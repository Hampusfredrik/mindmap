# Mindmap App

En interaktiv mindmap-applikation byggd med Next.js, React Flow, och Vercel Postgres.

## Funktioner

- 🔐 **Google OAuth inloggning** via Auth.js
- 📊 **Interaktiva mindmaps** med React Flow
- 🎯 **Drag & drop** för noder
- 🔗 **Två-klick skapande** av riktade pilar
- 📝 **Fördjupning** på noder och kanter
- 💾 **Automatisk sparning** med debouncing
- 🚀 **Optimistic updates** för snabb respons
- 📱 **Mobil-optimerad** interface
- ⚡ **Prestandaläge** för stora grafer
- 🔄 **OCC** (Optimistic Concurrency Control)

## Teknisk Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **Flow Editor**: React Flow
- **Database**: Vercel Postgres med Drizzle ORM
- **Authentication**: NextAuth.js med Google Provider
- **State Management**: TanStack Query
- **Notifications**: Sonner

## Lokal utveckling

### 1. Klona och installera dependencies

```bash
git clone <repository-url>
cd mindmap-app
npm install
```

### 2. Sätt upp miljövariabler

Kopiera `env.example` till `.env.local`:

```bash
cp env.example .env.local
```

Uppdatera följande värden i `.env.local`:

```env
# Database - skapa en Vercel Postgres databas
DATABASE_URL="postgresql://username:password@localhost:5432/mindmap_db"

# Auth - generera med: openssl rand -base64 32
AUTH_SECRET="your-auth-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth - skapa på https://console.developers.google.com/
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. Sätt upp databasen

```bash
# Generera migrationer
npm run db:generate

# Kör migrationer (kräver att DATABASE_URL är satt)
npm run db:migrate
```

### 4. Starta utvecklingsservern

```bash
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000) i din webbläsare.

## 🚀 Deployment på Vercel

### Snabb deployment (Utan autentisering)

Appen är nu konfigurerad för deployment utan autentisering för testning:

1. **Koppla GitHub repository till Vercel**
2. **Deploy** - Appen fungerar med mock-autentisering

### Sätt upp databas (Krävs för full funktionalitet)

1. Gå till [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigera till ditt projekt
3. Gå till "Storage" tab
4. Klicka "Create Database" → "Postgres"
5. Kopiera `DATABASE_URL` från connection string
6. Lägg till det i Vercel environment variables

### Kör databas migrationer

Efter att ha satt upp databasen, kör migrationer:

```bash
# I Vercel CLI eller lokal miljö med DATABASE_URL
npm run db:generate
npm run db:migrate
```

### Lägg till autentisering senare (Valfritt)

När du är redo att lägga till Google OAuth:

1. **Sätt upp Google OAuth:**
   - Gå till [Google Cloud Console](https://console.cloud.google.com/)
   - Skapa OAuth 2.0 credentials
   - Lägg till redirect URI: `https://your-app.vercel.app/api/auth/callback/google`

2. **Lägg till environment variables i Vercel:**
   ```bash
   AUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=https://your-app.vercel.app
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

3. **Återaktivera autentisering i koden:**
   - Återställ auth-filerna
   - Uppdatera middleware
   - Uppdatera komponenter

### Nuvarande status

✅ **Redo för deployment** - App fungerar utan autentisering  
✅ **Build fungerar** - Alla TypeScript-fel fixade  
✅ **Mock databas** - Fungerar utan riktig databasanslutning  
⏳ **Databas setup** - Krävs för att spara mindmaps  
⏳ **Autentisering** - Kan läggas till senare

## Användning

### Skapa en mindmap

1. Logga in med Google
2. Klicka på "New Mindmap"
3. Dubbelklicka för att skapa noder
4. Klicka på en nod, sedan en annan för att skapa en pil

### Redigera noder och kanter

- **Klicka på en nod** för att öppna redigeringsfönstret
- **Klicka på en pil** för att lägga till detaljer
- **Dra noder** för att flytta dem (sparas automatiskt)

### Prestandaläge

När din mindmap har många noder (>50) eller kanter (>100) aktiveras automatiskt prestandaläge:
- Enklare edge-typ
- Ingen minimap
- Optimerade animationer

## API Routes

- `GET /api/graph` - Lista användarens grafer
- `POST /api/graph` - Skapa ny graf
- `GET /api/graph/[id]` - Hämta graf med noder och kanter
- `POST /api/nodes` - Skapa ny nod
- `PUT /api/nodes/[id]` - Uppdatera nod
- `DELETE /api/nodes/[id]` - Ta bort nod
- `POST /api/edges` - Skapa ny kant
- `PUT /api/edges/[id]` - Uppdatera kant
- `DELETE /api/edges/[id]` - Ta bort kant

## Utveckling

### Databas schema

```sql
graphs(id, user_id, title, created_at)
nodes(id, graph_id, title, detail, x, y, created_at, updated_at)
edges(id, graph_id, source_node_id, target_node_id, detail, created_at, updated_at)
```

### Nya migrationer

```bash
# Redigera schema i src/lib/db/schema.ts
npm run db:generate
npm run db:migrate
```

### Databas studio

```bash
npm run db:studio
```

## Licens

MIT