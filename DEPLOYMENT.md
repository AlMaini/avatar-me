# Deployment Guide

## Option 1: Vercel + Railway (Recommended)

### Frontend (Vercel)
1. Push code to GitHub
2. Connect GitHub repo to [Vercel](https://vercel.com)
3. Vercel auto-detects Vite config
4. Set environment variable: `VITE_API_URL=https://your-backend-url.railway.app/api/claude`
5. Deploy automatically on push

### Backend (Railway)
1. Create account at [Railway](https://railway.app)
2. Connect GitHub repo
3. Select `server.js` as entry point
4. Set environment variables:
   - `CLAUDE_API_KEY=your-claude-api-key`
   - `PORT=3001`
5. Deploy from dashboard

## Option 2: Single Platform Solutions

### Render (Both frontend + backend)
1. Create account at [Render](https://render.com)
2. **Backend Service:**
   - Connect repo, select `server.js`
   - Set env vars: `CLAUDE_API_KEY`, `PORT=10000`
3. **Frontend Static Site:**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Env var: `VITE_API_URL=https://your-backend.onrender.com/api/claude`

### Netlify + Railway
1. **Frontend (Netlify):**
   - Connect repo to [Netlify](https://netlify.com)
   - Build settings: `npm run build`, publish `dist/`
   - Env var: `VITE_API_URL=your-railway-backend-url`
2. **Backend (Railway):** Same as Option 1

## Option 3: VPS Deployment

### DigitalOcean/AWS/Linode
```bash
# Install Node.js, clone repo
git clone your-repo
cd avatar-me
npm install

# Build frontend
npm run build

# Serve with PM2
npm install -g pm2
pm2 start server.js --name avatar-backend
# Serve frontend with nginx or serve static files from Express
```

## Environment Variables

### Frontend (.env.production)
```
VITE_API_URL=https://your-backend-domain.com/api/claude
```

### Backend (Production)
```
CLAUDE_API_KEY=your-claude-api-key
PORT=3001
NODE_ENV=production
```

## Deployment Steps

1. **Setup Backend:**
   - Deploy `server.js` to Railway/Render
   - Set `CLAUDE_API_KEY` environment variable
   - Note the deployed backend URL

2. **Setup Frontend:**
   - Update `.env.production` with backend URL
   - Deploy to Vercel/Netlify
   - Set `VITE_API_URL` environment variable

3. **Test:**
   - Visit frontend URL
   - Test terminal interaction
   - Verify API calls work

## Notes
- 3D assets (GLTF files) are included in build
- No database required (stateless conversation)
- CORS configured for production domains
- Health check endpoint: `/health`