# Tasks: The stack runs from one command

## 1. Commit the stack

- [x] 1.1 `docker-compose.yml` at the repository root, tracked, with the three
      defect comments intact — the `PGDATA` path, the 5433 remap, and the
      user-defined network. A comment that only says *what* the line does is not
      enough; each says which failure it prevents.
- [x] 1.2 `.env.example` documents `POSTGRES_USER`, `POSTGRES_PASSWORD` and
      `POSTGRES_DB`, and states that `DATABASE_URL` is set **by** the compose file so
      it is not defined twice. Two `DATABASE_URL` values is the defect that pointed
      the app at the wrong server.

## 2. Prove it from a clean start

- [x] 2.1 `docker compose config --quiet` valid.
- [x] 2.2 The volume mount resolves to the parent of `PGDATA`, verified against the
      image's own `PGDATA` value rather than assumed.
- [x] 2.3 `docker compose up -d` reaches a serving app, and the running stack is the
      one this file describes.

## 3. Close out

- [x] 3.1 Backlog item `the-docker-stack-is-untracked` set to done.
- [x] 3.2 Journal entry.
