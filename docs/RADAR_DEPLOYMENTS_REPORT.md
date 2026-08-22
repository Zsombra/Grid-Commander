# Radar Deployments Report

This document details the live Grid-Commander assets (coins) deployed on the BattleGrid Radar, and how they were mapped to their current strategies.

## Methodology
The mapping was constructed automatically by querying the BattleGrid MCP (https://mcp.battlegrid.trade/mcp) with the following workflow:
1. **Top Coins:** Extracted the top 36 volume-ranked assets using the get_top_ranked_coins tool.
2. **Asset Correlation:** Evaluated every active agent against the entire set of 36 coins using the get_agent_coin_qualification tool. This tool provided a definitive compatibility check via ggregateScore and trVolatility gates.
3. **Exclusive Deployment:** To prevent conflict constraints on the radar, the script identified the absolute single best agent for each coin. The chosen agent was assigned to the coin using upsert_radar_deployment with isDefault: true and priority: null.

## Live Deployment Table

| Asset / Ticker | Assigned Agent (Strategy) | Enabled |
| --- | --- | --- |
