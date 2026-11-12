# Deploy to production

A click-by-click guide. Allow about 45 minutes, most of it waiting on builds
and DNS.

**What you end up with**

- The API and its PostgreSQL database on **Railway**.
- The web app on **Vercel**. The browser only ever talks to the Vercel
  address; Vercel forwards anything under `/api` to Railway.
- Resume optimisation using a paid **Gemini** key.
- Invite and password emails sent through **Resend**.

**Accounts you need** (create them first if you don't have them)

| Service | Site | Sign in with |
|---|---|---|
| GitHub | github.com | `theyuvaraaj` (the account that owns the repo) |
| Google AI Studio | aistudio.google.com | any Google account with a payment card |
| Resend | resend.com | any email |
| Railway | railway.com | "Login with GitHub", as `theyuvaraaj` |
| Vercel | vercel.com | "Continue with GitHub", as `theyuvaraaj` |

Menu and button names below come from each service's documentation. Dashboards
change, so if a label is slightly different, pick the closest match.

Keep a private note open while you work. You will collect five values:

```
GEMINI_API_KEY      =
RESEND_API_KEY      =
EMAIL_FROM          =
RAILWAY_URL         =
VERCEL_URL          =
```

---

## Step 1. Gemini: get a paid API key

The free tier is not suitable: it went down three times while this feature was
being built, and Google's billing page says prompts on the paid tier are not
used to improve its products, which matters because resumes are personal data.

1. Go to **https://aistudio.google.com** and sign in.
2. In the left sidebar click **Get API key** (it may read **API keys**).
3. You will see a table of keys, each tied to a Google Cloud project. If you
   already have the key used during development, use that row. Otherwise
   click **Create API key**, choose **Create API key in new project**, and
   wait for the row to appear.
4. In that row, look at the **Plan** (or **Billing**) column. If it says
   **Free tier**, click **Set up billing** next to it.
5. Google opens the billing setup. Choose or create a billing account, enter
   card details, and add credit when asked (the minimum first purchase is
   10 US dollars). Finish and return to the API keys page.
6. Refresh the page. The row should now show a paid tier instead of Free.
7. Click the key (or the copy icon in its row) and copy the whole key.
8. Paste it into your note as `GEMINI_API_KEY`.

Billing is prepaid. If the credit balance reaches zero the key stops working,
and optimisation will fail with "AI service is busy". Top it up on the same
page.

---

## Step 2. Resend: email sending

The portal emails each invited employee and candidate a link to set their
password. Without working email, nobody except the admin can sign in.

### 2a. Create the API key

1. Go to **https://resend.com** and sign in.
2. In the left sidebar click **API Keys**.
3. Click **Create API Key** (or **Add API Key**).
4. If a form appears, use name `team-elite-production`, permission
   **Sending access**, domain **All domains**, then **Add**. A brand-new
   account skips the form and shows a key straight away as part of its
   welcome screen; that key is fine to use.
5. The key is shown **once**. Copy it and paste it into your note as
   `RESEND_API_KEY`. Ignore the sample code on that screen.

### 2b. Choose the sender address

**If you own a domain (required for real use):**

1. In the left sidebar click **Domains**, then **Add Domain**.
2. Enter a subdomain of your domain, for example `mail.yourcompany.com`.
   Pick the region nearest your users and click **Add**.
3. Resend shows a list of DNS records (an MX record and some TXT records).
   Leave this page open.
4. In a new tab, sign in to wherever your domain's DNS is managed (GoDaddy,
   Namecheap, Cloudflare and so on), open the DNS records page for the domain,
   and add each record exactly as Resend shows it: same type, same name, same
   value. On Cloudflare, set these records to **DNS only** (grey cloud).
5. Back in Resend, click **Verify DNS Records**. Status changes to
   **Verified** once the records are visible, usually within a few minutes,
   sometimes a few hours.
6. In your note set
   `EMAIL_FROM = Team Elite <noreply@mail.yourcompany.com>`
   using the subdomain you verified.

**If you don't have a domain yet (testing only):**

Set `EMAIL_FROM = Team Elite <onboarding@resend.dev>`. Resend only delivers
mail from that address to the email you signed up to Resend with, so:

