# {PROJECT_NAME} Architecture Review Checklist

**Version**: 1.0.0
**Last Updated**: {DATE}
**Based On**: Provider / Plugin Pattern + {ADDITIONAL_PATTERNS}

---

## Purpose

This document provides standardized review checklists for all components in a provider-based plugin architecture. Use these checklists when:

- Creating new providers, fetchers, or extensions
- Reviewing pull requests that modify core or provider components
- Auditing existing code for architectural compliance

---

## Layer Overview

<!-- INSTRUCTION: Replace framework names and folder paths with the user's actual stack -->

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONSUMER LAYER                              │
│   {API_FRAMEWORK} Routes, CLI Commands, SDK Entry Points        │
│   Location: {CONSUMER_PATH}                                     │
│   Rule: Receive requests, route to commands, return responses   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ROUTER / COMMAND LAYER                      │
│   Command Routers, Extension Entry Points                       │
│   Location: {ROUTER_PATH}                                       │
│   Rule: Compose operations, delegate to provider interface      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PROVIDER INTERFACE LAYER                        │
│   Standard Models, Provider Abstractions, Registry               │
│   Location: {CORE_PATH}                                         │
│   Rule: Define contracts. Providers implement, consumers depend. │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PROVIDER LAYER                              │
│   Concrete Providers (data source adapters)                     │
│   Location: {PROVIDERS_PATH}                                    │
│   Rule: Implement standard interfaces. Fetch + transform data.  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  EXTERNAL SOURCES                                │
│   Third-party APIs, Databases, File Systems                     │
│   Rule: Accessed ONLY through providers. Never directly.        │
└─────────────────────────────────────────────────────────────────┘
```

**Dependency Rule**: Consumers and routers depend on the provider interface. Providers implement the interface. No direct dependencies between providers. No consumer layer importing provider internals.

---

## Provider Review Checklist

### File Naming & Location

| # | Check | Required |
|---|-------|----------|
| 1 | Provider package in `{PROVIDERS_PATH}` | ✅ |
| 2 | File naming follows `{FILE_NAMING_CONVENTION}` | ✅ |
| 3 | Provider class/module clearly named after data source | ✅ |
| 4 | Fetcher classes organized in `models/` or equivalent | ✅ |

### Provider Registration

<!-- INSTRUCTION: Adapt to user's registration mechanism (entry points, decorators, config, manual) -->

| # | Check | Status |
|---|-------|--------|
| 1 | Provider registered via {REGISTRATION_MECHANISM} | ☐ |
| 2 | Registration includes name, description, and capabilities | ☐ |
| 3 | Provider discoverable by core without hardcoded imports | ☐ |
| 4 | Adding a new provider does NOT require modifying core code | ☐ |

### Standard Model Compliance

<!-- CONDITIONAL: Include only if project uses standard/shared models -->

| # | Check | Status |
|---|-------|--------|
| 1 | Fetcher return type implements the standard model interface | ☐ |
| 2 | All required fields from standard model are populated | ☐ |
| 3 | Provider-specific extra fields use the extension mechanism (not ad-hoc fields) | ☐ |
| 4 | Field types match standard model exactly (no implicit casts) | ☐ |
| 5 | Nullable fields are explicitly nullable in the model (not silently defaulted) | ☐ |

**Pattern**:
```{LANGUAGE}
// ✅ CORRECT — Implements standard model, extra fields via extension
{CORRECT_MODEL_COMPLIANCE_EXAMPLE}

// ❌ WRONG — Returns ad-hoc fields not in standard model
{WRONG_MODEL_COMPLIANCE_EXAMPLE}
```

### Fetcher / Data Access Pattern

| # | Check | Status |
|---|-------|--------|
| 1 | Fetcher has a single responsibility (one data type per fetcher) | ☐ |
| 2 | External API calls use typed HTTP client (not raw string URLs) | ☐ |
| 3 | API responses are validated/parsed into typed models | ☐ |
| 4 | Error responses from external APIs are handled (not swallowed) | ☐ |
| 5 | Rate limiting / retry logic is present for external API calls | ☐ |
| 6 | API credentials accessed from configuration (not hardcoded) | ☐ |
| 7 | Transform logic is separated from fetch logic | ☐ |

**Pattern**:
```{LANGUAGE}
// ✅ CORRECT — Typed fetch, validation, error handling
{CORRECT_FETCHER_EXAMPLE}

