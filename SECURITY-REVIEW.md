## Executive summary

- **Overall risk rating**: **High** (several exploitable server-side authz/IDOR and SQL injection issues that a capable student could abuse via dev tools / custom requests).
- **Top 5 weaknesses**
  - **Unvalidated dynamic `ORDER BY` field → SQL injection** via `sortBy` in `backend/src/routes/books.ts` → `backend/src/lib/db-helpers.ts`.
  - **Multiple IDORs on user/points/books data** (points, stats, book lists) – path parameters and query parameters are not tied to the authenticated user or their class/grade.
  - **JWT secret fallback to weak hardcoded value** – `process.env.JWT_SECRET || 'your-secret-key'` in `backend/src/middleware/auth.ts`.
  - **Socket.io unauthenticated broadcast of events** (book and announcement events leak to all connected clients).
  - **No rate limiting or audit logging** – brute-force and spam are feasible, and sensitive actions are not traceable.
- **Top 5 immediate fixes**
  - **Whitelist and validate `sortBy` / `orderBy.field`** before building SQL in `db-helpers.ts` for book queries (or map to known column names server-side).
  - **Enforce ownership/role checks on all ID-based routes** (`/users/:id/stats`, `/points/:userId`, book listing with `userId` query, comment/announcement access).
  - **Remove the hardcoded JWT secret fallback** and fail fast if `JWT_SECRET` is missing.
  - **Introduce Socket.io auth** (JWT verification on connection, and/or partition rooms by user/grade/role) and limit event payloads to what each role should see.
  - **Add basic rate limiting and audit logging** on auth, book logging, verification, points adjustment, and admin/student management routes.

---

### AUTHENTICATION

#### 1. How are JWTs created, signed, stored, validated, and expired?

1. **What I found**
   - **Creation**: In `backend/src/middleware/auth.ts`, a helper like `generateToken(userId, email, role)` creates JWTs with payload `{ userId, email, role }`, signed with `JWT_SECRET` and **7 day** expiry.
   - **Validation**: Same file, `verifyToken(token)` + `requireAuth` middleware read the `Authorization: Bearer <token>` header, call `jwt.verify`, and attach `req.user`.
   - **Storage (client)**: In `frontend/src/contexts/AuthContext.tsx` + `frontend/src/lib/api.ts`, the token is stored in `localStorage` (key like `auth_token`) and read into Axios `Authorization` header.
2. **Why it is a risk**
   - `localStorage` storage makes the JWT accessible to any XSS on the origin.
3. **How it could be exploited**
   - If a student finds or introduces an XSS somewhere (e.g. via comments/announcements if not correctly escaped), they can read `localStorage.auth_token` from dev tools and reuse the token to impersonate that user (until expiry).
4. **Exact code/files**
   - `backend/src/middleware/auth.ts` (JWT helpers, `requireAuth`).
   - `frontend/src/contexts/AuthContext.tsx` (get/set token).
   - `frontend/src/lib/api.ts` (Axios `Authorization` header injection).
5. **Recommended fix**
   - Consider **HttpOnly, Secure cookies** for JWT storage instead of `localStorage`, or at least harden against XSS (strict Content Security Policy, sanitization on any user-generated content).
6. **Priority**: **Medium** (significant impact if combined with XSS, but I didn’t see direct XSS sinks; see Q37–38).

---

#### 2. Are JWT signatures properly verified on every protected request?

1. **What I found**
   - Protected backend routes use `requireAuth` (and `requireTeacher`/`requireLibrarian`) from `backend/src/middleware/auth.ts`.
   - `requireAuth` explicitly calls `jwt.verify` with `JWT_SECRET` and **rejects invalid/expired tokens** with 401.
2. **Why it is a risk**
   - It’s **not** a risk where used correctly; signature verification is in place. The risk lies more in which routes are missing `requireAuth` or do weak authorization on top.
3. **How it could be exploited**
   - If any route fails to use `requireAuth` (I didn’t see obvious missing checks on sensitive routes) or reads `req.user` without verification, students could call it unauthenticated or with forged tokens. In current reviewed routes, main sensitive routes do use `requireAuth`.
4. **Exact code/files**
   - `backend/src/middleware/auth.ts` (`requireAuth` implementation).
   - `backend/src/routes/*.ts` imports and uses `requireAuth` / `requireLibrarian` / `requireTeacher`.
5. **Recommended fix**
   - Ensure **every non-public API route** always includes `requireAuth` before role middlewares.
   - Avoid any direct trust in `req.headers.authorization` outside `requireAuth`.
6. **Priority**: **Medium** (current implementation is mostly correct; key risk is omission, not logic).

---

#### 3. Can a student alter token contents client-side and gain extra access?

1. **What I found**
   - JWT is signed with `JWT_SECRET;` signature is always verified in `requireAuth`.
   - Role and user ID are read from the token **payload** but used **mostly as hints**; critical queries still use IDs from the request path in several routes (IDORs).
2. **Why it is a risk**
   - Students can’t just edit the token string because the signature will fail, but **backend often trusts path/query IDs without cross-checking against token’s `userId`**, leading to privilege escalation in another way (IDOR), not via token tampering.
3. **How it could be exploited**
   - Student keeps a valid token but crafts requests like `GET /points/123` or `GET /users/456/stats` – server uses `:userId` or `:id` from the URL, **not** the token’s `userId`, so they can access other students’ data without modifying the token.
4. **Exact code/files**
   - `backend/src/routes/users.ts` – `/users/:id/stats` uses `req.params.id`.
   - `backend/src/routes/points.ts` – `/points/:userId` uses `req.params.userId`.
5. **Recommended fix**
   - For student-facing endpoints, **ignore userId in URL** and always use `req.user.id` from the verified token, or at least **validate that `req.user.id === params.id`** unless the role is TEACHER/LIBRARIAN with explicit permissions.
6. **Priority**: **High** (easy for a student to exploit via dev tools; direct data exposure).

---

#### 4. Are there any routes that trust token payload fields without checking the database?

1. **What I found**
   - Role-based middlewares (`requireTeacher`, `requireLibrarian`) check `req.user.role` from the token payload; they **do not re-check** against the database each request.
   - Role changes in DB do **not** invalidate existing tokens.
2. **Why it is a risk**
   - If a user’s role is downgraded in DB (e.g. TEACHER → STUDENT), their existing JWT will still claim a higher role until expiry.
3. **How it could be exploited**
   - A student promoted to TEACHER and later demoted could **continue using an old token** to access teacher/librarian routes for up to 7 days.
4. **Exact code/files**
   - `backend/src/middleware/auth.ts` – `requireTeacher`, `requireLibrarian` use `req.user.role`.
   - `backend/src/routes/admin.ts` – admin student management (where roles may be changed).
5. **Recommended fix**
   - On **role changes**, issue a mechanism to revoke old tokens (e.g. `tokenVersion` stored in DB and included in JWT; check on each request).
6. **Priority**: **Medium** (needs privilege change scenario; not trivial for a student, but important for long-term integrity).

---

#### 5. Is logout meaningful, or do tokens remain valid until expiry?

1. **What I found**
   - Logout endpoint clears token on the **client** (`AuthContext` removes token from `localStorage`) and might call a backend `/auth/logout` that does nothing server-side to invalidate tokens.
   - JWTs continue to be valid until their **7-day expiry**.
2. **Why it is a risk**
   - Logout is **purely client-side**; a copied or stolen token continues to work.
3. **How it could be exploited**
   - If a student obtains another student’s token (via XSS or shoulder-surfing dev tools), they can keep using it even after the victim logs out.
4. **Exact code/files**
   - `frontend/src/contexts/AuthContext.tsx` – `logout()` clears local token only.
   - `backend/src/routes/auth.ts` – `/auth/logout` (if present) does not track token revocation.
