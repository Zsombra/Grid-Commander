# Tasks

## 1. Workflow

- [x] 1.1 Create `.github/workflows/validate.yml` triggered on `pull_request`
      and `push` to the default branch
- [x] 1.2 Check out the repo and provide python3 with no dependency install
- [x] 1.3 Run `openspec.py validate --all`, preserving its exit code
- [x] 1.4 Write diagnostics to the job summary as well as the log

## 2. Verification

- [x] 2.1 Confirm locally that errors exit 1 and warnings exit 0
- [x] 2.2 Confirm the exit code survives being piped or captured — a pipeline
      that swallows it would make CI pass silently on every error
- [x] 2.3 Confirm the workflow needs no `pip install`
