# 📚 St Peter's Library Reading Tracker

A comprehensive web application for tracking student reading progress, built for St Peter's school library.

## 🌟 Features

### For Students
- 📖 Log books with ratings, comments, and metadata
- 🏆 Earn points based on words read (1 point for every 1,000 words)
- 📊 View personalized reading statistics
- 🥇 Compete on multiple leaderboards (Grade, School, Words Read, Lexile Level)
- 📱 Beautiful, responsive interface with animations

### For Teachers
- 👀 View reading logs from students in their grade/class
- 💬 Comment on and react to student book logs
- 🔍 Filter and search book logs
- 📈 Track class reading progress

### For Librarians
- 🌐 Full access to all student reading logs across the school
- 📢 Create and manage school-wide announcements
- 📊 Comprehensive school statistics
- ⚙️ Manage student points and data

## 🛠️ Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS + shadcn/ui (styling)
- Framer Motion (animations)
- Socket.io Client (realtime updates)
- Axios (API requests)

**Backend:**
- Node.js + Express + TypeScript
- Passport.js (Google OAuth authentication)
- pg (node-postgres) - PostgreSQL client
- Socket.io (realtime features)
- JWT (session management)

**Database:**
- PostgreSQL (Railway hosted)

**Deployment:**
- Railway (Postgres + Backend + Frontend)

## 📋 Prerequisites

- Node.js 18+ and npm/pnpm
- Railway account with Postgres database
- Google Cloud Project with OAuth 2.0 credentials
- School domain verification (@stpeters.co.za)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/library-reading-tracker.git
cd library-reading-tracker
```

### 2. Install Dependencies

```bash
npm install
```

This will install dependencies for both frontend and backend workspaces.

### 3. Set Up Railway Postgres

1. Create a new project on [Railway](https://railway.app)
2. Add a Postgres database service
3. Copy the DATABASE_URL from Railway

### 4. Configure Environment Variables

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://user:pass@host:port/db
PORT=3001
NODE_ENV=development

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

JWT_SECRET=your_random_jwt_secret_here
SESSION_SECRET=your_random_session_secret_here

FRONTEND_URL=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:3001
```

### 5. Set Up Google OAuth

Follow the detailed guide in [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) to:
- Create a Google Cloud project
- Enable Google+ API
- Create OAuth 2.0 credentials
- Restrict to @stpeters.co.za domain
- Configure consent screen

### 6. Database Setup

The database schema should already exist. If you need to create tables manually, refer to the Prisma schema file (`prisma/schema.prisma`) and create the tables using SQL or Prisma migrations.

**Note:** This project uses `pg` (node-postgres) for database access. The Prisma schema file is kept for reference only.

### 7. Seed the Database (Optional)

```bash
npm run seed
```

This creates test data:
- 1 Librarian
- 2 Teachers
- 30 Students (Grades 3-7, Classes A & B)
- Sample book logs
- Sample announcements

**Test Login Credentials:**
- Librarian: `librarian@stpeters.co.za`
- Teacher: `teacher1@stpeters.co.za` (Grade 3A)
- Student: `student3a1@stpeters.co.za` (Grade 3A)

### 8. Start Development Servers

```bash
# Start both frontend and backend
npm run dev

# Or start separately:
npm run dev:frontend  # Starts on http://localhost:5173
npm run dev:backend   # Starts on http://localhost:3001
```

### 9. Access the Application

Open http://localhost:5173 in your browser and sign in with a test account.

## 📁 Project Structure

```
library-reading-tracker/
├── frontend/                # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts (Auth)
│   │   ├── lib/            # Utilities (API, Socket, etc.)
│   │   └── App.tsx         # Main app component
│   └── package.json
├── backend/                 # Express backend API
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── middleware/     # Auth, error handling
│   │   ├── auth/           # Passport configuration
│   │   ├── lib/            # Utilities (Prisma client)
│   │   └── server.ts       # Server entry point
│   └── package.json
├── prisma/                  # Database schema (reference only, migrations handled via SQL)
│   └── schema.prisma
├── scripts/                 # Utility scripts
│   └── seed.ts             # Database seeding script
└── package.json            # Root workspace configuration
```

## 📊 Database Schema

**Users** - Students, teachers, and librarians
**Books** - Reading logs with metadata
**Points** - Point tracking for students
**Comments** - Teacher feedback on books
**Announcements** - School-wide messages

See [prisma/schema.prisma](./prisma/schema.prisma) for the database schema reference. The application uses `pg` (node-postgres) for database access.

## 🔐 Authentication & Authorization

- Google OAuth 2.0 with domain restriction to `@stpeters.co.za`
- JWT tokens for session management
- Role-based access control (STUDENT, TEACHER, LIBRARIAN)
- Automatic point system (1 point per 1,000 words once a book is approved)

## 🎨 Design System

**Colors:**
- Primary: Coral (#FF6B6B) — bright, friendly, encourages reading
- Secondary: Sunny Gold (#FBBF24)
- Accent: Sky Blue (#38BDF8)
- Background: Warm cream/peach gradient

**Typography:**
- Body & Headings: Nunito (round, friendly, modern)

**Components:**
- Built with shadcn/ui
- Modern rounded cards (rounded-2xl), modals with backdrop blur
- Bright, happy palette to encourage reading
- Animated with Framer Motion

## 🔄 Realtime Features

The app uses Socket.io for realtime updates:
- Leaderboard updates when books are logged
- New announcement notifications
- Live point updates

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed Railway deployment instructions.

## 📝 API Endpoints

### Authentication
- `GET /auth/google` - Initiate OAuth flow
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

### Books
- `GET /api/books` - Get books (filtered by role)
- `POST /api/books` - Log a new book
- `PUT /api/books/:id` - Update book
- `DELETE /api/books/:id` - Delete book

### Leaderboards
- `GET /api/leaderboard/by-grade?grade=:grade` - Grade leaderboard
- `GET /api/leaderboard/school` - School leaderboard
- `GET /api/leaderboard/words` - Most words read
- `GET /api/leaderboard/lexile` - Highest avg Lexile

### Comments
- `GET /api/comments/:bookId` - Get comments for a book
- `POST /api/comments` - Add comment
- `PUT /api/comments/:id/react` - React to comment

### Announcements
- `GET /api/announcements` - Get announcements
- `POST /api/announcements` - Create (librarian only)
- `DELETE /api/announcements/:id` - Delete (librarian only)

### Points
- `GET /api/points/:userId` - Get user points
- `POST /api/points/adjust` - Adjust points (librarian only)

## 🧪 Testing

```bash
# Run linter
npm run lint

# Build for production
npm run build
```

## 🤝 Contributing

This is a school project for St Peter's. For issues or suggestions, please contact the library staff.

## 📄 License

Proprietary - St Peter's School

## 🆘 Support

For technical issues:
1. Check the [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section
2. Review the [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) for auth issues
3. Contact the development team

---

**Built with ❤️ for St Peter's Library**

