# {PROJECT_NAME} Data Pipeline Review Checklist

**Version**: 1.0.0
**Last Updated**: {DATE}
**Based On**: Provider / Plugin Pattern + Source-of-Truth Data Integrity
**Companion To**: `ARCHITECTURE_REVIEW_CHECKLIST.md`

---

## Purpose

This document enforces **end-to-end data pipeline integrity** for provider-based architectures. Every field displayed to the consumer MUST originate from an external source and flow through each layer without being fabricated, calculated, or patched in at intermediate layers.

**Core Rule: If the consumer displays it, the provider fetched it or the command layer computed it from fetched data. Never the consumer.**

### Problem Classes

| # | Defect | Symptom |
|---|--------|---------|
| 1 | **Consumer-side re-computation** | Same value derived differently in consumer vs command layer |
| 2 | **Conflicting definitions** | Multiple providers define the same concept with different logic |
| 3 | **Inconsistent nullability / hardcoded defaults** | Fallbacks mask missing data from external APIs |
| 4 | **Standard model drift** | Provider returns fields that don't match the standard model |
| 5 | **Transform data loss** | Transform pipeline silently drops or truncates fields |

---

## Pipeline Overview

<!-- INSTRUCTION: Adapt layers to user's actual stack. Skip layers that don't apply. -->

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: EXTERNAL DATA SOURCE                                  │
│  Third-party APIs, external databases, file systems             │
│  Rule: Raw data originates here. We do not control its schema.  │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: PROVIDER / FETCHER                                    │
│  {PROVIDER_FRAMEWORK} fetcher classes                           │
│  Location: {PROVIDERS_PATH}                                     │
│  Rule: Fetch raw data. Validate response. Return typed result.  │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: TRANSFORM PIPELINE                                    │
│  Raw response → Standard model mapping                          │
│  Location: {TRANSFORM_PATH}                                     │
│  Rule: Structural mapping only. No business logic.              │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 4: STANDARD MODEL                                        │
│  Shared data models / contracts                                 │
│  Location: {MODELS_PATH}                                        │
│  Rule: Single source of truth for data shape across providers.  │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 5: ROUTER / COMMAND (Application Layer)                  │
│  Command composition + derived value computation                │
│  Location: {ROUTER_PATH}                                        │
│  Rule: ONLY layer allowed to compute derived values.            │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 6: RESPONSE OBJECT                                       │
│  Typed response envelope (results + metadata)                   │
│  Rule: Wraps data with provider info, warnings. No additions.   │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 7: API / SDK / CLI SURFACE                               │
│  {API_FRAMEWORK} routes, SDK methods, CLI commands              │
│  Location: {API_PATH}                                           │
│  Rule: Pass-through ONLY. No field additions, no calculations.  │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
<!-- CONDITIONAL: Include only if frontend exists -->
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 8: CLIENT / UI                                           │
│  {FRONTEND_FRAMEWORK} components                                │
│  Location: {CLIENT_PATH}                                        │
│  Rule: DISPLAY ONLY. Read response fields. Format for display.  │
└────────────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
<!-- END CONDITIONAL: Frontend -->
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 9: PIPELINE COMPLETENESS                                 │
│  Verification gate — not a code layer                           │
│  Rule: Every command has a reachable consumer surface.          │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Source-of-Truth Principle (Iron Rule)

> **Every value displayed to a consumer MUST trace back to either:**
> 1. **An external data source** — fetched by a provider
> 2. **A command-layer computation** — derived from provider data, returned as a first-class field on the response object
>
> **NEVER:**
> - Computed by the consumer/client from other response fields
> - Patched in at the API surface layer
> - Hardcoded or approximated in the consumer
> - Silently defaulted when the provider didn't return it

---

## Layer-by-Layer Checklist

### Layer 1: External Data Source

| # | Check | Status |
|---|-------|--------|
| 1 | API endpoint / data source is documented in provider | ☐ |
| 2 | Expected response schema is documented or typed | ☐ |
| 3 | API rate limits and quotas are known and handled | ☐ |
| 4 | API authentication requirements are documented | ☐ |

### Layer 2: Provider / Fetcher

| # | Check | Status |
|---|-------|--------|
| 1 | Fetcher uses typed HTTP client for API calls | ☐ |
| 2 | API response is validated/parsed into typed structure | ☐ |
| 3 | Network errors produce clear, contextual errors | ☐ |
| 4 | Rate limit responses trigger backoff/retry | ☐ |
| 5 | Empty or partial responses handled explicitly (not silently ignored) | ☐ |
| 6 | No business calculations in the fetcher | ☐ |

### Layer 3: Transform Pipeline

| # | Check | Status |
|---|-------|--------|
| 1 | Transform maps external schema to standard model fields | ☐ |
| 2 | No field loss during transformation (all expected fields accounted for) | ☐ |
| 3 | No business logic in transform (structural mapping only) | ☐ |
| 4 | Date/time normalized to consistent format | ☐ |
| 5 | Null/missing fields explicitly mapped to null (not silently defaulted) | ☐ |
| 6 | Type conversions are explicit (string → number, not implicit) | ☐ |

### Layer 4: Standard Model

| # | Check | Status |
|---|-------|--------|
| 1 | Standard model defines all fields with types and descriptions | ☐ |
| 2 | Required vs optional fields clearly marked | ☐ |
| 3 | All providers conform to the same standard model for the same data type | ☐ |
| 4 | Provider-specific extra fields use extension mechanism | ☐ |
| 5 | Model changes are versioned (adding required fields is a breaking change) | ☐ |

