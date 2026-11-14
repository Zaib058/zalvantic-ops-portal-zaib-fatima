# Internship Operations Portal

This is the project I'm building during my MERN stack internship at Zalvantic. The idea is a portal that runs a remote internship: cohorts, weekly tasks, reviews and certificates that anyone can verify.

I'm building it one week at a time. So far there is a login system (week 1) and roles with intern management (week 2).

## Where the project is

| Week | What gets built | Finish by | Status |
| ---- | --------------- | --------- | ------ |
| 1 | Set up the project and log in | 08/11/2026 | Done |
| 2 | Roles and the first real data | 15/11/2026 | Done |
| 3 | Cohorts, domains and CSV import | 22/11/2026 | Not started |
| 4 | Weekly tasks and submissions | 29/11/2026 | Not started |
| 5 | Reviews and feedback | 06/12/2026 | Not started |
| 6 | Certificates and verification | 13/12/2026 | Not started |
| 7 | Automation, emails and security | 20/12/2026 | Not started |
| 8 | Tests, Docker and deployment | 27/12/2026 | Not started |

## What's in week 1

- A server with register, login and one protected route (`/api/auth/me`).
- A client with a login page and a small dashboard that only works when you're logged in.
- Tests for register, login and the token checks.

## What's in week 2

- Every user now has a role: `admin`, `reviewer` or `intern`. New users are always `intern`, and a role sent in the register request is ignored.
- A `requireRole` middleware that blocks users who don't have the right role (403).
- An Intern model and five admin-only routes to create, read, update, delete and search interns.
- An interns page on the client with a search box. The link only shows for admins.
- 36 tests in total. They prove that interns and reviewers can't call the admin routes.

## Tech used

Node.js, Express, MongoDB (Atlas) with Mongoose, TypeScript, Zod, JWT, bcrypt, helmet, cors, React with Vite, React Router, Jest and Supertest.

## Folder structure

```
server/
  src/
    models/        User, Intern
    controllers/   auth and intern logic
    routes/        /api/auth and /api/interns
    middleware/    requireAuth, requireRole
    services/      token helpers (sign and verify)
    app.ts         builds the express app
    server.ts      connects to MongoDB and starts the server
  tests/           auth and intern tests
client/
  src/
    api/           calls to the server
    pages/         login, dashboard and interns pages
    components/    ProtectedRoute
    routes.tsx
docs/              diagrams and screenshots
.env.example
```

## How to run it

You need Node 20 or newer and a MongoDB database. I used a free Atlas cluster.

1. Clone the repo and open it:
   ```bash
   git clone https://github.com/Zaib058/zalvantic-ops-portal-zaib-fatima.git
   cd zalvantic-ops-portal-zaib-fatima
   ```

2. Make your own `.env` file in the root folder (next to `.env.example`) and fill it in:
   ```
   PORT=5000
   MONGO_URI=your atlas connection string, ending in /ops-portal
   JWT_SECRET=a long random string
   MONGO_URI_TEST=same string but ending in /ops-portal-test
   CLIENT_URL=http://localhost:5173
   ```
   You can make a secret with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   The `.env` file is ignored by Git, so it never gets pushed.

3. Start the backend:
   ```bash
   cd server
   npm install
   npm run dev
   ```
   It should print `mongodb connected` and `server running on port 5000`.

4. In a second terminal, start the frontend:
   ```bash
   cd client
   npm install
   npm run dev
   ```
   Then open http://localhost:5173.

5. There is no register page yet, so make a user first with Postman or Thunder Client. Send a `POST` to `http://localhost:5000/api/auth/register` with this JSON body:
   ```json
   {
     "name": "Test User",
     "email": "test@example.com",
     "password": "password123"
   }
   ```

6. To get an admin, open the user in the Atlas `users` collection and add a field `role` with the string value `admin`. Registering can never make an admin, on purpose. After that, log in on the client and you'll see a "View interns" link.

7. To add an intern, log in as the admin in Thunder Client, copy the `accessToken`, and send `POST /api/interns` with the token as a Bearer token and this body (use the `id` of any registered user):
   ```json
   { "userId": "the user's id", "domain": "MERN / MEAN Stack" }
   ```

## How to run the tests

```bash
cd server
npm test
```

The tests use the second database from `MONGO_URI_TEST`. It has to be a different database from the real one, because the tests delete all users and interns after each test.

![All 36 tests passing](docs/screenshots/week2-06-tests-passing.png)

## API

| Method | Route | Who can call it | What it does |
| ------ | ----- | --------------- | ------------ |
| GET | `/api/health` | anyone | checks that the server is running |
| POST | `/api/auth/register` | anyone | creates a user (always an intern) |
| POST | `/api/auth/login` | anyone | returns an access token and the user |
| GET | `/api/auth/me` | logged in | returns the logged in user and their role |
| POST | `/api/interns` | admin | creates an intern from a user id and a domain |
| GET | `/api/interns?search=` | admin | lists interns, search works on name, email and domain |
| GET | `/api/interns/:id` | admin | returns one intern |
| PATCH | `/api/interns/:id` | admin | updates the domain or the status |
| DELETE | `/api/interns/:id` | admin | deletes an intern |

Protected routes expect the header `Authorization: Bearer <token>`. No token gives 401, and the wrong role gives 403.

## How it works

These diagrams explain each part in a bit more detail.

### Setup and structure

![Setup and structure](docs/images/1-setup-and-structure.png)

The folders follow the structure from the brief. `app.ts` only builds the express app and `server.ts` is the one that starts it. I kept them apart so the tests can use the app without opening a real port.