- Only that one address can receive an invite. Use it for the test employee
  in Step 7.
- Use a **different** email for `SEED_ADMIN_EMAIL` in Step 3d. The admin never
  needs to receive mail, and two users cannot share an email.
- A second invited user (the test candidate) will not get an email until a
  domain is verified.

Come back and do the domain steps before real users join.

---

## Step 3. Railway: database and API

### 3a. Create the project and the database

1. Go to **https://railway.com** and click **Login**, then
   **Login with GitHub**. Approve access if asked.
2. On the dashboard click **New Project** (top right).
3. In the list choose **Deploy PostgreSQL** (it may sit under **Database**,
   then **Add PostgreSQL**).
4. A project canvas opens with one box named **Postgres**. Wait until it shows
   a green tick.

### 3b. Add the API service

1. If a panel for the Postgres service is open on the right, close it with
   the **X** in its top-right corner so the whole canvas is visible. Do not
   turn on **Public access** in the database settings; the API reaches the
   database privately.
2. Click **+ Create** at the top right of the canvas (older layouts call it
   **+ New**). If you can't find it, right-click an empty part of the canvas,
   or press **Cmd+K** and type `new service`.
3. Choose **GitHub Repo**.
   - If **GitHub Repo** is missing or greyed out, the Railway account is not
     linked to GitHub or is on the limited trial, which only allows
     databases. Click your avatar (bottom left), **Account Settings**, and
     connect GitHub as `theyuvaraaj`; if it still isn't offered, upgrade the
     workspace to the Hobby plan.
4. If Railway says it can't see your repositories, click
   **Configure GitHub App**, choose the `theyuvaraaj` account, select
   **Only select repositories**, tick `team-elite-mvp`, and click
   **Install & Authorize**. You return to Railway.
5. Pick **theyuvaraaj/team-elite-mvp**.
6. A second box appears on the canvas, named after the repo. It starts a
   build straight away and that first build will fail or crash, because the
   variables aren't set yet. That is expected. Carry on.

### 3c. Check the service settings

1. Click the new service box, then the **Settings** tab.
2. Under **Source**:
   - **Branch** should be `main`.
   - **Root Directory** must be **empty**. If it has a value, clear it.
3. Scroll to **Build**. **Builder** should read **Dockerfile** and the path
   `apps/api/Dockerfile`. Railway picks this up from `railway.toml` in the
   repo, so you should not need to type anything.
   - If it shows Nixpacks or Railpack instead, go to the **Variables** tab
     and add `RAILWAY_DOCKERFILE_PATH` with value `apps/api/Dockerfile`.

### 3d. Add the variables

1. Still inside the API service, click the **Variables** tab.
2. Click **Raw Editor** (top right of the variables list).
3. Paste the block below, then replace every value written in CAPITALS.

```
NODE_ENV=production
PORT=3001
DATABASE_URL=${{Postgres.DATABASE_URL}}
SESSION_SECRET=REPLACE_WITH_40_RANDOM_CHARACTERS
WEB_ORIGIN=https://team-elite.vercel.app
API_ORIGIN=https://team-elite.vercel.app
SEED_ADMIN_EMAIL=YOUR_ADMIN_LOGIN_EMAIL
SEED_ADMIN_PASSWORD=A_NEW_STRONG_PASSWORD
GEMINI_API_KEY=FROM_YOUR_NOTE
RESEND_API_KEY=FROM_YOUR_NOTE
EMAIL_FROM=FROM_YOUR_NOTE
INVITE_TOKEN_TTL_HOURS=72
SESSION_TTL_DAYS=14
```

   Notes on the values:
   - `DATABASE_URL`: leave exactly as written, including the double curly
     braces. `Postgres` is the name of the database box on the canvas; if you
     renamed it, use the new name.
   - `SESSION_SECRET`: any long random text. To make one, open the Terminal
     app and run the command below, then paste its output.

     ```bash
     openssl rand -hex 32
     ```

   - `WEB_ORIGIN` and `API_ORIGIN`: temporary placeholders. You set the real
     addresses in Step 6.
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`: the first admin account. Use
     at least 12 characters for the password and do not reuse the demo
     password from `RUN.md`. Save both in your password manager.
4. Click **Update Variables**.
5. A purple bar appears at the top of the canvas saying there are changes to
   apply. Click **Deploy**.

### 3e. Watch the build

1. Click the API service box, then the **Deployments** tab.
2. Click the newest deployment, then **Build Logs**. The build takes about
   five minutes. Two lines confirm PDFs will use the proper layout:
   - `Installing tectonic`
   - `Tectonic cache warmed`
3. Switch to **Deploy Logs**. You should see, in order:
   - `6 migrations found`, then `All migrations have been successfully applied`
   - `Created initial admin` followed by your admin email
   - `Server listening at http://0.0.0.0:3001`
