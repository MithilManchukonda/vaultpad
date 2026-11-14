# VaultPad

**A private, no-signup notepad. One secret code opens your notes, and the server can never read them.**

**Live demo:** _coming soon_ | **Source code:** [github.com/MithilManchukonda/vaultpad](https://github.com/MithilManchukonda/vaultpad)

---

## 1. What is VaultPad?

VaultPad is a full-stack web app where you type any secret code and get a private notepad. Type the same code on another device and the same notes appear. There are no accounts, no emails, and no passwords to register.

The theme is **privacy by design**. Your notes are encrypted inside your browser *before* they are sent anywhere, so the server and the database only ever store unreadable text.

It is inspired by no-signup notepad tools such as codedpad.com. This is my own implementation, built from scratch to learn how the whole stack fits together.

## 2. Why I built this

**The problem:** most notes apps need an account, and the company running them can read what you write. Sometimes you just want to move a link, a Wi-Fi password or a short note between devices quickly and privately.

**My goals as a developer:**

- Build a complete project end to end: UI, API, database and deployment.
- Learn real security basics (hashing, key derivation, encryption) instead of only following tutorials.
- Make something small enough that I can explain **every line** in an interview.

## 3. Features

- No signup: the secret code is both the pad's address and its key
- Client-side encryption using the browser's built-in Web Crypto API
- Create, read, update and delete pads (full CRUD)
- Input validation on the server with clear status codes (200, 400, 404, 500)
- Confirmation pop-up before deleting a pad
- Secrets kept out of the code with environment variables

## 4. Tech stack

| Layer | Technology | Why I chose it |
|---|---|---|
| Frontend | HTML, CSS, plain JavaScript | No framework, so every line is easy to explain and the browser-to-server flow is visible |
| Backend | Node.js + Express | Same language on both sides, small to learn, and widely used |
| Database | MongoDB Atlas + Mongoose | Free hosting, and a pad is naturally one small document |
| Encryption | Web Crypto API (SHA-256, PBKDF2, AES-GCM) | Built into browsers, so no extra library is needed |
| Config | dotenv (`.env` file) | Keeps the database password out of the code and out of GitHub |
| Tools | VS Code, Git and GitHub | Standard developer workflow |

## 5. How it works (in simple words)

Think of a locker room. Your **secret code** does two jobs: it tells you *which locker is yours* and it is *the key that opens it*. The staff (the server) only hold the lockers. They never see your key, and everything inside is already locked.

```
 Browser                          Server (Express)             MongoDB
 -------                          ----------------             -------
 1. You type a code + notes
 2. Hash the code -> pad ID
 3. Encrypt notes with a key
    made from the code
 4. Send pad ID + encrypted  -->  5. Validate the request  -->  6. Store pad ID
    notes only                                                     + encrypted notes
```

**Saving a pad**

1. The browser hashes the code with SHA-256 to make a 64-character **pad ID**.
2. The browser turns the code into a strong key using PBKDF2 (100,000 rounds, with a random salt).
3. The notes are encrypted with AES-GCM, using a random IV.
4. Only the **pad ID** and the **encrypted text** are sent to the server with a PUT request.

**Opening a pad**

1. The browser makes the same pad ID from the same code.
2. It asks the server for that pad (GET request).
3. The server returns the encrypted text, and the browser decrypts it locally.

**What the database actually stores**

```json
{
  "padId": "58e0fd791af4861a2bb9d532016a3318f8b8029cca0382820fd38baa12644350",
  "content": "xK92Lm0aQ...unreadable encrypted text...",
  "createdAt": "2026-11-14T...",
  "updatedAt": "2026-11-14T..."
}
```

Neither the secret code nor the real notes are anywhere in it.

## 6. Design decisions (and why)

| Decision | Reason |
|---|---|
| Hash the code to make the pad ID | The server needs a name to find the pad, but must not learn the code. A hash cannot be reversed. |
| Use PBKDF2 to make the key | Codes are short; encryption keys must be long. PBKDF2 stretches the code and makes each guess slow. |
| Use AES-GCM | It encrypts *and* detects tampering. If stored data is changed, decryption fails instead of returning wrong text. |
| New random salt and IV on every save | The same note encrypted twice looks different, which hides patterns. |
| Store salt and IV together with the encrypted text | They are not secret, and they are needed to decrypt. One string is stored per pad. |
| Use `upsert` when saving | One route handles both creating a new pad and updating an existing one. |
| Validate the pad ID (64 hex characters) and the content type | Data from the browser is never trusted. |
| Connect to the database *before* starting the server | The server never accepts requests it cannot handle. |
| Read the port from `process.env.PORT` | The same code runs on my laptop and on a hosting service. |

## 7. Project structure

```
vaultpad/
├── models/
│   └── Pad.js
├── public/
│   ├── index.html
│   ├── style.css
│   ├── crypto.js
│   └── app.js
├── routes/
│   └── pads.js
├── .env            (local only, never committed)
├── .gitignore
├── package.json
├── package-lock.json
├── server.js
└── README.md
```

| File or folder | Role in the project |
|---|---|
| `server.js` | The entry point. Loads the environment variables, connects to MongoDB, serves the `public` folder, plugs in the API routes, and starts the server only after the database connects. |
| `models/` | Describes the data. |
| `models/Pad.js` | The Mongoose schema and model: a unique `padId`, the encrypted `content`, and automatic timestamps. |
| `routes/` | The API, kept separate from `server.js` so each file has one job. |
| `routes/pads.js` | The three endpoints (GET, PUT, DELETE) with input validation and error handling. |
| `public/` | Everything the browser downloads. Express serves it as static files. |
| `public/index.html` | The page structure: code box, notes area, and Open, Save and Delete buttons. |
| `public/style.css` | The look of the page. |
| `public/crypto.js` | All security logic in one place: pad ID hashing, key derivation, encryption and decryption. |
| `public/app.js` | The page logic. Listens for button clicks, calls `crypto.js`, and talks to the API with `fetch`. |
| `.env` | Secret settings, such as the database connection string. Stays on my computer. |
| `.gitignore` | Tells Git to ignore `.env` and `node_modules`. |
| `package.json` | Project info, the dependency list, and the `npm start` command. |
| `package-lock.json` | Locks exact dependency versions so installs are repeatable. |
| `node_modules/` | Downloaded libraries (created by `npm install`, not committed). |

## 8. API

All routes use the address `/api/pads/:padId`, and the HTTP method decides the action.

| Method | Purpose | Success | Errors |
|---|---|---|---|
| `GET` | Load a pad's encrypted content | 200 with `{ content }` | 400 invalid ID, 404 not found, 500 server error |
| `PUT` | Create or update a pad | 200 with `{ message: "Saved" }` | 400 invalid ID or content, 500 server error |
| `DELETE` | Delete a pad | 200 with `{ message: "Deleted" }` | 400 invalid ID, 404 not found, 500 server error |

## 9. Run it on your computer

**You need:**

- [Node.js](https://nodejs.org) (LTS version)
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) account with a cluster, a database user, and network access allowed
- Git (optional, for cloning)

**Steps:**

1. Get the code:

   ```bash
   git clone https://github.com/MithilManchukonda/vaultpad.git
   cd vaultpad
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Create a file named `.env` in the main folder with your Atlas connection string:

   ```
   MONGO_URI=mongodb+srv://<username>:<password>@<your-cluster>.mongodb.net/vaultpad?retryWrites=true&w=majority
   ```

   Replace `<username>`, `<password>` and `<your-cluster>` with your own values. Do not add spaces or quotes.

4. Start the server:

   ```bash
   npm start
   ```

   You should see:

   ```
   Connected to MongoDB
   Server running at http://localhost:3000
   ```

5. Open **http://localhost:3000** in your browser, type any code, write a note, and click **Save**.

**If something goes wrong:**

| Problem | Fix |
|---|---|
| `bad auth: Authentication failed` | The username or password in `.env` is wrong. Use a password with only letters and numbers. |
| Connection timeout, or an IP-not-allowed message | In Atlas, open Network Access and allow your IP address. |
| `querySrv ECONNREFUSED` | Your network blocks the DNS lookup. The project already points Node to public DNS servers in `server.js`. If it persists, try another network or use Atlas's non-SRV connection string. |
| `EADDRINUSE` | Port 3000 is busy. Stop the other server or change `PORT`. |
| `crypto.subtle` is undefined | Open the app at `http://localhost:3000` (or over HTTPS). The Web Crypto API only works in secure contexts. |

## 10. Challenges I solved

- **A DNS error connecting to MongoDB Atlas.** The `mongodb+srv` address needs a DNS SRV lookup, and my network refused it. I read the error, found the cause, and fixed it by pointing Node to public DNS servers.
- **Keeping secrets safe.** I moved the database password into `.env`, added it to `.gitignore`, and checked the GitHub file list before and after publishing.
- **Understanding my own design.** Because the code *is* the pad's address, a mistyped code opens a different, empty pad rather than showing an error. This is a trade-off of having no accounts, and I made sure I could explain it.

## 11. Limitations (honest ones)

- A forgotten code cannot be recovered. Nobody can decrypt the notes without it.
- Security depends on the code being long and hard to guess. The pad ID is a fast hash, so someone with access to the database could try guessing common codes offline.
- Anyone who has the code can read, edit or delete the pad. There are no accounts or ownership checks.
- The server can still see metadata: the pad ID, the size of the encrypted text, and timestamps.
- There is no rate limiting yet, and no automated tests. I tested the flows manually.

## 12. Possible improvements

- Revision history, keeping the last few encrypted versions of a pad
- Auto-expiring pads using a MongoDB TTL index
- A slower hash (such as PBKDF2) for the pad ID, to make offline guessing harder
- Rate limiting on the API
- A code-strength indicator on the page
- Automated tests for the API routes

## 13. What I learned

- How a request travels from the browser, through Express, to MongoDB and back
- The difference between hashing and encryption, and why salts and IVs matter
- Designing a REST API with proper validation and status codes
- Managing secrets with environment variables and `.gitignore`
- Reading error messages, finding the real cause, and fixing it

## Author

**Mithil Manchukonda**: [GitHub](https://github.com/MithilManchukonda) | [LinkedIn](https://www.linkedin.com/in/manchukonda-mithil-a1595b362/)