5. **Recommended fix**
   - Implement a basic **token revocation mechanism** (e.g. `tokenVersion` or a short-lived JWT with a refresh token that can be invalidated) if you want true logout; at a minimum communicate clearly that logout is client-only.
6. **Priority**: **Medium**.

---

#### 6. Is there any refresh token flow, and if so, is it secure?

1. **What I found**
   - No refresh token endpoints or data structures were found.
2. **Why it is a risk**
   - **No specific risk** from a refresh flow because none exists.
3. **How it could be exploited**
   - N/A.
4. **Exact code/files**
   - `backend/src/routes/auth.ts` – login, signup, /me; **no** `/refresh` or similar.
5. **Recommended fix**
   - If you add refresh tokens later, use **HttpOnly Secure cookies**, bind to device, and store rotation state in DB.
6. **Priority**: **Low** (not present).

---

#### 7. Are secrets hardcoded, weak, or exposed in the repo or env examples?

1. **What I found**
   - `JWT_SECRET` uses `process.env.JWT_SECRET || 'your-secret-key'` (weak fallback).
   - Other secrets (`GOOGLE_CLIENT_SECRET`, DB URL) are loaded only from env; I didn’t see actual real secrets committed, only env reads.
2. **Why it is a risk**
   - If `JWT_SECRET` is not set in production, the hardcoded default is trivial to guess, allowing attackers to forge arbitrary tokens.
3. **How it could be exploited**
   - A student who knows the codebase could:
     - Assume secret is `'your-secret-key'`.
     - Generate a valid JWT with `{ userId, role: 'LIBRARIAN' }` signed with that key.
     - Call librarian-only endpoints directly.
4. **Exact code/files**
   - `backend/src/middleware/auth.ts` – secret definition and JWT usage.
5. **Recommended fix**
   - **Remove the fallback**: require `JWT_SECRET` to be set and crash on startup if missing.
6. **Priority**: **Critical** if there’s any chance production is missing `JWT_SECRET`; otherwise **High**.

---

#### 8. Is Google OAuth restricted correctly to approved school domains?

1. **What I found**
   - `backend/src/auth/passport.ts` checks `profile.emails[0].value.endsWith('@stpeters.co.za')` and rejects others.
2. **Why it is a risk**
   - This part looks correct. However, Google OAuth is **not wired into the live auth flow** (Passport not used in `server.ts`).
3. **How it could be exploited**
   - Students cannot currently abuse Google OAuth for non-school emails because the OAuth flow isn’t used.
4. **Exact code/files**
   - `backend/src/auth/passport.ts` – GoogleStrategy callback with domain check.
5. **Recommended fix**
   - If you enable Google OAuth:
     - Keep the domain check.
     - Wire Passport into `server.ts` and `/auth/google` routes carefully, ensuring tokens are issued only after domain validation.
6. **Priority**: **Low** (feature unused as per live code).

---

#### 9. Can a user sign up with a non-school email?

1. **What I found**
   - `POST /auth/signup` validates that `email` **ends with** `@stpeters.co.za` and rejects otherwise.
2. **Why it is a risk**
   - Works as intended; no obvious bypass.
3. **How it could be exploited**
   - N/A; they cannot sign up with non-school email via this route.
4. **Exact code/files**
   - `backend/src/routes/auth.ts` – signup validation step.
5. **Recommended fix**
   - Keep this check; consider centralizing domain config (env var) for flexibility.
6. **Priority**: **Low**.

---

#### 10. Can local signup be abused to create fake student accounts or multiple accounts?

1. **What I found**
   - `POST /auth/signup` is **unauthenticated**; anyone with a school email can create a student account.
   - There’s no rate limiting and no extra approval step.
   - Email uniqueness is enforced by the DB (`UNIQUE` constraint), so you cannot use the same email twice, but multiple real students could sign themselves up rather than being centrally provisioned.
2. **Why it is a risk**
   - A student could:
     - Create multiple **fake** student accounts if they control more than one school-email-like address (e.g. different aliases if allowed).
     - There’s no teacher/librarian control over who is allowed to be a “student”.
3. **How it could be exploited**
   - A student signs up several “student” identities and uses them to push themselves up leaderboards, generate bogus reading activity, or farm points.
4. **Exact code/files**
   - `backend/src/routes/auth.ts` – `POST /auth/signup`.
5. **Recommended fix**
   - Consider **centralizing account creation** (e.g. librarians/admin-only) or verifying accounts via **class rosters** and restricting signups to pre-provisioned emails.
   - Add **rate limiting** to `/auth/signup`.
6. **Priority**: **Medium** (integrity issue more than direct privilege escalation).

---

### AUTHORISATION

#### 11. For every student, teacher, and librarian route, is authorisation enforced on the server or only hidden in the UI?

1. **What I found**
   - Server-side authorization exists:
     - `requireAuth` on most APIs.
     - `requireTeacher` for teacher routes (e.g. comments creation).
     - `requireLibrarian` for librarian/admin routes (book verification, points adjustment, announcements management, `admin.ts`).
   - The frontend also hides certain buttons/links based on `user.role`, but this is **not** the only protection.
2. **Why it is a risk**
   - The main risk is not **missing middleware**, but **insufficient resource-level checks** (IDOR; see below).
3. **How it could be exploited**
   - A student can’t simply hit a librarian-only endpoint without a librarian token, but they **can** abuse routes that only check `requireAuth` while trusting path/query IDs.
4. **Exact code/files**
   - `backend/src/middleware/auth.ts` – role middlewares.
   - `backend/src/routes/*.ts` – route-level middleware usage.
5. **Recommended fix**
   - Keep role middlewares, but **add per-resource authorization logic** (ownership/class/grade checks) in handlers.
6. **Priority**: **High** (because several routes are `requireAuth` only).

---

#### 12. Can a student call teacher-only or librarian-only endpoints directly?

1. **What I found**
   - Teacher-only and librarian-only routes:
     - Examples: `POST /comments`, `PATCH /books/:id/verification`, `POST /points/adjust`, `POST/PUT/DELETE /announcements`, `admin.ts` routes.
   - All such routes appear to be guarded by `requireTeacher` or `requireLibrarian`.
2. **Why it is a risk**
   - If a student were able to obtain a teacher/librarian JWT (e.g. via weak secret or session hijack), they could call these routes via dev tools.
3. **How it could be exploited**
   - Using the **weak JWT secret fallback**, a student could generate a librarian JWT locally and then:
     - Call `/books/:id/verification` to approve their own books.
     - Call `/points/adjust` to add points.
     - Call `admin` routes to manipulate student data.
4. **Exact code/files**
   - `backend/src/routes/books.ts` – verification route.
   - `backend/src/routes/points.ts` – `POST /adjust`.
   - `backend/src/routes/admin.ts` – student/admin management.
   - `backend/src/middleware/auth.ts` – uses `req.user.role`.
5. **Recommended fix**
   - Remove JWT secret fallback and **harden credentials**.
   - Optionally **log all librarian actions**; see auditability.
6. **Priority**: **Critical** (because of the weak secret issue).

---

#### 13. Can a teacher access or modify records outside their allowed class or grade?

1. **What I found**
   - Some routes (e.g. `lexile.ts` class-based views) enforce class/grade constraints.
   - But in `books.ts`, `GET /books` accepts a `userId` query param, and for TEACHER role it does **not** always enforce a class/grade filter robustly; code suggests teachers can specify arbitrary `userId`.
2. **Why it is a risk**
   - Teachers could possibly read book logs for **any** student ID, not just their assigned class/grade.
3. **How it could be exploited**
   - Teacher opens dev tools, modifies the API call to `GET /books?userId=<another student id>` and views logs for any student.
4. **Exact code/files**
   - `backend/src/routes/books.ts` – filtering by `userId` and role.
5. **Recommended fix**
   - For TEACHER routes, **always enforce** `userId` belongs to that teacher’s class/grade using a DB check and ignore/override arbitrary `userId` query parameters.
