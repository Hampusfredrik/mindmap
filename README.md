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

## Deployment på Vercel

### 1. Skapa Vercel Postgres databas

1. Gå till [Vercel Dashboard](https://vercel.com/dashboard)
2. Skapa ett nytt projekt
3. Gå till Storage → Create Database → Postgres
4. Kopiera `DATABASE_URL`

### 2. Sätt upp Google OAuth

1. Gå till [Google Cloud Console](https://console.developers.google.com/)
2. Skapa ett nytt projekt eller välj befintligt
3. Aktivera Google+ API
4. Skapa OAuth 2.0 credentials
5. Lägg till `https://your-domain.vercel.app/api/auth/callback/google` som redirect URI

### 3. Deploy till Vercel

1. Push koden till GitHub
2. Importera projektet i Vercel
3. Lägg till miljövariabler i Vercel dashboard:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `NEXTAUTH_URL`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

### 4. Kör migrationer på produktion

```bash
# Kör detta efter deployment
npm run db:migrate
```

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