4. The deployment's status turns to **Active** (green).

### 3f. Give the API a public address

1. API service box, **Settings** tab, scroll to **Networking**.
2. Under **Public Networking** click **Generate Domain**.
3. If asked for a port, enter `3001` and confirm.
4. An address appears, something like
   `team-elite-mvp-production.up.railway.app`.
5. Put it in your note as `RAILWAY_URL`, with `https://` in front and no
   slash at the end.
6. Test it: open `RAILWAY_URL` followed by `/api/health` in a browser tab.
   You should see exactly:

   ```
   {"ok":true}
   ```

Do not go further until that works.

---

## Step 4. Tell the web app where the API is

The file `apps/web/vercel.json` contains a placeholder that must become your
Railway address.

**Easiest:** send the `RAILWAY_URL` to Claude and it will make this edit,
commit it and push it.

**Or do it yourself on GitHub:**

1. Go to **https://github.com/theyuvaraaj/team-elite-mvp**.
2. Click the folders **apps**, then **web**, then the file **vercel.json**.
3. Click the pencil icon (top right of the file) to edit.
4. Find the line

   ```
   "destination": "https://YOUR_RAILWAY_API_URL/api/:path*"
   ```

   and replace `YOUR_RAILWAY_API_URL` with your Railway host, without
   `https://`. Example result:

   ```
   "destination": "https://team-elite-mvp-production.up.railway.app/api/:path*"
   ```

5. Click **Commit changes...**, keep **Commit directly to the main branch**
   selected, and click **Commit changes**.

Railway will rebuild the API because the repo changed. That is harmless.

---

## Step 5. Vercel: the web app

1. Go to **https://vercel.com** and click **Log In**, then
   **Continue with GitHub**.
2. On the dashboard click **Add New...** (top right), then **Project**.
3. Under **Import Git Repository** find `team-elite-mvp` and click
   **Import**.
   - If the repo is not listed, click **Adjust GitHub App Permissions**,
     choose the `theyuvaraaj` account, tick `team-elite-mvp`, click **Save**,
     and return to this page.
4. On the **Configure Project** screen:
   - **Project Name**: `team-elite` (this decides the address).
   - **Framework Preset**: should detect **Vite**. If not, choose it.
   - **Root Directory**: click **Edit**, select `apps/web`, click
     **Continue**.
   - Open **Build and Output Settings**. Leave everything at its default
     (build command `pnpm build`, output directory `dist`).
   - **Environment Variables**: leave empty. The web app needs none.
5. Click **Deploy**. The build takes about a minute.
6. When it finishes click **Continue to Dashboard**. Under **Domains** you
   will see the address, for example `team-elite.vercel.app`.
7. Put it in your note as `VERCEL_URL`, with `https://` in front and no slash
   at the end.
8. Test the link between the two halves: open `VERCEL_URL` followed by
   `/api/health`. You should again see `{"ok":true}`. That proves Vercel is
   forwarding to Railway.

---

## Step 6. Point the API at the real web address

Password-setup links in emails are built from `WEB_ORIGIN`, so it must be the
real Vercel address.

1. Back in **Railway**, open the project, click the API service box, then the
   **Variables** tab.
2. Click the value of `WEB_ORIGIN`, replace it with your `VERCEL_URL`, and
   confirm.
