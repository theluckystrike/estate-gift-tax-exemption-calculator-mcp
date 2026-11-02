// GET / page for the hosted Worker.
const TOOLS: Array<[string, string]> = [
  ["get_exemption_amounts", "Basic exclusion amount, applicable credit, annual gift exclusion and non-citizen spouse exclusion for 2011-2026."],
  ["calculate_estate_tax", "Federal estate tax the Form 706 way: 2001(c) rates, lifetime gifts, DSUE portability. 2013-2026."],
  ["check_gift", "Annual exclusion, gift splitting, citizen and non-citizen spouse rules, Form 709 need, exemption left."],
  ["compare_years", "Two years side by side, with the estate tax on the same estate in each."],
];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function landingPage(origin: string): string {
  const mcp = `${origin}/mcp`;
  const rows = TOOLS.map(([n, d]) => `<tr><td><code>${n}</code></td><td>${esc(d)}</td></tr>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Estate and Gift Tax Exemption Calculator MCP</title>
<meta name="description" content="MCP server for the 2026 federal estate and gift tax: $15,000,000 exemption under P.L. 119-21, unified rate schedule, annual exclusion, portability.">
<style>:root{--bg:#fff;--fg:#1a1a1a;--muted:#555;--line:#ddd;--code:#f4f4f4}
@media (prefers-color-scheme:dark){:root{--bg:#141414;--fg:#eee;--muted:#aaa;--line:#333;--code:#222}}
body{background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,sans-serif;max-width:760px;margin:0 auto;padding:24px 16px}
code,pre{background:var(--code);border-radius:4px;font-size:14px}pre{padding:10px;overflow-x:auto}code{padding:1px 4px}
table{border-collapse:collapse;width:100%}td{border-top:1px solid var(--line);padding:8px 6px;vertical-align:top}p.small{color:var(--muted);font-size:14px}a{color:inherit}</style></head>
<body><h1>Estate and gift tax exemption calculator MCP server</h1>
<p>Gives an AI assistant the federal estate and gift tax rules that are newer than its training data. P.L. 119-21 (July 4, 2025) set the basic exclusion amount to $15,000,000 for 2026, indexed after that, so the scheduled drop to about half never happened. The 2026 annual gift exclusion is $19,000 and gifts to a non-citizen spouse are excluded up to $194,000 (Rev. Proc. 2025-32). Every number is copied from IRS and statute sources.</p>
<h2>Connect</h2>
<p>Hosted endpoint (Streamable HTTP, no sign-in, no token). Paste it into Claude.ai custom connectors or ChatGPT developer mode.</p>
<pre>${esc(mcp)}</pre>
<p>Claude Code</p><pre>claude mcp add --transport http estate-gift-tax ${esc(mcp)}</pre>
<p>Local (stdio)</p><pre>npx -y github:theluckystrike/estate-gift-tax-exemption-calculator-mcp</pre>
<h2>Tools</h2><table>${rows}</table>
<p>Charitable bequests and gifts lower a taxable estate: <a href="https://taxbreakcalc.com/charitable-deduction-calculator/?utm_source=mcp&amp;utm_medium=estate-gift-tax-exemption-calculator-mcp">taxbreakcalc.com charitable deduction calculator</a>.
Source: <a href="https://github.com/theluckystrike/estate-gift-tax-exemption-calculator-mcp">github.com/theluckystrike/estate-gift-tax-exemption-calculator-mcp</a>.</p>
<p class="small">Federal only. General information, not legal or tax advice. Part of the Zovo MCP collection: <a href="https://mcp.zovo.one">mcp.zovo.one</a>.</p>
</body></html>`;
}