### Layer 5: Router / Command

| # | Check | Status |
|---|-------|--------|
| 1 | All derived/computed values calculated HERE (not consumer) | ☐ |
| 2 | Every computed value is a named field on the response | ☐ |
| 3 | All computation inputs come from provider data | ☐ |
| 4 | Provider selection happens here (based on user choice or config) | ☐ |
| 5 | Multi-provider aggregation handled here (not in consumer) | ☐ |

### Layer 6: Response Object

| # | Check | Status |
|---|-------|--------|
| 1 | Response wraps data in typed envelope | ☐ |
| 2 | Provider name included in response metadata | ☐ |
| 3 | Warnings surfaced (not silently discarded) | ☐ |
| 4 | No field additions at this layer | ☐ |

### Layer 7: API / SDK / CLI Surface

| # | Check | Status |
|---|-------|--------|
| 1 | Surface passes response through without modification | ☐ |
| 2 | No field additions or calculations | ☐ |
| 3 | Response shape matches typed response object exactly | ☐ |
| 4 | API documentation matches actual response shape | ☐ |

<!-- CONDITIONAL: Include only if frontend exists -->
### Layer 8: Client / UI

| # | Check | Status |
|---|-------|--------|
| 1 | Component reads response fields directly — no derivation | ☐ |
| 2 | ZERO business calculations | ☐ |
| 3 | Only allowed: display formatting (number format, date format, truncation) | ☐ |
| 4 | Missing data shows error/empty state (not silent default) | ☐ |
<!-- END CONDITIONAL: Frontend -->

### Layer 9: Pipeline Completeness

| # | Check | Status |
|---|-------|--------|
| 1 | Every registered command is reachable via at least one surface (API, SDK, CLI) | ☐ |
| 2 | Every surface endpoint returns a typed response | ☐ |
| 3 | API documentation covers all available commands | ☐ |
| 4 | "N/A" justification documented if surface is intentionally skipped | ☐ |

---

## Provider Consistency Rules

### Cross-Provider Data Integrity

| # | Check | Status |
|---|-------|--------|
| 1 | Same data type from different providers uses the same standard model | ☐ |
| 2 | Field semantics are consistent (e.g., "volume" means the same thing) | ☐ |
| 3 | Date formats are normalized across providers | ☐ |
| 4 | Null handling is consistent (all providers treat missing data the same way) | ☐ |
| 5 | No provider silently invents data that the source doesn't provide | ☐ |

---

## Consumer-Side Allowed vs Prohibited Operations

### Allowed (Display Formatting Only)

```{LANGUAGE}
// ✅ Number formatting
{ALLOWED_NUMBER_FORMAT}

// ✅ Date/time formatting
{ALLOWED_DATE_FORMAT}

// ✅ Conditional rendering
{ALLOWED_CONDITIONAL_RENDER}
```

### Prohibited

```{LANGUAGE}
// ❌ Business calculations from response fields
{PROHIBITED_CONSUMER_CALC}

// ❌ Aggregation of response fields
{PROHIBITED_CONSUMER_AGG}

// ❌ Re-deriving a value the command layer should provide
{PROHIBITED_CONSUMER_REDERIVE}
```

---

## New Field Implementation Checklist

**When adding ANY new field to a response:**

| # | Step | Status |
|---|------|--------|
| 1 | Field added to standard model with type and description | ☐ |
| 2 | Source identified (which external API field?) | ☐ |
| 3 | Transform updated to map source field → standard model field | ☐ |
| 4 | ALL providers that return this data type are updated | ☐ |
| 5 | If derived: computation added to command layer | ☐ |
| 6 | Response object includes the field | ☐ |
| 7 | API surface passes field through | ☐ |
| 8 | Consumer reads field directly (no client-side calculation) | ☐ |
| 9 | Type-check passes across all packages | ☐ |
| 10 | API documentation updated | ☐ |

---

## Common Violations & Fixes

### ❌ Consumer-Side Computation

```{LANGUAGE}
// WRONG - Consumer calculates derived value
{CONSUMER_COMPUTATION_VIOLATION}
```

**Fix**: Add as computed field in command/router layer.

### ❌ Silent Default Masking Missing Data

```{LANGUAGE}
// WRONG - Fallback hides that provider didn't return data
{SILENT_DEFAULT_VIOLATION}
```

**Fix**: Surface missing data as explicit null/error. Fix provider or transform.

### ❌ Standard Model Drift

```{LANGUAGE}
// WRONG - Provider returns non-standard fields without extension mechanism
{MODEL_DRIFT_VIOLATION}
```

**Fix**: Use standard model fields or the explicit extension mechanism.

---

## Pipeline Audit Procedure

For each field displayed to the consumer, trace backwards:

1. Find the consumer/component that displays it
2. Trace to the API/SDK surface
3. Trace to the response object
4. Trace to the command/router that assembled it
5. Trace to the standard model that defines it
6. Trace to the transform that mapped it
7. Trace to the provider that fetched it
8. Trace to the external source that stores it

If any link is broken, fabricated, or duplicated — it's a violation.

---

**Document Maintainer**: {TEAM_OR_USER}
**Review Cycle**: Quarterly or on major pattern changes
