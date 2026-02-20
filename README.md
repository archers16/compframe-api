# CompFrame API (Railway)

Long-running Express server for the CompFrame AI generation pipeline. Handles the heavy Claude API calls without timeout constraints.

## Architecture

- **Vercel** hosts the frontend (React app) and fast endpoints (PDF/PPTX/calculator exports)
- **Railway** hosts the generation pipeline (this server)
- **Supabase** stores plans and acts as the communication layer between frontend and API

Flow: Frontend fires POST /generate to Railway, gets 202 back immediately, then polls Supabase for results. Railway runs the full pipeline (analysis + 5 parallel group calls) and saves to Supabase when done.

## Setup

### 1. Create a GitHub repo

Create a new repo (e.g., `compframe-api`) and push this code to it.

### 2. Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click "New Project" then "Deploy from GitHub repo"
3. Select the `compframe-api` repo
4. Railway auto-detects the Dockerfile and deploys

### 3. Set environment variables in Railway

In your Railway project settings, add these variables:

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PORT=3001
```

### 4. Get your Railway URL

After deploy, Railway gives you a URL like `compframe-api-production.up.railway.app`. You can also add a custom domain.

### 5. Update Vercel environment variable

In your Vercel project (compframe-mvp) settings, add:

```
VITE_API_URL=https://compframe-api-production.up.railway.app
```

Then redeploy the frontend (push any commit or trigger manual deploy).

### 6. Verify

1. Hit `https://your-railway-url/health` to confirm the server is running
2. Generate a plan from the frontend
3. Check Railway logs for pipeline progress

## Local development

```bash
npm install

# Create .env file
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

npm start
```

Server runs on port 3001. Frontend should set `VITE_API_URL=http://localhost:3001` in `.env.local`.
