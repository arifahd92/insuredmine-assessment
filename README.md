# InsuredMine assessment

Node.js API that loads the sample insurance sheet into MongoDB, searches and groups policies, restarts this process when its CPU reaches 70%, and saves a message at a day and time chosen by the caller.

The design choices and assumptions are in [docs/DESIGN.md](docs/DESIGN.md).

## Requirements

- Node.js 18 or newer
- Docker, for MongoDB and Redis only
- The app runs on the host. It is not inside a container.

## Start

```powershell
copy .env.example .env
docker compose up -d
npm install
npm run pm2:start
```

The API listens on `http://localhost:3000`.

Check that it is up:

```powershell
Invoke-RestMethod http://localhost:3000/
```

Follow the process log:

```powershell
npm run pm2:logs
```

Stop it:

```powershell
npm run pm2:stop
```

`npm start` runs the same server without PM2. Use PM2 for the CPU task, because PM2 is what starts the process again after it exits. `npm run dev` uses `node --watch`, which also restarts on exit, so it hides the PM2 behavior.

MongoDB and Redis keep their data in Docker volumes. Start them again later with `docker compose up -d`.

## APIs

### Upload the sheet

`POST /api/upload`

Postman: **Body → form-data**. Key name `file`, type **File**. CSV or XLSX, up to 10 MB.

A worker thread reads the rows. The main thread saves them. The first upload of the sample sheet reports about `new: 1198`. A second upload of the same file reports `duplicates: 1198` and does not add policies.

### Search one user

`GET /api/policies/search?username=Lura%20Lucca`

`username` is the first name. Letter case does not matter. `lura lucca` finds the stored name `Lura Lucca`.

The response has the user and that user's policies, including category name and carrier name.

### Policies grouped by user

`GET /api/policies`

Returns 10 users per page, sorted by first name. Each user includes that user's policies.

`GET /api/policies?page=2&limit=10`

`page` defaults to 1. `limit` defaults to 10. A limit above 10 is reduced to 10.

### Schedule a message

`POST /api/messages`

Postman: **Body → raw → JSON**.

```json
{
  "message": "Call the client",
  "day": "2026-09-30",
  "time": "14:30"
}
```

`day` is `YYYY-MM-DD`. `time` is `HH:mm` on the computer running the API. Both must be in the future.

The response is `202`. The `messages` collection stays empty until that minute. Then one document is inserted. `createdAt` is the insert time.

## CPU restart

The log prints this process's CPU percent once a second. One full core is `100%`. At `70%` or more the process exits. PM2 waits 2 seconds and starts `src/server.js` again.

An idle server stays near `0%`. To see the exit under PM2, run the separate load script and then delete it. That script keeps one core busy, so it will cross 70% on every restart until you delete it.

```powershell
npx pm2 start cpu-load.js --name cpu-test
npx pm2 logs cpu-test
npx pm2 delete cpu-test
```

## Collections

| Collection | What one record holds |
|---|---|
| `agents` | agent name |
| `users` | first name, date of birth, address, phone, state, zip, email, gender, user type |
| `useraccounts` | account name |
| `lobs` | category name |
| `carriers` | company name |
| `policies` | policy number, start date, end date, category id, carrier id, user id |
| `messages` | scheduled message text, day, time |
