# InVideo AI Studio

A full-stack AI-powered video content creation studio featuring script generation, thumbnail/image generation, and high-performance image editing with Rust WebAssembly filters.

## 🎯 Features

### 1. Script Generator
- Generate structured video scripts using Google Gemini AI
- Multi-turn conversations to refine and edit scripts
- Outputs JSON with segments containing timestamps, visual cues, and audio scripts
- Save and manage generated scripts

### 2. Thumbnail Generator
- **Text-to-Image**: Generate images from text prompts
- **Image Editing**: Edit existing images with text prompts
- **Multi-Image Composition**: Combine multiple images into new scenes
- **Iterative Refinement**: Multi-turn conversations to refine images
- Multiple aspect ratios (16:9, 1:1, 9:16, 4:3)

### 3. Image Filter Editor
- **10 Rust WASM Filters**: Grayscale, Invert, Sepia, Brightness, Contrast, Blur, Sharpen, Edge Detect, Emboss, Gaussian Blur
- High-performance image processing via WebAssembly
- Adjustable filter intensity
- Undo/Redo history
- Export and save to cloud storage

### 4. Authentication & Usage Limits
- **Supabase Auth**: Email/password authentication
- **Usage Tracking**: 15 script generations and 10 image generations per user
- **Admin Account**: Unlimited usage for admin users
- **Real-time Usage Display**: See remaining generations in the UI

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Script    │  │  Thumbnail  │  │     Image Editor        │  │
│  │  Generator  │  │  Generator  │  │  (Rust WASM Filters)    │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                     │                 │
│         └────────────────┼─────────────────────┘                 │
│                          │                                       │
│              ┌───────────▼───────────┐                          │
│              │    Supabase Client    │ (Auth + Storage)         │
│              └───────────┬───────────┘                          │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTP/REST + JWT Auth
┌──────────────────────────▼──────────────────────────────────────┐
│                    Backend (Elixir Phoenix)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Auth &    │  │   Script    │  │      Images &           │  │
│  │   Usage     │  │ Controller  │  │      Refinement         │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                     │                 │
│         └────────────────┼─────────────────────┘                 │
│                          │                                       │
│              ┌───────────▼───────────┐                          │
│              │    Gemini AI Client   │                          │
│              └───────────┬───────────┘                          │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     External Services                            │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │  Google Gemini API  │    │   Supabase                      │ │
│  │  - gemini-2.5-flash │    │   - Auth (JWT)                  │ │
│  │  - Text generation  │    │   - Postgres (Users, Scripts)   │ │
│  │  - Image generation │    │   - Storage (Assets)            │ │
│  └─────────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + TypeScript | UI framework |
| | Vite 7 | Build tool & dev server |
| | Rust → WebAssembly | High-performance image filters |
| | Supabase JS Client | Auth + Storage |
| | Lucide React | Icons |
| **Backend** | Elixir 1.19 | Functional programming language |
| | Phoenix 1.8 | Web framework |
| | Ecto | Database ORM |
| | Joken + JOSE | JWT verification |
| | Req | HTTP client for Gemini API |
| **Database** | Supabase (PostgreSQL 17) | Managed Postgres + Auth + Storage |
| **AI** | Google Gemini 2.5 Flash | Text & image generation |

---

## 🚀 Quick Start
 
 ### Prerequisites
 
