# Assumptions and strategy

This note records the choices behind the API so a reviewer can see what the code is doing and why.

## Assumptions

**The username is the first name.** The sample sheet repeats some email addresses, so email cannot identify one person. Search uses `firstName`. The stored text stays exactly as it appears in the sheet. A collation index on `firstName` (`locale: en`, `strength: 2`) makes the match ignore letter case and still use the index. `Lura Lucca` and `lura lucca` are the same user. The first row that is seen supplies the saved spelling and the other personal fields.

**A policy stores three links.** It stores the user id, the category id, and the carrier id. Agent and account are saved in their own collections. A policy does not point at them.

**Only the fields named in the task are stored.** City, premium, producer, policy type, and the other extra sheet columns are ignored.

**A policy number is inserted once.** Uploading the same sheet again does not update the existing policy. The unique index on `policyNumber` rejects the copy, and the response counts it as a duplicate. Master rows (agent, user, account, category, carrier) are reused when the same name already exists.

**One bad row does not undo a batch.** MongoDB is a standalone Docker instance, not a replica set, so the import does not use a multi-document transaction. Rows are saved in batches of 500. A duplicate policy is counted. A row that fails validation is counted as failed. The rest of the batch stays saved.

**CPU means this Node process only.** MongoDB, Redis, and the rest of the computer are ignored. `100%` means one CPU core was busy for the whole sample second. The check runs every second. At 70% or more the process exits with code 1.

**PM2 runs on the host.** Docker runs MongoDB and Redis. The Node app is not in a container, and PM2 is not inside a container. PM2's job is to start the process again after the CPU exit.

**The message time is the caller's local clock time.** `day` is `YYYY-MM-DD` and `time` is `HH:mm`. The time must still be in the future when the request arrives. The text is stored in Redis until that minute, then inserted into MongoDB.

**The scheduled-message worker runs in the API process.** BullMQ can run workers in a separate program and scale them on their own. For this assessment one worker starts with the server. Redis still holds the delayed job, so a CPU restart does not drop it.

**The grouped-policy list is paged.** The task asks for policies by each user. The sample file has 1,198 users, so `GET /api/policies` returns 10 users at a time. `page` and `limit` walk the full list. The limit cannot be raised above 10.

**One upload uses one parser thread.** The worker reads and maps the file. It does not write to MongoDB. The main thread does the writes, so many workers cannot insert the same agent or user at the same time. A large number of uploads at once is not queued in this version. Each request still starts its own parser thread.

## Strategy

### Upload

1. Multer stores the CSV or XLSX file and allows only those extensions, up to 10 MB. The form field name is `file`.
2. A `worker_threads` worker parses the sheet and posts plain rows back to the main thread. `node --watch` can send an extra startup message, and the controller ignores any message that is not the row list.
3. The main thread validates each row, then saves in batches of 500.
4. For each master collection it loads the names that already exist, inserts only the missing names, and loads the ids again so both old and new rows can be linked.
5. Policies are inserted with `bulkWrite` and `ordered: false`. A duplicate policy number is counted. Other write errors are counted as failed. Existing policies are not overwritten.
6. Indexes are created before the first write, including the case-insensitive unique index on `firstName` and the unique index on `policyNumber`.

### Search and grouping

Search finds one user with the case-insensitive collation, then looks up that user's policies, category names, and carrier names.

The grouped route uses the same lookup. It sorts users by first name, skips to the requested page, limits to at most 10 users, and only then joins policies. The join does not run for the users outside that page.

`userId` on `policies` is indexed because every policy lookup starts from a user id.

### CPU and PM2

`process.cpuUsage()` returns the microseconds this process spent on the CPU since the previous check. Dividing that by the real milliseconds that passed produces the percent of one core.

The process exits at 70%. `ecosystem.config.js` is an ES module because this package uses `"type": "module"`. `startPm2.js` imports that config and hands it to PM2. PM2 runs `src/server.js` with `autorestart` on, file watch off, and a 2 second delay before the next start.

### Scheduled message

`POST /api/messages` validates the body and adds one BullMQ job. The job delay is the number of milliseconds until the requested minute. The job id is a new id stored with the message, so a retry after a successful insert does not create a second document.

Redis configuration, queue settings, the worker, and the scheduling rules live in separate files:

- `src/config/redis.js` opens a Redis connection. The queue and the worker each open their own, because the worker holds a connection while it waits.
- `src/queues/scheduledMessage.queue.js` sets 5 attempts, exponential backoff starting at 2 seconds, and how long finished jobs stay in Redis.
- `src/workers/scheduledMessage.worker.js` inserts the MongoDB document when the delay ends. It can process 5 jobs at once.
- `src/services/scheduledMessage.service.js` checks the input and adds the delayed job.

On `SIGINT` or `SIGTERM` the server stops accepting HTTP requests, lets the current job finish, and closes the queue. A CPU exit stops the process immediately. The delayed job remains in Redis, and the worker continues it after PM2 starts the process again.