6. **Priority**: **High** (privacy and boundary of teacher visibility).

---

#### 14. Can a student read or edit another student’s books, points, profile, comments, or Lexile records by changing IDs?

1. **What I found**
   - Points:
     - `GET /points/:userId` only has `requireAuth`, **no ownership/role check**.
   - User stats:
     - `GET /users/:id/stats` has `requireAuth`, **no check** that `id === req.user.id` or is within teacher’s class.
   - Books:
     - `GET /books?userId=...` uses `userId` param; logic tries to restrict but is not fully safe (see Q13).
   - Comments:
     - `GET /comments/:bookId` returns comments for any `bookId` with `requireAuth`, no ownership.
2. **Why it is a risk**
   - These are classic **IDOR** vulnerabilities: access is determined by a user-supplied ID, not by binding to the authenticated user or their allowed cohort.
3. **How it could be exploited**
   - Student uses dev tools:
     - `GET /points/anotherStudentId` to see others’ point totals.
     - `GET /users/anotherStudentId/stats` for reading stats.
     - `GET /books?userId=anotherStudentId` to see another student’s reading logs if teacher logic isn’t solid.
4. **Exact code/files**
   - `backend/src/routes/points.ts` – `GET /points/:userId`.
   - `backend/src/routes/users.ts` – `GET /users/:id/stats`.
   - `backend/src/routes/books.ts` – `GET /books` handler.
   - `backend/src/routes/comments.ts` – `GET /comments/:bookId`.
5. **Recommended fix**
   - For **student** role:
     - Ignore path/userId parameters and force `userId = req.user.id`.
   - For **teacher**:
     - Enforce teacher’s class/grade via joins before allowing access.
   - For **librarian**:
     - Librarians can see all, but still audit access.
6. **Priority**: **High**.

---

#### 15. Are there any insecure direct object reference issues in routes using bookId, userId, commentId, announcementId, or class identifiers?

1. **What I found**
   - IDORs as above. Additionally:
     - Comments reactions: `PUT /comments/:id/react` – `requireAuth`, but no check that the user is allowed to interact with that comment/book context.
     - Announcements: `GET /announcements` is global (intended), but librarian updates use `:id` without additional checks; librarians are assumed trusted.
2. **Why it is a risk**
   - IDORs allow students to access or manipulate data not intended for them in certain cases.
3. **How it could be exploited**
   - Student enumerates `bookId`, `userId`, `commentId` values and calls APIs directly to gather intel (e.g. who is reading which books).
4. **Exact code/files**
   - `backend/src/routes/comments.ts`, `backend/src/routes/books.ts`, `backend/src/routes/users.ts`, `backend/src/routes/points.ts`.
5. **Recommended fix**
   - Enforce **resource-level authorization** for all ID-based routes, as described in Q14.
6. **Priority**: **High**.

---

#### 16. Are bulk update and bulk delete routes protected properly?

1. **What I found**
   - Bulk operations (e.g. lexile bulk updates, admin bulk student imports/updates) live in:
     - `backend/src/routes/lexile.ts` – bulk student lexile updates (requireTeacher/requireLibrarian).
     - `backend/src/routes/admin.ts` – bulk student import/update (requireLibrarian).
   - They all use `requireLibrarian` or appropriate teacher check.
2. **Why it is a risk**
   - Main risk is **abuse by a malicious librarian** (insider), not a student. From a student perspective, this seems adequately protected.
3. **How it could be exploited**
   - If a student manages to forge a librarian token (weak secret) they could hit bulk endpoints to update many students at once.
4. **Exact code/files**
   - `backend/src/routes/lexile.ts`, `backend/src/routes/admin.ts`.
5. **Recommended fix**
   - Harden JWT secret to prevent role forgery.
   - Add **audit logging** for bulk operations.
6. **Priority**: **High** (because combined with JWT secret issue it becomes dangerous).

---

#### 17. Can students access admin routes through crafted requests?

1. **What I found**
   - `backend/src/routes/admin.ts` is uniformly protected by `requireLibrarian`.
2. **Why it is a risk**
   - With a correct student token, they cannot access admin routes. With a **forged librarian token** (weak JWT secret) they can.
3. **How it could be exploited**
   - Student forges a JWT (if secret known/default) with `role: 'LIBRARIAN'` and hits `/admin/...` endpoints.
4. **Exact code/files**
   - `backend/src/routes/admin.ts`.
   - `backend/src/middleware/auth.ts` – `requireLibrarian`.
5. **Recommended fix**
   - Fix JWT secret handling (remove fallback).
   - Optionally add **IP-based or additional checks** for especially sensitive admin routes.
6. **Priority**: **Critical** (due to combination with Q7).

---

### BOOK LOGGING AND POINTS

#### 18. When a student submits a book, which fields are trusted from the client?

1. **What I found**
   - `POST /books` accepts client fields: `title`, `author`, `isbn`, `wordCount` (maybe), `lexile`, `rating`, `comment`, etc.
   - Server sets `status: PENDING` and `userId = req.user.id` (for student submissions).
   - Librarians may pass `targetUserId` to log books for students.
2. **Why it is a risk**
   - User-generated text fields (title, comment, notes) could become XSS risks if rendered unsanitized; currently they appear to be rendered as plain text, not HTML.
3. **How it could be exploited**
   - If in future any of these fields were inserted into `dangerouslySetInnerHTML`, students could inject scripts via book titles/comments.
4. **Exact code/files**
   - `backend/src/routes/books.ts` – `POST /books`.
   - `frontend/src/components/BookLogTable.tsx`, `frontend/src/components/BookDetails.tsx`.
5. **Recommended fix**
   - Maintain safe rendering (no `dangerouslySetInnerHTML`).
   - Optionally enforce input constraints on the backend (length, characters).
6. **Priority**: **Medium**.

---

#### 19. Can a student submit their own point value, verification status, word count, Lexile, or grade data?

1. **What I found**
   - Points:
     - Students cannot set `points` directly on submission; points are calculated or set by librarian during verification (`PATCH /books/:id/verification`).
   - Verification status:
     - Students can’t change `status`; server sets `PENDING`, and only librarians can change to `APPROVED` or `REJECTED`.
   - Word count and Lexile:
     - Client can send initial `wordCount` / `lexile`, but server also runs `searchAndUpdateBook` to override using external metadata when available.
   - Grade data:
     - Comes from user profile; not from book submission.
2. **Why it is a risk**
   - Minimal risk for points/status. Risk is more about trusting `wordCount`/`lexile` if external lookup fails.
3. **How it could be exploited**
   - If external lookup fails and fallback is to keep client-provided `wordCount`, a student could inflate word counts and thus points (if points somehow used those in future).
4. **Exact code/files**
   - `backend/src/routes/books.ts` – submission and verification logic.
   - `backend/src/lib/db-helpers.ts` – external lookup and update.
5. **Recommended fix**
   - On lookup failure, **cap** or ignore extreme values from the client; prefer teacher/librarian correction.
6. **Priority**: **Medium**.

---

#### 20. Is points calculation always done server-side?

1. **What I found**
   - Yes. Point calculation occurs in `backend/src/routes/books.ts` in verification handler:
     - Based on comparison of book Lexile vs student Lexile.
     - Librarian can override but that override is server-side too.
2. **Why it is a risk**
   - This is **good**; no client-side point calculation is trusted.
3. **How it could be exploited**
   - Not directly; risk lies in librarians being able to set arbitrary `points` but that’s role-based.
4. **Exact code/files**
   - `backend/src/routes/books.ts` – `PATCH /books/:id/verification`.
5. **Recommended fix**
   - None necessary; maybe add **caps/constraints** on manual overrides.
6. **Priority**: **Low**.

---

#### 21. Can points be awarded more than once for the same book through duplicate approvals, replayed requests, or race conditions?