// ❌ WRONG — Raw HTTP, no validation, swallowed errors
{WRONG_FETCHER_EXAMPLE}
```

### Transform Pipeline

| # | Check | Status |
|---|-------|--------|
| 1 | Raw API response transformed to standard model in a dedicated transform step | ☐ |
| 2 | Transform does NOT add business logic (only structural mapping) | ☐ |
| 3 | No silent data loss during transformation (all fields accounted for) | ☐ |
| 4 | Date/time fields normalized to consistent format | ☐ |
| 5 | Numeric fields have consistent precision/type | ☐ |

---

## SOLID Principles

### S - Single Responsibility

| # | Check | Status |
|---|-------|--------|
| 1 | Each provider covers one data source (not multiple) | ☐ |
| 2 | Each fetcher handles one data type/endpoint | ☐ |
| 3 | Routers compose operations but don't implement business logic | ☐ |
| 4 | Transform logic is separate from fetch logic | ☐ |

### O - Open/Closed

| # | Check | Status |
|---|-------|--------|
| 1 | New data sources added by creating new providers (not modifying core) | ☐ |
| 2 | New data types added by creating new fetchers (not modifying existing) | ☐ |
| 3 | Core framework is extensible without modification | ☐ |

### L - Liskov Substitution

| # | Check | Status |
|---|-------|--------|
| 1 | Any provider can be swapped for another that implements the same interface | ☐ |
| 2 | Standard model contract is honored by all providers | ☐ |
| 3 | Consumer code works the same regardless of which provider is selected | ☐ |

### I - Interface Segregation

| # | Check | Status |
|---|-------|--------|
| 1 | Provider interface is minimal (only what consumers need) | ☐ |
| 2 | Providers don't implement capabilities they don't support | ☐ |
| 3 | Optional capabilities use separate interfaces or flags | ☐ |

### D - Dependency Inversion

| # | Check | Status |
|---|-------|--------|
| 1 | Consumers depend on provider interface, not concrete providers | ☐ |
| 2 | Core does NOT import from specific provider packages | ☐ |
| 3 | Provider selection happens at runtime via registry, not hardcoded imports | ☐ |

---

## Router / Command Review Checklist

### File Naming & Location

| # | Check | Required |
|---|-------|----------|
| 1 | Routers in `{ROUTER_PATH}` | ✅ |
| 2 | Hierarchical naming matches API structure | ✅ |
| 3 | Sub-routers compose without circular dependencies | ✅ |

### Command Pattern

| # | Check | Status |
|---|-------|--------|
| 1 | Command receives typed parameters | ☐ |
| 2 | Command delegates to provider interface (not directly to provider) | ☐ |
| 3 | Command returns typed response object | ☐ |
| 4 | Command does NOT contain data transformation logic | ☐ |
| 5 | Error handling converts provider errors to consumer-friendly errors | ☐ |

---

## Response Object Review Checklist

<!-- INSTRUCTION: Adapt to project's response object (OBBject, Result, Response, etc.) -->

| # | Check | Status |
|---|-------|--------|
| 1 | Response object is generic/typed for the data it contains | ☐ |
| 2 | Includes metadata (provider name, warnings, timestamps) | ☐ |
| 3 | Conversion methods exist for common formats (DataFrame, JSON, dict) | ☐ |
| 4 | Serializable for API responses | ☐ |
| 5 | Error state is explicit (not null/None with no explanation) | ☐ |

---

## Extension Review Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Extension is self-contained (own package/module) | ☐ |
| 2 | Extension declares its dependencies explicitly | ☐ |
| 3 | Extension registers via the standard mechanism | ☐ |
| 4 | Extension does NOT modify core code | ☐ |
| 5 | Extension can be added/removed without affecting other extensions | ☐ |
| 6 | Extension has its own tests | ☐ |

---

## Logging Standards

| # | Check | Status |
|---|-------|--------|
| 1 | Uses structured logger (NOT print/console) | ☐ |
| 2 | Log messages include context (provider name, operation, parameters) | ☐ |
| 3 | Error logs include the external API response details | ☐ |
| 4 | Sensitive data (API keys, tokens, credentials) NOT logged | ☐ |
| 5 | Log levels used appropriately (DEBUG for API calls, ERROR for failures) | ☐ |

---

## Error Handling

| # | Check | Status |
|---|-------|--------|
| 1 | External API errors caught and converted to application errors | ☐ |
| 2 | Network timeouts have explicit handling | ☐ |
| 3 | Rate limit responses trigger backoff/retry | ☐ |
| 4 | Partial failures (some providers succeed, some fail) handled gracefully | ☐ |
| 5 | Errors NOT swallowed silently | ☐ |
| 6 | Error context includes which provider/fetcher failed | ☐ |

---

## Configuration & Credentials

| # | Check | Status |
|---|-------|--------|
| 1 | API credentials stored in environment variables or config file | ☐ |
| 2 | No credentials hardcoded in source code | ☐ |
| 3 | Credential names follow consistent pattern ({PROVIDER_NAME}_{CREDENTIAL_TYPE}) | ☐ |
| 4 | Missing credentials produce clear error (not cryptic API failure) | ☐ |
| 5 | Configuration is injectable (not global singleton) | ☐ |

---

<!-- CONDITIONAL: Include only if user selected Auth module -->
## Authentication / Authorization Review Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Auth check happens at consumer/API layer (not in providers) | ☐ |
| 2 | Providers receive validated user context (not raw tokens) | ☐ |
| 3 | API keys for external sources are separate from user auth | ☐ |
<!-- END CONDITIONAL: Auth -->

---

<!-- CONDITIONAL: Include only if user selected WebSocket module -->
## WebSocket / Real-time Review Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Connection authenticated on handshake | ☐ |
| 2 | Subscriptions cleaned up on disconnect | ☐ |
| 3 | Data pushed through same provider interface as request/response | ☐ |
<!-- END CONDITIONAL: WebSocket -->

---

<!-- CONDITIONAL: Include only if user selected Testing module -->
## Testing Standards

| # | Check | Status |
|---|-------|--------|
| 1 | Each provider has unit tests with mocked API responses | ☐ |
| 2 | Integration tests verify real API calls (marked separately) | ☐ |
| 3 | Standard model compliance tested per provider | ☐ |
| 4 | Router/command tests mock the provider interface | ☐ |
| 5 | Transform pipeline tested with sample data | ☐ |
<!-- END CONDITIONAL: Testing -->

---

<!-- CONDITIONAL: Include only if user selected Security module -->
## Security Review Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | No secrets in source code (use secret detection tool) | ☐ |
| 2 | External API responses sanitized before storage/display | ☐ |
| 3 | User input validated before passing to providers | ☐ |
| 4 | API keys rotatable without code changes | ☐ |
<!-- END CONDITIONAL: Security -->

---

<!-- CONDITIONAL: Include if user provided project-specific policies -->
## Project-Specific Policies

<!-- INSTRUCTION: Generate from user's custom policies -->
<!-- END CONDITIONAL: Project Policies -->

---

## Common Anti-Patterns

### ❌ Direct External API Call From Consumer

```{LANGUAGE}
// WRONG - Consumer calls external API directly, bypassing provider
{DIRECT_API_CALL_EXAMPLE}
```

**Fix**: All external data access goes through a registered provider.

---

### ❌ Provider Coupling

```{LANGUAGE}
// WRONG - One provider imports from another provider
{PROVIDER_COUPLING_EXAMPLE}
```

**Fix**: Providers are independent. Share logic via core utilities.

---

### ❌ Hardcoded Provider Selection

```{LANGUAGE}
// WRONG - Consumer hardcodes which provider to use
{HARDCODED_PROVIDER_EXAMPLE}
```

**Fix**: Provider selected via registry or configuration at runtime.

---

### ❌ Untyped API Response

```{LANGUAGE}
// WRONG - Raw dict/JSON used without validation
{UNTYPED_RESPONSE_EXAMPLE}
```

**Fix**: Parse into typed model, validate required fields.

---

### ❌ Swallowed External API Errors

```{LANGUAGE}
// WRONG - External API error caught and ignored
{SWALLOWED_ERROR_EXAMPLE}
```

**Fix**: Log error with context, return meaningful error to consumer.

---

### ❌ Credentials in Source Code

```{LANGUAGE}
// WRONG - API key hardcoded
{HARDCODED_CREDENTIALS_EXAMPLE}
```

**Fix**: Use environment variables or config file.

---

## Review Summary Template

```markdown
## Component Review: [ComponentName]