- **Node.js** 20+ (with npm)
- **Elixir** 1.17+ (with Mix)
- **Rust** (with cargo and wasm-pack)
- **Supabase** account (for database, auth & storage)
- **Google AI Studio** API key
 
 ### 1. Clone & Setup
 
 ```bash
 cd invideo-assignment
 
 # Install frontend dependencies
 cd frontend && npm install
 
 # Build WASM module
 npm run build:wasm
 
 # Install backend dependencies
 cd ../backend && mix deps.get
 ```
 
 ### 2. Configure Supabase
 
 1. Create a new Supabase project at [supabase.com](https://supabase.com)
 2. Go to **Project Settings → API**:
    - Copy the **Project URL** → `VITE_SUPABASE_URL`
    - Copy the **anon/public key** → `VITE_SUPABASE_ANON_KEY`
    - Copy the **JWT Secret** → `SUPABASE_JWT_SECRET`
 3. Go to **Project Settings → Database**:
    - Copy the **Connection string (Session pooler)** → `DATABASE_URL`
 4. Create a storage bucket named `assets` with public access
 
 ### 3. Environment Variables
 
 Create `.env` files using the templates provided:
 
 **Backend (`backend/.env`):**
 ```bash
 cp backend/.env.template backend/.env
 # Edit backend/.env with your keys
 ```
 
 **Frontend (`frontend/.env`):**
 ```bash
 cp frontend/.env.template frontend/.env
 # Edit frontend/.env with your keys
 ```
 
 ### 4. Run Migrations & Seed
 
 ```bash
 cd backend
 mix ecto.migrate
 mix run priv/repo/seeds.exs
 ```
 
 This creates:
 - Demo user: `demo` / `demo123`
 - Admin user: `admin@invideo-assignment.com` / `admin-invideo-assignment`
 
 ### 5. Start Development Servers
 
 ```bash
 # Terminal 1 - Backend
 cd backend && ./start.sh
 
 # Terminal 2 - Frontend
 cd frontend && npm run dev
 ```
 
 Open [http://localhost:5173](http://localhost:5173)
 
 ---
 
 ## 🔐 Authentication
 
 ### User Registration
 Users can sign up with email/password at `/signup`. They get:
 - **15 script generations**
 - **10 image generations/edits**
 
 ### Admin Access
 The admin account has **unlimited** usage:
 - Email: `admin@invideo-assignment.com`
 - Password: `admin-invideo-assignment`
 
 ### How It Works
 1. Frontend uses Supabase Auth for login/signup
 2. Supabase returns a JWT token
 3. Frontend sends JWT in `Authorization: Bearer <token>` header
 4. Backend verifies JWT using Supabase JWT secret
 5. Backend creates/retrieves user and tracks usage
 
 ---
 
 ## 🚀 Production Deployment
 
 This project is designed to be deployed as a **monorepo**.
 
 ### Backend (Railway)
 1. Create a new project on [Railway](https://railway.app) from your GitHub repo.
 2. Set the **Root Directory** in Railway settings to `/backend`.
 3. Add the following environment variables:
    - `DATABASE_URL`: Your Supabase connection string
    - `SECRET_KEY_BASE`: Generate with `mix phx.gen.secret`
    - `GEMINI_API_KEY`: Your Google AI key
    - `SUPABASE_JWT_SECRET`: From Supabase API settings
    - `PHX_HOST`: Your Railway domain (e.g. `xxx.up.railway.app`)
    - `POOL_SIZE`: `10`
 
 ### Frontend (Vercel)
 1. Create a new project on [Vercel](https://vercel.com) from your GitHub repo.
 2. Set the **Root Directory** in Vercel settings to `frontend`.
 3. The `vercel.json` file will automatically handle the build command and WASM installation.
 4. Add the following environment variables:
    - `VITE_API_BASE_URL`: Your Railway backend URL (no trailing slash)
    - `VITE_SUPABASE_URL`: Your Supabase project URL
    - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
    - `VITE_SUPABASE_STORAGE_BUCKET`: `assets`

---

## 📡 API Reference

### Authentication
```
GET  /api/auth/me        → Current user + usage stats
GET  /api/auth/usage     → Usage stats only
POST /api/auth/login     → Legacy login (optional)
```

### Scripts
```
POST   /api/script/generate  → Generate script (uses quota)
GET    /api/scripts          → List saved scripts
POST   /api/scripts          → Save script
GET    /api/scripts/:id      → Get script
DELETE /api/scripts/:id      → Delete script
```

### Images
```
POST   /api/images/generate  → Generate image (uses quota)
POST   /api/images/edit      → Edit image (uses quota)
POST   /api/images/compose   → Compose images (uses quota)
GET    /api/images           → List saved images
POST   /api/images           → Save image metadata
DELETE /api/images/:id       → Delete image
```

### Refinement Sessions
```
POST /api/refine/sessions            → Create session
GET  /api/refine/sessions            → List sessions
POST /api/refine/sessions/:id/turns  → Add turn (uses quota if generates image)
GET  /api/refine/sessions/:id/turns  → List turns
```

---

## 🔧 Development

### Running Tests

```bash
# Backend tests
cd backend && mix test

# Frontend type check
cd frontend && npm run build
```

### Building for Production

```bash
# Frontend
cd frontend
npm run build:wasm
npm run build
# Output in frontend/dist/

# Backend
cd backend
MIX_ENV=prod mix compile
```

---

## 🐛 Troubleshooting

### "Authentication required" Error
- Ensure you're logged in
- Check that `SUPABASE_JWT_SECRET` is set correctly in backend
- Verify Supabase project URL matches between frontend and backend

### "Limit exceeded" Error
- Normal users have 15 script and 10 image generations
- Use the admin account for unlimited access
- Check usage in the user dropdown menu

### Database Connection Issues
- Verify the Supabase pooler hostname (might be `aws-0`, `aws-1`, etc.)
- Ensure `DATABASE_PREPARE=unnamed` is set
- Check SSL settings

### CORS Errors
- Ensure `CORS_ORIGINS` includes your frontend URL exactly
- No trailing slashes

---

## 📄 License

MIT License - See LICENSE file for details.

---

## 🙏 Credits

- **Elixir/Phoenix** - Backend framework
- **React** - Frontend framework  
- **Rust/WebAssembly** - High-performance image processing
- **Google Gemini** - AI text and image generation
- **Supabase** - Auth, Database, and Storage infrastructure