### Data and register

![Data and register](docs/images/2-data-and-register.png)

Secrets stay in `.env` and only `.env.example` goes to GitHub. When someone registers, Zod checks the input first, then the email is checked for duplicates, and the password is hashed with bcrypt before saving. The real password is never stored and the hash is never sent back.

### Login, the protected route and the tests

![Login, gate and tests](docs/images/3-login-gate-and-tests.png)

Login compares the typed password with the stored hash and returns a token that lasts 15 minutes. A wrong email and a wrong password give the same error on purpose. The `requireAuth` middleware reads the `Bearer` token, checks the signature and the expiry, and only then lets the request reach the controller.

### Client, security and lessons

![Client, security and lessons](docs/images/4-client-security-lessons.png)

### Roles and the intern routes (week 2)

![Roles and intern routes](docs/images/5-roles-and-intern-routes.png)

`requireAuth` answers "who are you?" and `requireRole` answers "are you allowed?". They run in that order, so a missing or bad token gives 401 and the wrong role gives 403. The role is read from the database on every request, not from the token, so if I change someone's role in Atlas it works straight away.

An intern record only stores the id of the user plus a domain and a status. The name and email stay in the users collection and are filled in with `populate`, without the password hash.

## Trying it by hand

### Week 1: login and the fake token

**1. Login page**

![Login page](docs/screenshots/01-login-page.png)

**2. After logging in, the dashboard calls `/api/auth/me` and shows my name**

![Logged in](docs/screenshots/02-logged-in.png)

**3. The token is saved in local storage (I blurred the value)**

![Token in local storage](docs/screenshots/03-token-in-local-storage.png)

**4. I replaced the token with a fake one from the console**

![Fake token](docs/screenshots/04-fake-token-set.png)

**5. After a refresh the server answers 401, the token is cleared and I'm sent back to the login page**

![Redirected to login](docs/screenshots/05-redirected-to-login.png)

### Week 2: admin and intern

**1. The admin sees the list of interns**

![Interns list](docs/screenshots/week2-01-admin-interns-list.png)

**2. Searching for "sara" leaves one row**

![Search](docs/screenshots/week2-02-search-sara.png)

**3. A search with no match says so**

![No results](docs/screenshots/week2-03-no-results.png)

**4. Logged in as an intern, there is no link to the interns page**

![Intern dashboard](docs/screenshots/week2-04-intern-dashboard.png)

**5. If the intern types the address by hand, the server still says no (403)**

![Intern blocked](docs/screenshots/week2-05-intern-forbidden.png)

## Things I know are not perfect yet

- The token is stored in `localStorage`. Scripts injected into the page could read it, so httpOnly cookies would be safer.
- There are only access tokens that expire after 15 minutes. Refresh tokens are planned for a later week.
- There is no register page on the client yet, and interns can only be created through the API, not from a form.
- The first admin has to be made by hand in Atlas.
- The reviewer role exists, but it has no routes yet. Reviewers get the same 403 as interns for now.
- Interns don't belong to a cohort yet. That comes in week 3.

## Learning log

**Week 1**

- Git: my first `git push` failed with "No configured push destination". My folder wasn't connected to the GitHub repo, so I cloned the repo again and copied my files in.
- Windows: `Invoke-RestMethod` doesn't work in cmd, only in PowerShell, so I used curl and later Thunder Client.
- The server didn't start at first, and curl said "failed to connect". I had forgotten to run `npm run dev` before testing.
- Tests: the tests with `mongodb-memory-server` timed out on my laptop, because it couldn't start a temporary database. I switched to a second database on Atlas just for tests, and then all 12 passed.
- Secrets: I pasted a connection string with my password in a chat by mistake, so I changed the password straight away. Now I check `git status` before every commit to make sure `.env` isn't in it.
- Still unclear: I'm still a bit confused about how the tests run in the terminal, mainly how Jest and Supertest work together.

**Week 2**

- Roles: my old test user had no `role` field in Atlas, so the dashboard said "Role: intern" and the admin link was missing. I added `role: admin` by hand in Atlas.
- Thunder Client: I called `/api/login` instead of `/api/auth/login` and got a 404. Earlier a request with keys that had no quotes gave a `entity.parse.failed` error, because JSON needs quotes around the keys.
- Tests: 3 tests failed with 400 instead of 200. In my test helper I used `res.body.id`, but Mongoose sends `_id`, so the test called `/api/interns/undefined`. Changing one word fixed it. The tests caught it before the client did.
- Mongoose printed a warning that the `new` option is deprecated. I replaced it with `returnDocument: "after"`.
- Git: VS Code showed `master` in the status bar and my client files as untracked. The `client` folder had its own hidden `.git` folder with no commits. I checked it with `git -C client log`, then removed that folder, and the files showed up in the real repo again.
- Search: the search text becomes a regular expression, so I escape special characters first. I added a test that searches for `(*` to make sure it doesn't crash.

## Resources I used

- Git and GitHub: the Git and GitHub course by Shradha Khapra on the Apna College YouTube channel.
- Express, JWT and bcrypt: DEV Community articles and the MDN Express tutorial.
- Claude, to explain steps I didn't understand and to help with errors.

## Pull requests

- Week 1: [Week 1: Set up the project and log in](PASTE-WEEK-1-PR-LINK-HERE)
- Week 2: [Week 2: Add roles and the first real data](PASTE-WEEK-2-PR-LINK-HERE)

---

Built as part of the Zalvantic Internship Programme.