**File**: [path]
**Layer**: [Consumer/Router/Provider Interface/Provider/Extension]
**Reviewer**: [name]
**Date**: [date]

### Checklist Results

| Category | Pass | Fail | N/A |
|----------|------|------|-----|
| SOLID Principles | X/Y | X/Y | - |
| Provider Compliance | X/Y | X/Y | - |
| Standard Model | X/Y | X/Y | - |
| Error Handling | X/Y | X/Y | - |
| Configuration | X/Y | X/Y | - |
| Logging | X/Y | X/Y | - |

### Issues Found

1. [Issue description + file:line]

### Verdict

- [ ] Approved
- [ ] Approved with minor changes
- [ ] Changes requested
```

---

## Quick Reference Card

| Pattern | Rule |
|---------|------|
| **Provider Independence** | Providers don't import from each other |
| **Standard Models** | All providers return standard-compliant data |
| **Registry** | Provider selection via registry, not hardcoded |
| **Credentials** | Environment variables only, never in code |
| **Error Handling** | Convert external errors to application errors |
| **Logging** | Structured logger with provider context |
| **Extensions** | Self-contained, addable/removable without core changes |
| **Quality Gate** | Type-check and lint must pass before every commit |

---

**Document Maintainer**: {TEAM_OR_USER}
**Review Cycle**: Quarterly or on major pattern changes