1. **What I found**
   - Verification endpoint:
     - When moving from non-approved to approved, points are added.
     - When moving from approved to rejected, previous points are removed.
     - If the same `APPROVED` verification is replayed, code likely re-adds points unless there’s a check to see if the book is already approved (from the summary, it seems it adjusts based on status transition, but I didn’t see strong idempotency).
2. **Why it is a risk**
   - Without strict idempotent logic, repeated approvals could double-count points.
3. **How it could be exploited**
   - A librarian (or a forged librarian token) could replay `PATCH /books/:id/verification` with `APPROVED` multiple times if the code doesn’t guard against re-awarding.
4. **Exact code/files**
   - `backend/src/routes/books.ts` – verification transition handler.
5. **Recommended fix**
   - On verification, **calculate net delta** by reading current status and only applying points when transitioning from non-approved to approved; ignore repeated `APPROVED` calls.
6. **Priority**: **High** if current code lacks idempotency; otherwise **Medium**.

---

#### 22. Is there protection against duplicate book submissions for the same student?

1. **What I found**
   - I did not see a unique constraint or explicit check preventing the same `userId` + `isbn` (or title) from being logged multiple times.
2. **Why it is a risk**
   - Students can repeatedly submit the same book and rely on a librarian approving multiple entries, gaining extra points.
3. **How it could be exploited**
   - Student spams `POST /books` with the same book; if librarian approves multiple logs, points stack.
4. **Exact code/files**
   - `backend/src/routes/books.ts` – `POST /books`.
   - `backend/src/lib/db-helpers.ts` – book creation.
5. **Recommended fix**
   - Add a **uniqueness constraint** on `(userId, isbn)` and/or enforce this in the verification logic (only award points for the first approved instance).
6. **Priority**: **Medium**.

---

#### 23. Are there sanity checks on word count, title, author, rating, and comments?

1. **What I found**
   - There is some validation (e.g. required fields, types), but I did not see strong **range checks** (e.g. max lengths, max word count).
2. **Why it is a risk**
   - Without range limits:
     - Students could submit extremely long text fields → potential performance and UX issues.
     - Outlier values (e.g. 10 million word count) could distort analytics.
3. **How it could be exploited**
   - Student uses dev tools to send a payload with `wordCount: 9999999`, huge comment strings, etc.
4. **Exact code/files**
   - `backend/src/routes/books.ts` – validation logic for POST.
5. **Recommended fix**
   - Implement **strict length/range validations** server-side (e.g. title ≤ 200 chars, comments ≤ 1000, reasonable word count bounds).
6. **Priority**: **Medium**.

---

#### 24. If book metadata is enriched from an external service, what happens when lookup fails? Can the student then inject fake values?

1. **What I found**
   - `searchAndUpdateBook` in `db-helpers.ts` tries to fetch metadata (lexile/word count/genres).
   - On failure, it appears to leave existing values as-is (the student-provided ones).
2. **Why it is a risk**
   - When lookup fails, unverified client data is retained; if point logic reuses those later, they could be inflated.
3. **How it could be exploited**
   - Student intentionally uses a bogus ISBN or title so lookup fails, then supplies large `wordCount` or high Lexile to influence future scoring (if that logic ever uses them).
4. **Exact code/files**
   - `backend/src/lib/db-helpers.ts` – `searchAndUpdateBook`.
   - `backend/src/routes/books.ts` – where this is called.
5. **Recommended fix**
   - On lookup failure, **clamp** or ignore extreme client values; require librarian review for suspicious data.
6. **Priority**: **Medium**.

---

#### 25. Are librarian point adjustment routes logged and protected against misuse?

1. **What I found**
   - `POST /points/adjust` requires `requireLibrarian`; no explicit audit logging noted.
2. **Why it is a risk**
   - Lack of logging makes it difficult to detect abuse or mistakes.
3. **How it could be exploited**
   - Malicious or compromised librarian (or forged librarian JWT) can alter points silently.
4. **Exact code/files**
   - `backend/src/routes/points.ts` – `POST /adjust`.
5. **Recommended fix**
   - Add an **audit log entry** for each adjustment: who changed what, when, for which user, and by how much.
6. **Priority**: **High** (especially combined with JWT issues).

---

### VERIFICATION FLOW

#### 26. Can a student mark a book as approved by modifying the request?

1. **What I found**
   - Verification (`PATCH /books/:id/verification`) is guarded by `requireLibrarian`.
   - Students do not have access to this route with a valid student token.
2. **Why it is a risk**
   - Not directly; a student token cannot call this route successfully.
3. **How it could be exploited**
   - Only via **forged librarian token** exploiting the weak JWT secret fallback.
4. **Exact code/files**
   - `backend/src/routes/books.ts` – verification endpoint.
5. **Recommended fix**
   - Harden JWT secret / remove fallback.
6. **Priority**: **High** (because of token forgery path).

---

#### 27. Which exact roles are allowed to approve or reject a book?

1. **What I found**
   - Only **LIBRARIAN** (via `requireLibrarian`) can call `PATCH /books/:id/verification`.
2. **Why it is a risk**
   - No risk here; roles are appropriately limited by design.
3. **How it could be exploited**
   - Same as above: token forgery if JWT secret is weak.
4. **Exact code/files**
   - `backend/src/routes/books.ts`.
   - `backend/src/middleware/auth.ts` – `requireLibrarian`.
5. **Recommended fix**
   - None beyond JWT strengthening.
6. **Priority**: **Medium**.

---

#### 28. Is verification status transition controlled safely on the server?

1. **What I found**
   - Server side decides transitions:
     - `PENDING → APPROVED` awards points.
     - `PENDING → REJECTED` awards none.
     - `APPROVED → REJECTED` removes previously awarded points.
   - No client-side override for status other than request body hint.
2. **Why it is a risk**
   - Risk is mostly about **idempotency** and guarding against unexpected transitions.
3. **How it could be exploited**
   - If code is not strict, repeated APPROVED actions could re-award points.
4. **Exact code/files**
   - `backend/src/routes/books.ts` – status transition logic.
5. **Recommended fix**
   - Implement explicit **state machine checks**: only allow specific transitions and make re-applying same status a no-op.
6. **Priority**: **High** if idempotency missing.

---

#### 29. Is there an audit trail showing who approved or rejected a book and when?

1. **What I found**
   - I did not see an explicit audit log table or history entries for approvals/rejections.
   - The book record may store `verificationNote`, `verifiedById`, or timestamps, but I didn’t see a dedicated `verification_history` table.
2. **Why it is a risk**
   - Without historical records, it’s hard to detect misuse/abuse or revert incorrect actions.
3. **How it could be exploited**
   - Malicious librarian (or forged librarian) approves excessive books and later hides their tracks by editing or deleting.
4. **Exact code/files**
   - `backend/src/routes/books.ts` – sets fields on verification.
   - `prisma/schema.prisma` / `backend/src/types/database.ts` – book fields definition.
5. **Recommended fix**
   - Introduce an **audit log table** for verification actions, or a historical versioning system.
6. **Priority**: **Medium**.

---

#### 30. Can a previously approved book be re-approved for extra points?

1. **What I found**
   - Depends on actual code path. From the summary, there is logic to **remove points** when moving from APPROVED to REJECTED, and likely only add when going from non-approved to approved; but I didn’t see explicit guard against repeating APPROVED → APPROVED.
2. **Why it is a risk**
   - Lack of idempotency in approval logic can lead to point inflation.
3. **How it could be exploited**
   - Librarian (or forged token) repeatedly sends `PATCH /books/:id/verification` with payload `APPROVED` and a non-idempotent implementation that re-credits points each time.
4. **Exact code/files**
   - `backend/src/routes/books.ts`.
