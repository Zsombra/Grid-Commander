# Tasks

- [ ] 1.1 Read `get_account_state` behind a port. `AccountPort` says "one
      question, so one port" and answers identity — decide deliberately whether
      account *state* is a second question on that port or a port of its own,
      and write the reason down either way
- [ ] 1.2 Carry the balance as the platform sends it: `usdc` is a **decimal
      string**, and `hasAccount: false` is a real answer distinct from an
      unreadable read and from a balance of zero
- [ ] 1.3 Compare the exposure cap against it in the query, never in the
      component — the panel already keeps that rule, and a surface that works
      out `cap ÷ balance` for itself will one day work it out upside down
- [ ] 1.4 Say which side is larger, not only the ratio. A cap that cannot bind
      is the finding; `5.7×` on its own is a number
- [ ] 1.5 Draw no comparison for an unbounded cap — `unboundedCaps()` already
      names those, and a multiple against a non-existent limit describes nothing
- [ ] 1.6 Label the balance as the account's. One balance funds every agent, and
      a per-agent reading would overstate it by the number of agents
- [ ] 1.7 A fourth independent reading in the risk panel: an unreadable balance
      costs the comparison and not the exit geometry beside it
- [ ] 1.8 Tests over the observed shapes — a cap above the balance, a cap below
      it, `hasAccount: false`, an unreadable account read alongside a healthy
      trade record, an unbounded cap, and the decimal-string parse
- [ ] 1.9 Extend the key-gated live probe rather than adding a second: it
      already walks every agent, and the balance is one more read on the same
      account. Assert shape and computability, never a particular balance
- [ ] 1.10 `./scripts/ci.sh` green, and the live probe run with a key —
      through `vitest.live.config.ts`, never the parallel default (#118)
- [ ] 1.11 File what this change reads and does not surface: `agentSlots` and
      `mcpWagerEnabled`, both real account-level facts nothing renders
