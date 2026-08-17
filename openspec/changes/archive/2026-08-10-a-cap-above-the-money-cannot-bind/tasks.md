# Tasks

- [x] 1.1 Read `get_account_state` behind a port. `AccountPort` says "one
      question, so one port" and answers identity — decide deliberately whether
      account *state* is a second question on that port or a port of its own,
      and write the reason down either way
- [x] 1.2 Carry the balance as the platform sends it: `usdc` is a **decimal
      string**, and `hasAccount: false` is a real answer distinct from an
      unreadable read and from a balance of zero
- [x] 1.3 Compare the exposure cap against it in the query, never in the
      component — the panel already keeps that rule, and a surface that works
      out `cap ÷ balance` for itself will one day work it out upside down
- [x] 1.4 Say which side is larger, not only the ratio. A cap that cannot bind
      is the finding; `5.7×` on its own is a number
- [x] 1.5 Draw no comparison for an unbounded cap — `unboundedCaps()` already
      names those, and a multiple against a non-existent limit describes nothing
- [x] 1.6 Label the balance as the account's. One balance funds every agent, and
      a per-agent reading would overstate it by the number of agents
- [x] 1.7 A fourth independent reading in the risk panel: an unreadable balance
      costs the comparison and not the exit geometry beside it
- [x] 1.8 Tests over the observed shapes — a cap above the balance, a cap below
      it, `hasAccount: false`, an unreadable account read alongside a healthy
      trade record, an unbounded cap, and the decimal-string parse
- [x] 1.9 Extend the key-gated live probe rather than adding a second: it
      already walks every agent, and the balance is one more read on the same
      account. Assert shape and computability, never a particular balance
- [x] 1.10 `./scripts/ci.sh` green, and the live probe run with a key —
      through `vitest.live.config.ts`, never the parallel default (#118)
- [x] 1.11 File what this change reads and does not surface: `agentSlots` and
      `mcpWagerEnabled`, both real account-level facts nothing renders

## What building it changed

**The port split turned on a contract, not on tidiness.** `AccountPort` says
"one question, so one port" and answers identity — but the decisive fact is that
`subjectFor` **swallows every failure into `null`** deliberately, because a
deployment that cannot establish its own account id must still work. A balance
read has the opposite contract: its whole value is telling *unreadable* from
*empty*. One interface cannot honestly carry both, and putting them together
would mean every future reader has to remember which methods lie about failure.
So: `AccountStatePort`, beside it, with the reason written down.

**The live run found something sharper than the p1 described.** It named `THE .0`
at `$250` against `$43.67`. True — and so are three others nobody flagged:

```
Breakwater: cap $45 vs balance $43.60 (1.03×)  ← cannot bind
Undertow:   cap $45 vs balance $43.60 (1.03×)  ← cannot bind
Vanguard:   cap $45 vs balance $43.60 (1.03×)  ← cannot bind
THE .0:     cap $250 vs balance $43.60 (5.73×) ← cannot bind
Volatilis:  cap $250 vs balance $43.60 (5.73×) ← cannot bind
```

A `$45` cap on a `$43.60` balance looks carefully chosen. It is over by **$1.40**,
so it cannot bind either — and that is exactly the class of thing this panel
exists to catch, because nobody would find it by reading the number. **All five
live agents have a non-binding exposure cap**; only the throwaway probes at
`$10` are genuinely capped.

**The balance moves between reads** — `$43.597857`, `$43.594913`, `$43.588892`
across one probe run — because the account is trading while it is read. Carried
as sent rather than rounded to a tidier figure that would imply more stability
than exists.

**Gates**: `./scripts/ci.sh` green; **1,998 vitest**, 81 db, 243 python harness.
Live probe run through `vitest.live.config.ts` — never the parallel default,
which is the rule the previous change landed.