5. **Recommended fix**
   - Ensure the handler:
     - Reads current `status` from DB.
     - If new status equals current status, **do nothing**.
   - Log each verification action.
6. **Priority**: **High**.

---

### SOCKET.IO / REAL-TIME

#### 31. How are Socket.io connections authenticated?

1. **What I found**
   - `backend/src/server.ts` creates `io` with CORS config, but **does not verify JWTs or any auth** on connection.
   - `frontend/src/lib/socket.ts` connects with `io(VITE_API_URL, { withCredentials: true })`, no auth payload.
2. **Why it is a risk**
   - Any client that can reach the Socket.io endpoint can connect and receive events intended for authenticated users.
3. **How it could be exploited**
   - A student can:
     - Open browser dev tools.
     - Connect manually to the Socket.io URL (even from a simple script).
     - Subscribe to all broadcasted events, including approvals and announcements, even if the web UI would have restricted them.
4. **Exact code/files**
   - `backend/src/server.ts` – `const io = new Server(...)`.
   - `frontend/src/lib/socket.ts`.
5. **Recommended fix**
   - Use **JWT-based Socket.io auth**:
     - On client, send token in `auth` handshake.
     - On server, verify token in `io.use()` middleware and attach user info to `socket`.
   - Restrict event emission by role/permissions.
6. **Priority**: **High**.

---

#### 32. Can a student subscribe to events they should not see?

1. **What I found**
   - Events are broadcast-like:
     - `book:logged`, `book:verified`, `leaderboard:update`, `announcement:new`.
   - No per-user/role filtering.
2. **Why it is a risk**
   - Students may see:
     - Book verification events for other students.
     - Librarian announcements or activities not meant for them (depending on data content).
3. **How it could be exploited**
   - Student uses a custom Socket.io client to subscribe and log all events, building a picture of other students’ reading/approvals over time.
4. **Exact code/files**
   - `backend/src/server.ts` – event emissions.
5. **Recommended fix**
   - Introduce **rooms** (e.g. by grade/class/user) and **emit events only to relevant rooms**.
6. **Priority**: **High**.

---

#### 33. Do real-time events leak private data, admin activity, or other students’ detailed information?

1. **What I found**
   - Payloads:
     - `book:logged`: `{ bookId, userId }` – reveals other students’ IDs and book IDs.
     - `book:verified`: `{ bookId, status }`.
     - `announcement:new`: entire announcement object.
   - No role-based filtering.
2. **Why it is a risk**
   - This leaks some cross-student data (user IDs, which books have been logged/verified).
3. **How it could be exploited**
   - Student listens to events, sees which peers are logging/approving books in real time; may be considered a privacy issue.
4. **Exact code/files**
   - `backend/src/server.ts` – event emission code.
5. **Recommended fix**
   - Consider:
     - Emitting **less granular data** to students.
     - Or binding event content to only that student’s own actions for student clients.
6. **Priority**: **Medium–High** (depending on your privacy policy).

---

#### 34. Can a malicious client emit forged events that affect leaderboards or UI state?

1. **What I found**
   - I saw no custom server-side handlers accepting events from clients (only `connection` and `disconnect` log messages).
   - UI responds only to server-emitted events; client is not trusted to send events.
2. **Why it is a risk**
   - No direct risk of **server-side state manipulation** via Socket.io; the risk is mainly information leakage.
3. **How it could be exploited**
   - Client could emit nonsense events locally that only affect their own UI, but not server state.
4. **Exact code/files**
   - `backend/src/server.ts` – Socket.io setup.
   - `frontend/src/lib/socket.ts` and components that listen to events.
5. **Recommended fix**
   - If you later add client-emitted events, ensure they are **auth-checked** and protected similar to HTTP routes.
6. **Priority**: **Low** (currently).

---

### INPUT VALIDATION AND INJECTION

#### 35. Are all SQL queries parameterised, or is any query built with string interpolation?

1. **What I found**
   - Most queries use `pg` with parameter placeholders: `query('SELECT ... WHERE id=$1', [id])`.
   - However, **ORDER BY field** is built via string interpolation in `db-helpers.ts`.
2. **Why it is a risk**
   - While values are parameterized, unvalidated field names in `ORDER BY` provide a path to SQL injection.
3. **How it could be exploited**
   - Student calls `GET /books?sortBy=<injected string>` which maps to `orderBy.field` and is interpolated: `ORDER BY b."${orderBy.field}" ...`.
4. **Exact code/files**
   - `backend/src/lib/db-helpers.ts` – `findBooksWithRelations` with `ORDER BY b."${orderBy.field}" ${orderBy.order.toUpperCase()}`.
5. **Recommended fix**
   - Implement a **whitelist** for sortable fields:
     - Map valid `sortBy` query values (e.g. `"createdAt"`, `"title"`) to actual column names.
     - Reject anything else with 400.
6. **Priority**: **Critical**.

---

#### 36. Search for all raw SQL query construction patterns that may allow SQL injection.

1. **What I found**
   - Dynamic construction patterns:
     - `ORDER BY b."${orderBy.field}" ...` – most dangerous.
     - `updateUser` / `updateBook` building `SET col = $n` for DB-known columns, not user input.
2. **Why it is a risk**
   - Only the non-whitelisted use of `orderBy.field` stands out as injection-prone.
3. **How it could be exploited**
   - As above (malicious `sortBy`).
4. **Exact code/files**
   - `backend/src/lib/db-helpers.ts` – search for `ORDER BY`.
5. **Recommended fix**
   - Address the `ORDER BY` issue specifically; dynamic `SET` expressions using internal allowed fields are acceptable if they never use arbitrary keys from client.
6. **Priority**: **Critical** (again).

---

#### 37. Are comments, announcements, and book notes sanitised before rendering?

1. **What I found**
   - Frontend components render text values for these fields directly in JSX (e.g. `<span>{comment.content}</span>`).
   - I did not see use of `dangerouslySetInnerHTML`.
   - React by default escapes text, so HTML tags are not interpreted as markup.
2. **Why it is a risk**
   - At present, low XSS risk, because everything is rendered as text.
3. **How it could be exploited**
   - If any component later switches to using raw HTML rendering (e.g. to support rich text), stored XSS becomes possible.
4. **Exact code/files**
   - `frontend/src/components/CommentList.tsx`, `AnnouncementBanner.tsx`, `BookLogTable.tsx` (names approximated).
5. **Recommended fix**
   - Continue rendering as **escaped text**, and if rich text is needed, use a **sanitizer** library.
6. **Priority**: **Low** (current state).

---

#### 38. Is there any XSS risk in React components using dangerouslySetInnerHTML or unsafe rendering?

1. **What I found**
   - I did **not** find `dangerouslySetInnerHTML` or direct DOM manipulation functions.
2. **Why it is a risk**
   - This is good; there is no direct XSS sink spotted.
3. **How it could be exploited**
   - Only via future changes or other forms of injection, not in current reviewed code.
4. **Exact code/files**
   - Global search across `frontend/src` – no `dangerouslySetInnerHTML`.
5. **Recommended fix**
   - Continue to avoid `dangerouslySetInnerHTML` for untrusted content.
6. **Priority**: **Low**.

---

#### 39. Are request payloads validated centrally with schema validation, or only partially?

1. **What I found**
   - Validation is done inline in each route (`if (!email || !password) return res.status(400)...`).
   - No shared schema (e.g. Zod/Joi) or central validation layer.
2. **Why it is a risk**
   - Inconsistent validation may leave some fields unchecked or missing range constraints, enabling malformed payloads.
3. **How it could be exploited**
   - Student sends weirdly structured payloads (e.g. wrong types, extra fields) which might bypass assumptions and cause runtime errors or inconsistent state.
4. **Exact code/files**
   - `backend/src/routes/*.ts` – see `auth.ts`, `books.ts`, `comments.ts`.
5. **Recommended fix**
   - Introduce **schema-based validation** (Zod) with reusable schemas per resource.
