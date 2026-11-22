# Internship Operations Portal

This is the project I'm building during my MERN stack internship at Zalvantic. The idea is a portal that runs a remote internship: cohorts, weekly tasks, reviews and certificates that anyone can verify.

I'm building it one week at a time. So far there is a login system (week 1), roles and intern management (week 2), and cohorts with a CSV import (week 3).

## Where the project is

| Week | What gets built                 | Finish by  | Status      |
| ---- | ------------------------------- | ---------- | ----------- |
| 1    | Set up the project and log in   | 08/11/2026 | Done        |
| 2    | Roles and the first real data   | 15/11/2026 | Done        |
| 3    | Cohorts, domains and CSV import | 22/11/2026 | Done        |
| 4    | Weekly tasks and submissions    | 29/11/2026 | Not started |
| 5    | Reviews and feedback            | 06/12/2026 | Not started |
| 6    | Certificates and verification   | 13/12/2026 | Not started |
| 7    | Automation, emails and security | 20/12/2026 | Not started |
| 8    | Tests, Docker and deployment    | 27/12/2026 | Not started |

## What's in week 1

- A server with register, login and one protected route (`/api/auth/me`).
- A client with a login page and a small dashboard that only works when you're logged in.
- Tests for register, login and the token checks.

## What's in week 2

- Every user now has a role: `admin`, `reviewer` or `intern`. New users are always `intern`, and a role sent in the register request is ignored.
- A `requireRole` middleware that blocks users who don't have the right role (403).
- An Intern model and admin-only routes to create, read, update, delete and search interns.
- An interns page on the client with a search box. The link only shows for admins.

## What's in week 3

- **Cohorts and domains.** A cohort has a name, a start date and a list of domains. An admin can create and delete cohorts and add or remove domains.
- **Interns belong to a cohort.** An intern's domain has to be one of the domains of their cohort. A domain that interns are using can't be removed, and a cohort that still has interns can't be deleted (both give 409).
- **Pagination and filters.** The interns list now comes in pages of 10 and can be filtered by cohort, domain and status, on top of the search.
- **CSV import.** An admin uploads a csv file with the columns `name, email, password, domain`. Every row is checked on its own. Good rows are saved, bad rows are listed with the row number and the reason. A 60-row file with 5 bad rows imports 55 and reports the 5.
- **Client.** New pages for cohorts and the CSV import, filters and a page counter on the interns list, a top bar, and a proper stylesheet.
- **86 tests** in total.

## Tech used

Node.js, Express, MongoDB (Atlas) with Mongoose, TypeScript, Zod, JWT, bcrypt, helmet, cors, multer, csv-parse, React with Vite, React Router, Jest and Supertest.

## Folder structure

