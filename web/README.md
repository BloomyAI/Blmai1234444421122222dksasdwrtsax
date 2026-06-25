# Bloomy AI Web Application

Premium web application for Bloomy AI with glassmorphism UI and smooth animations.

## Features

- **Premium UI**: Glassmorphism design with smooth animations
- **4-Model System**: Mini, Standard, Pro, and Code tiers
- **Chat Interface**: Claude-like chat experience with conversation management
- **Code Editor**: VS Code-like IDE with build configurations
- **Downloads**: Platform downloads for Windows, macOS, Linux, iOS, Android
- **Authentication**: OAuth support (Google, Apple, Discord, Email)
- **Backend API**: FastAPI server for AI model integration
- **Security First**: Enterprise-grade encryption, API key vault, session management

## Tech Stack

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **TailwindCSS**: Utility-first CSS framework
- **Framer Motion**: Smooth animations
- **Lucide React**: Beautiful icons
- **FastAPI**: Python backend server
- **Bloomy AI**: Custom AI models based on the most powerful models that exist 

## Getting Started

### Prerequisites

- Node.js 18+ 
- Python 3.8+
- npm or yarn

### Installation

1. Navigate to the web directory:
```bash
cd web
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
cd server
pip install -r requirements.txt
cd ..
```

### Running the Application

**Option 1: Run both frontend and backend**
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
npm run server
```

**Option 2: Run frontend only (uses mock API)**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Branding Colors

- **Pink**: #FF69B4
- **Purple**: #A855F7
- **Blue**: #6366F1
- **Navy**: #0F0F3D

## Backend API

The backend server runs on port 8000 and provides the following endpoints:

- `GET /api/models` - Get available AI models
- `POST /api/chat` - Send chat messages
- `GET /api/conversations` - Get all conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/{id}` - Get specific conversation
- `DELETE /api/conversations/{id}` - Delete conversation
- `GET /health` - Health check

## Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   ├── chat/             # Chat page
│   │   ├── editor/           # Code editor page
│   │   ├── agents/           # AI agents page
│   │   ├── settings/         # Settings page
│   │   ├── login/            # Login page
│   │   ├── downloads/        # Downloads page
│   │   ├── globals.css      # Global styles with glassmorphism
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Main page
│   └── lib/
│       └── backend.ts        # Backend integration
├── server/
│   ├── main.py              # FastAPI server
│   └── requirements.txt     # Python dependencies
├── public/                 # Static assets
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── tailwind.config.ts     # Tailwind config
└── next.config.js         # Next.js config
```

## License

MIT