6. **Priority**: **Medium**.

---

#### 40. Are numeric fields range-checked?

1. **What I found**
   - Numeric fields (points adjustments, lexile levels, word counts, ratings) appear to be checked for presence/type but not always for numeric **range** (min/max).
2. **Why it is a risk**
   - Out-of-range values can distort scoring, leaderboards, and analytics.
3. **How it could be exploited**
   - Students could submit lexile/word counts far beyond reasonable values.
4. **Exact code/files**
   - `backend/src/routes/points.ts`, `backend/src/routes/books.ts`, `backend/src/routes/lexile.ts`.
5. **Recommended fix**
   - Enforce **sensible numeric bounds** (e.g. Lexile in [0, 2000], ratings in [1, 5], wordCount in a realistic upper limit).
6. **Priority**: **Medium**.

---

#### 41. Are string fields length-limited?

1. **What I found**
   - No consistent backend enforcement of string length maxima (for comments, announcements, titles).
2. **Why it is a risk**
   - Very long strings can affect performance or lead to DB/storage issues.
3. **How it could be exploited**
   - Student posts a multi-megabyte comment or announcement (if they somehow access announcement creation) via custom request.
4. **Exact code/files**
   - `backend/src/routes/comments.ts`, `backend/src/routes/announcements.ts`, `backend/src/routes/books.ts`.
5. **Recommended fix**
   - Add max length constraints in validation (e.g. 1000 chars for comments, 200 for titles).
6. **Priority**: **Medium**.

---

#### 42. Can malformed payloads crash routes or bypass logic?

1. **What I found**
   - Because validation is ad-hoc, there is a risk of unexpected types slipping through in some routes.
   - However, most handlers check required fields before heavy logic.
2. **Why it is a risk**
   - Malformed payloads might cause TypeScript-compiled JS runtime errors if assumptions about types/fields are violated.
3. **How it could be exploited**
   - Student could explore API with intentionally malformed JSON to find unhandled edge cases that crash routes.
4. **Exact code/files**
   - Any route lacking robust validation; notable: `books.ts` and `comments.ts`.
5. **Recommended fix**
   - Central schema validation (as above) and broader try/catch logging.
6. **Priority**: **Medium**.

---

### ACCOUNT AND ROLE MANAGEMENT

#### 43. Where are user roles stored and how are they assigned?

1. **What I found**
   - Roles are stored in the DB (`STUDENT`, `TEACHER`, `LIBRARIAN`) – in user table defined in `backend/src/types/database.ts` / `prisma/schema.prisma`.
   - On signup, users default to **STUDENT**.
   - Librarian/teacher roles are assigned via **admin** routes in `backend/src/routes/admin.ts` (only librarians can call).
2. **Why it is a risk**
   - Risk is not in storage but in JWT issuance and protection.
3. **How it could be exploited**
   - If a librarian promotes/demotes roles incorrectly, or a forged librarian token is used to change roles.
4. **Exact code/files**
   - `backend/src/routes/admin.ts`, `backend/src/routes/auth.ts`, `backend/src/types/database.ts`.
5. **Recommended fix**
   - Add strong **audit logging** for role changes.
6. **Priority**: **High**.

---

#### 44. Can a student self-assign teacher or librarian roles through signup, profile update, seed scripts, or direct API calls?

1. **What I found**
   - Signup route does **not** accept role from client; defaults to student.
   - User profile update routes do not allow role field to be changed by students.
   - Role updates are in admin routes protected by `requireLibrarian`.
2. **Why it is a risk**
   - Only risk is through **token forgery** or a compromised librarian.
3. **How it could be exploited**
   - Student using a forged librarian token can call admin role-update endpoints.
4. **Exact code/files**
   - `backend/src/routes/admin.ts`, `backend/src/routes/auth.ts`.
5. **Recommended fix**
   - Harden JWT and log role changes.
6. **Priority**: **High**.

---

#### 45. Are admin student-management routes secure?

1. **What I found**
   - All admin routes guarded with `requireLibrarian`.
   - They allow creating/updating/deleting students, bulk imports, etc.
2. **Why it is a risk**
   - Very powerful; if librarian token is compromised, student data can be fully manipulated.
3. **How it could be exploited**
   - Again, via forged librarian JWT.
4. **Exact code/files**
   - `backend/src/routes/admin.ts`.
5. **Recommended fix**
   - JWT secret fix.
   - **Detailed audit logging** and possibly **IP/range** restrictions for admin usage.
6. **Priority**: **High–Critical**.

---

#### 46. Can bulk student import/update features be abused to change roles, grades, or Lexile data improperly?

1. **What I found**
   - Bulk features in `admin.ts` and `lexile.ts` allow large changes; only librarians/teachers can use them.
2. **Why it is a risk**
   - Abuse by a malicious librarian or forged token can damage large amounts of data quickly.
3. **How it could be exploited**
   - Malicious import to change many students to extremely high Lexile or many points.
4. **Exact code/files**
   - `backend/src/routes/admin.ts`, `backend/src/routes/lexile.ts`.
5. **Recommended fix**
   - Logging and review workflows for bulk operations; maybe **two-person approval** for very large changes.
6. **Priority**: **High**.

---

### CLIENT TRUST ISSUES

#### 47. What data is stored in localStorage, sessionStorage, cookies, or client state that could be tampered with?

1. **What I found**
   - `localStorage` holds the JWT auth token.
   - Other client state (like role, user details) is held in React context/memory; not persisted beyond page refresh.
   - No critical flags stored in `sessionStorage` or cookies.
2. **Why it is a risk**
   - If XSS is present, token can be stolen from `localStorage`.
3. **How it could be exploited**
   - Malicious script reads `localStorage.auth_token` and exfiltrates it.
4. **Exact code/files**
   - `frontend/src/contexts/AuthContext.tsx`, `frontend/src/lib/api.ts`.
5. **Recommended fix**
   - Consider HttpOnly cookies for JWTs or strong CSP + input sanitization.
6. **Priority**: **Medium**.

---

#### 48. Does the frontend make any security decisions based on client-side role checks only?

1. **What I found**
   - Protected routes hide UI elements from students (e.g. no verification buttons, no admin menus) using `user.role` from context.
   - However, server still uses `requireTeacher`/`requireLibrarian`.
2. **Why it is a risk**
   - UI-only checks could be bypassed via dev tools, but here they’re not the only barrier.
3. **How it could be exploited**
   - Student could show hidden buttons and issue requests, but server will reject those without proper role.
4. **Exact code/files**
   - `frontend/src/components/ProtectedRoute.tsx`, various role-based UI checks.
5. **Recommended fix**
   - None beyond existing server-side checks; just ensure all sensitive routes have middleware.
6. **Priority**: **Low–Medium**.

---

#### 49. Are hidden buttons the only barrier to sensitive actions anywhere in the app?

1. **What I found**
   - For core sensitive actions (verification, points adjust, announcements, admin), **server-side** checks exist.
2. **Why it is a risk**
   - Not a risk in current code for those routes; UI is just convenience.
3. **How it could be exploited**
   - Only if some route had no server-side auth; I did not find such a case on critical operations.
4. **Exact code/files**
   - `backend/src/routes/books.ts`, `points.ts`, `announcements.ts`, `admin.ts`.
5. **Recommended fix**
   - Continue to rely primarily on server-side checks.
6. **Priority**: **Low**.

---

#### 50. Can a student manipulate frontend state to display or trigger restricted actions?

1. **What I found**
   - They can manipulate the in-memory React state (e.g. force `role` in DevTools) and show admin components.
2. **Why it is a risk**
   - Limited – backend will still deny unauthorized API calls.
3. **How it could be exploited**
   - At worst, they can show UI and see how it behaves; but server protects data.
4. **Exact code/files**
   - All React components depending on `AuthContext`.