```
server/
  src/
    models/        User, Intern, Cohort
    controllers/   auth, intern, cohort and import logic
    routes/        /api/auth, /api/interns and /api/cohorts
    middleware/    requireAuth, requireRole
    services/      token helpers (sign and verify)
    app.ts         builds the express app
    server.ts      connects to MongoDB and starts the server
  tests/           auth, intern, cohort and import tests
client/
  src/
    api/           calls to the server
    pages/         login, dashboard, interns, import and cohorts pages
    components/    Layout (top bar), ProtectedRoute, CohortCard
    routes.tsx
docs/              diagrams, screenshots and a sample csv
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

6. To get an admin, open the user in the Atlas `users` collection and add a field `role` with the string value `admin`. Registering can never make an admin, on purpose. After that, log in on the client.

7. Make a cohort on the Cohorts page, for example "Batch 2026-27" with the domains "MERN / MEAN Stack" and "UI / UX Design".

8. Add interns by importing a csv file on the Interns page (button "Import from CSV"). The file needs the columns `name,email,password,domain`, and every domain has to be one of the cohort's domains. There is a ready made example: run `node docs/make-sample-csv.js` and it writes `docs/sample-interns.csv`, a file with 60 rows where 5 are bad.

## How to run the tests

```bash
cd server
npm test
```

The tests use the second database from `MONGO_URI_TEST`. It has to be a different database from the real one, because the tests delete all users, interns and cohorts after each test. The whole run takes about 3 minutes, because the import tests hash many passwords.

![All 86 tests passing](docs/screenshots/week3-08-tests-passing.png)

## API

| Method | Route                 | Who can call it | What it does                                                                   |
| ------ | --------------------- | --------------- | ------------------------------------------------------------------------------ |
| GET    | `/api/health`         | anyone          | checks that the server is running                                              |
| POST   | `/api/auth/register`  | anyone          | creates a user (always an intern)                                              |
| POST   | `/api/auth/login`     | anyone          | returns an access token and the user                                           |
| GET    | `/api/auth/me`        | logged in       | returns the logged in user and their role                                      |
| POST   | `/api/cohorts`        | admin           | creates a cohort (name, startDate, domains)                                    |
| GET    | `/api/cohorts`        | admin           | lists the cohorts                                                              |
| GET    | `/api/cohorts/:id`    | admin           | returns one cohort                                                             |
| PATCH  | `/api/cohorts/:id`    | admin           | updates the name, start date or domains                                        |
| DELETE | `/api/cohorts/:id`    | admin           | deletes a cohort that has no interns                                           |
| POST   | `/api/interns`        | admin           | creates an intern from a user id, a cohort id and a domain                     |
| GET    | `/api/interns`        | admin           | lists interns, with `search`, `cohort`, `domain`, `status`, `page` and `limit` |
| GET    | `/api/interns/:id`    | admin           | returns one intern                                                             |
| PATCH  | `/api/interns/:id`    | admin           | updates the domain or the status                                               |
| DELETE | `/api/interns/:id`    | admin           | deletes an intern                                                              |
| POST   | `/api/interns/import` | admin           | imports interns from a csv file (form fields `cohortId` and `file`)            |

Protected routes expect the header `Authorization: Bearer <token>`. No token gives 401, and the wrong role gives 403.

The interns list answers with `{ data, page, limit, total, totalPages }`.

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

### Cohorts, the interns list and the import (week 3)

![Cohorts, list and import](docs/images/6-cohorts-list-and-import.png)

An intern only stores the id of its user and the id of its cohort, plus a domain and a status. The name and email stay in the users collection and the cohort name stays in the cohorts collection. They are filled in with `populate` when an intern is sent back, without the password hash.

The domain lives inside the cohort as a list. That makes the three rules easy to check: the domain of an intern has to be in the list, a domain can't be taken out of the list while an intern uses it, and a cohort can't be deleted while it has interns.

For the list, the page and the limit are turned into `skip` and `limit` for the database. The server also counts all the matches, so the client can show "Page 2 of 6". Changing a filter on the client always goes back to page 1.

The import goes through the file row by row. A broken file or missing columns is a 400 for the whole request, but a bad row only ends up in the `errors` list with its row number (row 1 is the header, so the first person is row 2). One database query finds all the emails that are already registered, so the server doesn't ask once per row.

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

### Week 3: cohorts, pages and the import

**1. The new login page with the stylesheet**

![Login page](docs/screenshots/week3-00-login.png)

**2. The interns list has pages, and filters for cohort, domain and status**

![Interns list](docs/screenshots/week3-01-interns-list.png)

**3. The search works together with the pages**

![Search](docs/screenshots/week3-02-search.png)

**4. The cohorts page, with the domains as chips that can be added and removed**

![Cohorts](docs/screenshots/week3-03-cohorts.png)

**5. Taking out a domain that an intern uses is refused by the server**

![Domain rule](docs/screenshots/week3-04-domain-rule.png)

**6. A csv with 5 rows: 2 are imported, and the 3 bad rows are listed with the reason**

![Import result](docs/screenshots/week3-05-import-result.png)

**7. The task card test: 60 rows, 5 of them bad. 55 are imported and the 5 are reported (Thunder Client)**

![Import response](docs/screenshots/week3-09-import-api-response.png)

**8. An intern sees no links to the admin pages**

![Intern dashboard](docs/screenshots/week3-06-intern-dashboard.png)

**9. And if an intern types the address of the interns page, the server still says no**

![Intern blocked](docs/screenshots/week3-07-intern-blocked.png)

## Things I know are not perfect yet

- The token is stored in `localStorage`. Scripts injected into the page could read it, so httpOnly cookies would be safer.
- There are only access tokens that expire after 15 minutes. Refresh tokens are planned for a later week.
- There is no register page on the client yet, and a single intern can only be added through the API or the csv import, not from a form.
- The first admin has to be made by hand in Atlas.
- The reviewer role exists, but it has no routes yet. Reviewers get the same 403 as interns for now.
- The import is slow. 55 rows took about 13 seconds, because every password is hashed and saved one after the other. That is why the file is limited to 200 rows and 1 MB. Saving the rows in batches would be faster.
- The csv has the password of every intern in plain text. That is fine for the synthetic data I use here, but a real portal would send an invitation email instead. I'm planning that for week 7.
- Cohorts and interns can't be edited in the client yet, only created, deleted, and for cohorts the domains changed.
- The client has no tests yet.

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

**Week 3**

- Ids: I typed an id by hand and lost one character, so the server answered 400 "invalid id". Copying and pasting the id fixed it. Another time I used a user id in a cohort url and got a 404, because the cohort doesn't have that id. There are three kinds of ids in this project (user, intern and cohort), so I check which response an id came from before using it.
- Testing the rules: I tested "can't remove a domain that interns use" while no intern pointed at the cohort yet. The server allowed it, and the delete test even deleted my cohort. The rules only work when there is data, so I made a new cohort and created the interns first. After that both rules answered 409.
- Pagination: the list answers with an object (`data`, `page`, `total` and so on) instead of an array. Three tests and the interns page had to change because of that.
- Uploading a file: in Thunder Client the file goes in the Form tab, in the Files part, with the field name `file`, and the cohort id is a normal form field.
- Speed: the import of 55 rows took 13 seconds, because the passwords are hashed one by one. I added a "Importing..." message on the page and a limit of 200 rows, and I wrote the speed down as something to improve.

## Resources I used

- Git and GitHub: the Git and GitHub course by Shradha Khapra on the Apna College YouTube channel.
- Express, JWT and bcrypt: DEV Community articles and the MDN Express tutorial.
- Claude, to explain steps I didn't understand and to help with errors.

## Pull requests

- Week 1: [Week 1: Set up the project and log in][(https://github.com/Zaib058/zalvantic-ops-portal-zaib-fatima/pull/1)]
- Week 2: [Week 2: Add roles and the first real data][(https://github.com/Zaib058/zalvantic-ops-portal-zaib-fatima/pull/2)]
- Week 3: [Week 3: Organise people into cohorts and domains][(https://github.com/Zaib058/zalvantic-ops-portal-zaib-fatima/pull/3)]

---

Built as part of the Zalvantic Internship Programme.