3. Do the same for `API_ORIGIN`, using your `RAILWAY_URL`.
4. Click **Deploy** in the purple bar at the top.
5. Wait for the new deployment to turn **Active**.

Both values need `https://` at the start and no slash at the end.

---

## Step 7. Smoke test

Do these in order on the `VERCEL_URL`. Stop at the first one that fails and
check the troubleshooting table.

1. Open `VERCEL_URL`. The sign-in page appears.
2. Sign in with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.
3. Click your name (top right) to open the profile, change the name from
   "Admin" to your own, and save.
4. Click **Users** in the admin tabs, switch the toggle to **Employees**, and
   click **+ Invite employee**. Fill in a name, an email address you can
   read, and an employee code, then save. An invite email arrives within a
   minute.
5. Click the link in that email, set a password, and confirm you land in the
   portal as an employee. The link should start with your `VERCEL_URL`.
6. As admin again: **Users**, toggle **Candidates**, **+ Invite candidate**.
   Then click **Assignments**, choose the employee and the candidate in the
   two dropdowns, and click **Create assignment**.
7. As the employee, open the candidate, scroll to **Resume optimizer**,
   upload a resume, enter the company and the exact job title, paste a job
   description, and click **Optimize resume**. It should finish in under two
   minutes with a score.
8. Click **Download PDF** and **Download DOCX**. The PDF should have the
   centred name, a bold headline under it, and ruled section headings. If it
   looks like plain text instead, see the table below.

---

## Troubleshooting

| What you see | Likely cause | Fix |
|---|---|---|
| Railway build log mentions Nixpacks or Railpack, no Dockerfile steps | The repo config was not picked up | Service **Settings**: clear **Root Directory**. If it persists, add variable `RAILWAY_DOCKERFILE_PATH` = `apps/api/Dockerfile` |
| Deploy log shows `ZodError` or `Invalid` right after start | A variable is missing or malformed | **Variables** tab: every line from Step 3d must be present; `WEB_ORIGIN` and `API_ORIGIN` must start with `https://` |
| Deploy log shows `Can't reach database server` | `DATABASE_URL` is not the reference | Set it to exactly `${{Postgres.DATABASE_URL}}` |
| `RAILWAY_URL/api/health` does not load | No public domain, or wrong port | Step 3f again; the port is `3001` |
| `VERCEL_URL/api/health` shows a Vercel 404 or error page | `vercel.json` still has the placeholder, or the wrong host | Step 4, then in Vercel open **Deployments**, the three-dot menu on the latest one, **Redeploy** |
| Sign-in says wrong password | The admin was created with different values | The admin is only created when the database has none. Use the values that were set at first deploy |
| The Railway address shows "not found" in a browser | Normal: it only serves the API | Use the `VERCEL_URL` for the site; the Railway address is only for `/api/health` checks |
| No invite email | Sender not verified, or testing sender used | Step 2b; in Resend open **Emails** to see whether the send was accepted or rejected |
| Optimisation says "AI service is busy" | Gemini credit exhausted, or the models are overloaded | Step 1 (check credit); retry after a minute |
| Optimisation says "Too many requests" | 20 per user per hour reached | Wait, or raise `RESUME_OPTIMIZE_PER_HOUR` in Railway variables |
| PDF downloads but looks like plain text | LaTeX was not installed in the image | Railway **Build Logs** should contain `Tectonic cache warmed`; if it says `skipped`, send the build log to Claude |

---

## Limits and behaviour worth knowing

- Vercel cuts a forwarded request off at 120 seconds. One optimisation works
  to a 105-second budget and returns its best draft when time is short.
- Each user may start 20 optimisations an hour (`RESUME_OPTIMIZE_PER_HOUR`).
- Sign-in attempts are limited to 5 a minute per account.
- Database migrations run automatically every time the API deploys.
- Never run `pnpm db:seed` against production. It refuses to, because it
  creates demo accounts with published passwords.
- Every push to `main` redeploys both Railway and Vercel.

## After launch

- Turn on database backups: Railway, the **Postgres** box, **Backups** tab.
- Add your own web address: Vercel, the project, **Settings**, **Domains**.
  If you do, update `WEB_ORIGIN` in Railway to match (Step 6).