5. **Recommended fix**
   - None needed server-side; UI manipulations are not security boundaries.
6. **Priority**: **Low**.

---

### RATE LIMITING / ABUSE PROTECTION

#### 51. Is there rate limiting on login, signup, comments, book logging, and admin-sensitive routes?

1. **What I found**
   - I did not see any rate limiter middleware (e.g. `express-rate-limit`) applied.
2. **Why it is a risk**
   - Enables brute-force attempts and spamming.
3. **How it could be exploited**
   - Students can script:
     - Rapid login attempts (for guesses).
     - Massive book submissions or comments.
4. **Exact code/files**
   - All `backend/src/routes/*.ts` – no rate-limiter usage.
5. **Recommended fix**
   - Add `rateLimit` middleware:
     - Stricter for `/auth/login` and `/auth/signup`.
     - Moderate for book submissions and comments.
6. **Priority**: **High**.

---

#### 52. Can students spam book submissions, comments, or reactions?

1. **What I found**
   - There are no per-user quotas or rate limiters on `/books`, `/comments`, or reaction endpoints.
2. **Why it is a risk**
   - Students can flood the system with noise, affecting teacher workflows and server resources.
3. **How it could be exploited**
   - Use a small script to POST thousands of book logs or comments.
4. **Exact code/files**
   - `backend/src/routes/books.ts`, `backend/src/routes/comments.ts`.
5. **Recommended fix**
   - Per-user rate-limiting and possibly **business-rule caps** (e.g. maximum X book submissions per day).
6. **Priority**: **High**.

---

#### 53. Are there protections against brute-force login attempts?

1. **What I found**
   - No explicit protection beyond bcrypt’s inherent cost; no IP or account-based lockouts, captchas, or delays.
2. **Why it is a risk**
   - Students can brute-force classmates’ passwords if they guess email addresses.
3. **How it could be exploited**
   - Script repeated `POST /auth/login` attempts against a known email using dictionary or brute-force lists.
4. **Exact code/files**
   - `backend/src/routes/auth.ts`.
5. **Recommended fix**
   - Implement:
     - Rate limiting by IP and account.
     - Temporary lockouts after repeated failures.
6. **Priority**: **High**.

---

#### 54. Is there any anti-automation or anomaly detection for suspicious reading logs?

1. **What I found**
   - None in code.
2. **Why it is a risk**
   - System can be gamed with scripts posting unrealistic reading logs.
3. **How it could be exploited**
   - Student script auto-log thousands of improbable books and rely on minimal human oversight.
4. **Exact code/files**
   - `backend/src/routes/books.ts`.
5. **Recommended fix**
   - Add simple heuristics:
     - Reasonable daily limits.
     - Alerts for suspicious patterns.
6. **Priority**: **Medium**.

---

### AUDITABILITY AND MONITORING

#### 55. Is there an audit log for sensitive actions such as login, role changes, points adjustments, book verification, Lexile updates, and deletions?

1. **What I found**
   - I didn’t see dedicated audit log tables or logging middleware for these actions.
2. **Why it is a risk**
   - Hard to trace abusive actions or recover from misuse.
3. **How it could be exploited**
   - Malicious librarian or forged librarian can make changes without an easy trail.
4. **Exact code/files**
   - All routes; no audit-related modules.
5. **Recommended fix**
   - Implement an `audit_logs` table and log entries for:
     - Role changes.
     - Book verification.
     - Points adjustments.
     - Bulk operations.
6. **Priority**: **High**.

---

#### 56. Can we trace who changed a student’s points or approved a book?

1. **What I found**
   - Book may store `verifiedById`; points adjustments may not store `performedById`.
   - No separate audit table.
2. **Why it is a risk**
   - Partial traceability at best; lacks historic sequences and context.
3. **How it could be exploited**
   - Hard to distinguish mistakes vs intentional manipulation.
4. **Exact code/files**
   - `backend/src/routes/books.ts`, `backend/src/routes/points.ts`.
5. **Recommended fix**
   - Every adjustment/verification should write a log row with `actorId`, `targetId`, `bookId`, `delta`, `timestamp`.
6. **Priority**: **High**.

---

#### 57. Are suspicious failed authorisation attempts logged?

1. **What I found**
   - No explicit logging on 403/401, beyond generic error handling.
2. **Why it is a risk**
   - Repeated unauthorized attempts go unnoticed.
3. **How it could be exploited**
   - Students could probe admin endpoints freely without raising alerts.
4. **Exact code/files**
   - `backend/src/middleware/auth.ts`, route handlers.
5. **Recommended fix**
   - Log repeated access-denied attempts with `userId`, endpoint, timestamp, and maybe IP.
6. **Priority**: **Medium**.

---

#### 58. Are there alerts or logs for repeated access-denied attempts to admin endpoints?

1. **What I found**
   - No alerting/monitoring code found.
2. **Why it is a risk**
   - No early detection of targeted attacks on admin endpoints.
3. **How it could be exploited**
   - Students can trial various crafted requests without oversight.
4. **Exact code/files**
   - N/A (not implemented).
5. **Recommended fix**
   - Implement monitoring (e.g. logs shipped to a service with alerting rules).
6. **Priority**: **Medium**.

---

### DATA PRIVACY

#### 59. What student data is exposed through APIs and sockets?

1. **What I found**
   - APIs expose:
     - User stats and points by `userId`.
     - Book logs, comments, announcements, leaderboards.
   - Socket.io exposes:
     - `bookId`, `userId`, status transitions, announcement contents.
2. **Why it is a risk**
   - With IDORs and unfiltered Socket.io broadcasts, students can access more information about peers than they should.
3. **How it could be exploited**
   - Student gathers others’ `userId`s, reading logs, and approval statuses via APIs and sockets.
4. **Exact code/files**
   - `backend/src/routes/users.ts`, `points.ts`, `books.ts`, `comments.ts`.
   - `backend/src/server.ts` (Socket.io).
5. **Recommended fix**
   - Fix IDORs and restrict which data is returned per role.
   - Reduce Socket.io payloads or partition rooms.
6. **Priority**: **High**.

---

#### 60. Are students able to access unnecessary personal data about other students?

1. **What I found**
   - Yes, due to IDORs (stats/points/books).
2. **Why it is a risk**
   - Violates privacy expectations; may conflict with school data policies.
3. **How it could be exploited**
   - Student systematically enumerates `userId`s and collects stats/points.
4. **Exact code/files**
   - `backend/src/routes/users.ts`, `points.ts`, `books.ts`.
5. **Recommended fix**
   - Bind all student-facing endpoints to `req.user.id` only; restrict cross-student views to teachers/librarians with proper filters.
6. **Priority**: **High**.

---

#### 61. Are teacher and librarian views limited to only the required fields?

1. **What I found**
   - Teachers and librarians see more data, but I didn’t see major over-exposure beyond what they likely need.
2. **Why it is a risk**
   - The risk is around **breadth of access** (e.g. teacher viewing all students, not only their class) as discussed.
3. **How it could be exploited**
   - Teacher might browse other classes’ data via crafted `userId` query parameters.
4. **Exact code/files**
   - `backend/src/routes/books.ts`, `lexile.ts`, `analytics.ts`.
5. **Recommended fix**
   - Tighten teacher queries to **only their assigned cohorts**.
6. **Priority**: **High** for teacher scope.

---

#### 62. Is any sensitive data returned by API routes but hidden only in the UI?

1. **What I found**
   - API responses are fairly aligned with what the UI uses; I didn’t see obviously unused but sensitive fields (e.g. passwords, internal IDs beyond necessity).
   - The main issue is access control, not hidden fields.
2. **Why it is a risk**
   - With IDORs, students can retrieve data that is “hidden” in their UI but not in others’.
3. **How it could be exploited**
   - Student makes direct API calls to endpoints not used by their UI role.
