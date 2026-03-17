# Pageforge — St Peter's Library Reading Tracker

Pageforge is a full-stack web application built for **St Peter's Prep School** that tracks and gamifies student reading. It connects students, teachers, and librarians around a shared goal: encouraging reading across the school through logging, verification, points, leaderboards, and real-time updates.

## Core Concept

Students log books they've read. Teachers and librarians verify those logs. Once approved, students earn **Reading XP points** based on word count (1 point per 1,000 words). Points unlock progression through a **9-tier ranking system** inspired by Minecraft materials — from Redstone (Beginner, 50 pts) all the way to Netherite (Apex, 2,000 pts). Students compete on multiple leaderboards and can earn certificates.

## Three User Roles

| Role | What they can do |
|---|---|
| **Student** | Log books (title, author, rating, comment), view personal stats (books read, Lexile level, average Lexile), track Reading XP and tier progress, view leaderboards, see announcements |
| **Teacher** | View reading logs for students in their grade/class, comment on and react to student book logs, filter and search logs, track class reading progress |
| **Librarian** | Full access to all logs school-wide, verify/approve/reject book submissions, manage announcements, adjust student points, manage student accounts, manage Lexile levels (individual + bulk), view analytics (tier breakdowns), issue certificates |

All users must authenticate with an `@stpeters.co.za` email address.

## Key Features

### 1. Book Logging & Verification

- Students submit book logs with metadata (title, author, rating, comment). The system enriches entries with word count, Lexile level, genres, age range, and cover image via a book search service.
- Books enter a **Pending** state and must be approved by a teacher or librarian before points are awarded. They can also be rejected with a verification note.

### 2. Points & Tier System (Reading XP)

Points are calculated automatically when a book is approved: `floor(wordCount / 1000)` points, with a minimum of 1 point per book.

Nine tiers with escalating thresholds:

| Tier | Name | Points Required |
|---|---|---|
| Redstone | Beginner | 50 |
| Copper | Explorer | 60 |
| Emerald | Guardian | 75 |
| Lapis | Champion | 125 |
| Iron | Master | 200 |
| Gold | Hero | 400 |
| Diamond | Legend | 800 |
| Obsidian | Mythic | 1,200 |
| Netherite | Apex | 2,000 |

### 3. Leaderboards

- **By Grade** — compare within your grade level
- **School-wide** — compete across all grades
- **Words Read** — total words consumed
- **Lexile Level** — highest average reading level

Leaderboards update in real-time via Socket.io.

### 4. Lexile Level Tracking

- Each student has a Lexile reading level that can be set per term (Term 1–3) and academic year.
- Librarians can update Lexile levels individually or in bulk for an entire class.

### 5. Announcements

- Librarians can create, edit, and delete school-wide announcements visible to all users.

### 6. Teacher Feedback

- Teachers can leave comments on student book logs and react to comments, enabling meaningful reading conversations.

### 7. Certificates

- Students can view and generate certificates for their reading achievements.

### 8. Admin / Library Management

- Librarians have a full admin panel to manage student accounts (create, edit, bulk update, delete), adjust points, and view analytics like tier breakdowns by grade or class.

## Technical Architecture

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite, styled with TailwindCSS + shadcn/ui, animated with Framer Motion, API calls via Axios, real-time via Socket.io client |
| **Backend** | Node.js + Express + TypeScript, JWT authentication, Passport.js (Google OAuth), raw SQL via pg (node-postgres), Socket.io server |
| **Database** | PostgreSQL hosted on Railway |
| **Deployment** | Railway (three services: Postgres, backend, frontend) |

### Authentication

JWT tokens (7-day expiry) with Google OAuth restricted to the `@stpeters.co.za` domain. There is also a local email/password signup flow for students.

### Real-Time Events

Socket.io events are emitted when books are logged, verified, or when points/leaderboards change, so dashboards stay current without manual refresh.

## Database Models

| Table | Purpose |
|---|---|
| `User` | All users with role, grade, class, Lexile level, and optional Google ID |
| `Book` | Reading logs linked to a user, with verification status and points tracking |
| `Point` | Accumulated total points per student |
| `Comment` | Teacher feedback on book logs, with reactions |
| `Announcement` | School-wide messages from librarians |
| `StudentLexile` | Per-term, per-year Lexile level history |

## API Endpoints

### Authentication

- `POST /auth/signup` — Student registration
- `POST /auth/login` — Email/password login
- `GET /auth/me` — Get current user
- `POST /auth/logout` — Logout

### Books

- `GET /api/books` — Get books (filtered by role)
- `POST /api/books` — Log a new book
- `PUT /api/books/:id` — Update book
- `DELETE /api/books/:id` — Delete book
- `PATCH /api/books/:id/verification` — Approve or reject a book
- `DELETE /api/books/bulk` — Bulk delete books
- `PATCH /api/books/bulk` — Bulk update books

### Leaderboards

- `GET /api/leaderboard/by-grade?grade=` — Grade leaderboard
- `GET /api/leaderboard/school` — School-wide leaderboard
- `GET /api/leaderboard/words` — Most words read
- `GET /api/leaderboard/lexile` — Highest average Lexile

### Comments

- `GET /api/comments/:bookId` — Get comments for a book
- `POST /api/comments` — Add comment (teacher only)
- `PUT /api/comments/:id/react` — React to a comment
- `DELETE /api/comments/:id` — Delete comment

### Announcements

- `GET /api/announcements` — Get announcements
- `POST /api/announcements` — Create (librarian only)
- `PUT /api/announcements/:id` — Update (librarian only)
- `DELETE /api/announcements/:id` — Delete (librarian only)

### Points

- `GET /api/points/:userId` — Get user points
- `POST /api/points/adjust` — Adjust points (librarian only)

### Lexile

- `GET /api/lexile/student/:userId` — Get student Lexile history
- `POST /api/lexile/student/:userId` — Set student Lexile
- `POST /api/lexile/bulk` — Bulk update Lexile levels (librarian only)
- `GET /api/lexile/class` — Get class Lexile data

### Admin

- `GET /api/admin/students` — List students
- `POST /api/admin/students` — Create student
- `PUT /api/admin/students/:id` — Update student
- `PATCH /api/admin/students/bulk` — Bulk update students
- `DELETE /api/admin/students/bulk` — Bulk delete students
- `DELETE /api/admin/students/:id` — Delete student

### Analytics

- `GET /api/analytics/tier-breakdown?groupBy=&tier=` — Tier breakdown analytics

## Design & UX

The app uses a warm, friendly visual design aimed at primary school students:

- **Primary colour:** Coral (#FF6B6B)
- **Secondary:** Sunny Gold (#FBBF24)
- **Accent:** Sky Blue (#38BDF8)
- **Font:** Nunito (rounded, approachable)
- Mobile-first responsive layout with modern rounded cards, backdrop-blur modals, and subtle Framer Motion animations

## Summary

Pageforge is a **gamified reading tracker** that makes reading measurable and fun for students, gives teachers visibility into their class's reading habits, and gives librarians full administrative control over the school's reading programme — all tied together with real-time updates, a tiered progression system, and competitive leaderboards.
