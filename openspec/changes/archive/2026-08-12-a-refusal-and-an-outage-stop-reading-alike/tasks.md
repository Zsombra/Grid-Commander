# Tasks

## 1. The probe tells the three failures apart

- [x] 1.1 `code_of(detail)` mirrors `mcp-adapter.ts`'s `codeOf`: JSON-parse
      the refusal text, return its string `code`, else `None`.
- [x] 1.2 Both failure branches of `attempt()` record `call_failed_code`
      (the code on a refusal; `None` on a transport failure), and the
      fail line prints it.

## 2. Verification

- [x] 2.1 `python3 -m py_compile` passes; `code_of` answers
      `{"code":"VALIDATION_ERROR",...}` → `VALIDATION_ERROR`, prose → None.