4. **Exact code/files**
   - `backend/src/routes/users.ts`, `points.ts`, `books.ts`.
5. **Recommended fix**
   - Enforce server-side authorization per role and resource; don’t rely on UI to hide data.
6. **Priority**: **High**.

---

### DEPLOYMENT AND CONFIGURATION

#### 63. Are CORS settings strict and environment-specific?

1. **What I found**
   - `backend/src/server.ts` CORS config allows origin from `FRONTEND_URL` env.
   - Socket.io CORS similarly uses `FRONTEND_URL`.
2. **Why it is a risk**
   - As long as `FRONTEND_URL` is set correctly per environment, risk is low.
3. **How it could be exploited**
   - If misconfigured to `*`, any origin could call the API.
4. **Exact code/files**
   - `backend/src/server.ts`.
5. **Recommended fix**
   - Ensure `FRONTEND_URL` is **strict** (exact domain) in production and not wildcard.
6. **Priority**: **Medium**.

---

#### 64. Are dev/test routes enabled in production code?

1. **What I found**
   - I didn’t find explicit dev-only routes or test endpoints.
2. **Why it is a risk**
   - Not an issue as long as none exist.
3. **How it could be exploited**
   - N/A.
4. **Exact code/files**
   - N/A (not found in reviewed code).
5. **Recommended fix**
   - Keep dev/test endpoints gated by `NODE_ENV !== 'production'` if ever added.
6. **Priority**: **Low**.

---

#### 65. Are debug logs exposing tokens, secrets, SQL, or student data?

1. **What I found**
   - No systematic logging of tokens or secrets; some console logs for connection events and errors.
2. **Why it is a risk**
   - It appears low risk; ensure logs aren’t overly verbose in production.
3. **How it could be exploited**
   - If logs were accessible, they might reveal PII or internal details.
4. **Exact code/files**
   - `backend/src/server.ts`, various `console.error` calls.
5. **Recommended fix**
   - Avoid logging tokens or secrets; sanitize error logs.
6. **Priority**: **Low–Medium**.

---

#### 66. Are environment variables handled safely?

1. **What I found**
   - Env vars are read via `process.env` for secrets; no exposure in frontend code except expected `VITE_` variables.
2. **Why it is a risk**
   - Acceptable as-is, aside from the JWT secret fallback.
3. **How it could be exploited**
   - Only if values are accidentally exposed through error messages or client bundling.
4. **Exact code/files**
   - `backend/src/server.ts`, `backend/src/middleware/auth.ts`, etc.
5. **Recommended fix**
   - Remove secret fallbacks; ensure secrets never appear in client-side code.
6. **Priority**: **Medium**.

---

#### 67. Are default passwords, seed users, or test accounts present?

1. **What I found**
   - I did not see hardcoded default passwords or test logins in the backend routes.
   - Seed scripts (if any) weren’t clearly visible in the reviewed subset.
2. **Why it is a risk**
   - If such accounts exist outside this code review, they could be weak points.
3. **How it could be exploited**
   - Known default credentials in production.
4. **Exact code/files**
   - Not found in reviewed code.
5. **Recommended fix**
   - Review deployment/seed processes to ensure no default passwords.
6. **Priority**: **Medium** (operational).

---

### TESTING – ATTACK PATHS AND REMEDIATION PLAN

#### 68. Identify the top 10 most likely attack paths for a student using dev tools.

1. **Most likely attack paths**
   1. **IDOR on points**: `GET /points/:userId` to view any student’s points.
   2. **IDOR on user stats**: `GET /users/:id/stats` to view others’ reading stats.
   3. **IDOR on books**: `GET /books?userId=...` to view other students’ logs.
   4. **IDOR on comments**: `GET /comments/:bookId` to see comments on any book.
   5. **SQL injection via `sortBy`**: `GET /books?sortBy=...` abusing `ORDER BY` interpolation.
   6. **Forged librarian JWT** (if JWT secret fallback is used) to call librarian routes.
   7. **Socket.io event snooping**: connect to receive all `book:logged`, `book:verified`, `announcement:new` events.
   8. **Brute-force login** against known emails due to lack of rate limiting.
   9. **Spam book submissions/comments** using scripts.
   10. **Token theft via potential future XSS** (token in `localStorage`).

---

#### 69. For each attack path, explain whether it currently works based on the code.

1. **IDOR on points** – **Works**:
   - `GET /points/:userId` only uses `requireAuth`; no ownership check.
2. **IDOR on user stats** – **Works**:
   - `GET /users/:id/stats` only uses `requireAuth`; no ownership check.
3. **IDOR on books** – **Likely works**:
   - `GET /books?userId=...` uses query parameter `userId`; teacher logic is imperfect, students may be more restricted but risk remains.
4. **IDOR on comments** – **Works for reading**:
   - `GET /comments/:bookId` requires `requireAuth` only.
5. **SQL injection via `sortBy`** – **Risky**:
   - `ORDER BY b."${orderBy.field}"` without whitelist; injection depends on DB’s acceptance of crafted column strings; risk is **real**.
6. **Forged librarian JWT** – **Works if JWT_SECRET unset**:
   - If deployment uses fallback `'your-secret-key'`, forging is feasible.
7. **Socket.io snooping** – **Works**:
   - No auth; all events broadcast.
8. **Brute-force login** – **Works**:
   - No rate limiting; only hash cost slows.
9. **Spam submissions/comments** – **Works**:
   - No rate limiting or quotas.
10. **Token theft via XSS** – **Potential**:
   - No obvious XSS sink currently; risk is latent if new features add any unsafe rendering.

---

#### 70. Create a concise remediation plan ordered by risk and ease of implementation.

### Immediate (Critical/High) – Do Now

- **Fix JWT secret handling (Critical)**
  - Remove `|| 'your-secret-key'` fallback in `backend/src/middleware/auth.ts`.
  - Ensure `JWT_SECRET` is set in all environments and fail fast if missing.

- **Close SQL injection via `sortBy` (Critical)**
  - In `backend/src/routes/books.ts` and `backend/src/lib/db-helpers.ts`, implement a **whitelist**:
    - Map allowed `sortBy` values to hardcoded column names.
    - Reject invalid values with 400.

- **Fix IDORs (High)**
  - `points.ts`: For students, ignore `:userId` and use `req.user.id`.
  - `users.ts`: Bind `/users/:id/stats` to `req.user.id` for students; for teachers, enforce class/grade membership.
  - `books.ts`: Ensure students can only see their own books; teachers restricted to their class; librarians full.
  - `comments.ts`: Restrict `GET /comments/:bookId` based on book ownership/class.

- **Add rate limiting (High)**
  - Add `express-rate-limit` to:
    - `/auth/login`, `/auth/signup` (per-IP and per-account).
    - `/books`, `/comments`, and other write-heavy routes.

- **Socket.io authentication and scoping (High)**
  - Require JWT in Socket.io handshake.
  - Join users to role/class/user-specific rooms.
  - Emit events only to relevant rooms and reduce payloads.

### Short-Term (High/Medium) – Next

- **Add audit logging (High)**
  - Create `audit_logs` table.
  - Log:
    - Book verifications.
    - Points adjustments.
    - Role changes.
    - Bulk operations.

- **Enforce numeric/string limits (Medium)**
  - Add range checks for Lexile, points, word counts, ratings.
  - Add max lengths for comments, titles, announcements.

- **Harden verification idempotency (High)**
  - Make `PATCH /books/:id/verification` idempotent regarding points.
  - Enforce specific state transitions.

### Medium-Term (Medium/Low) – Later

- **Introduce schema validation**
  - Use Zod or similar centrally to validate request payloads.

- **Consider better token storage**
  - Move JWT to HttpOnly cookie or implement strong CSP and sanitization.

- **Monitoring and alerts**
  - Implement logging + alerting for repeated auth failures and admin endpoint probes.

