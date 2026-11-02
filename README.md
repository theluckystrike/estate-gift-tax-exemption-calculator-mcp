# estate-gift-tax-exemption-calculator-mcp

Estate and gift tax exemption calculator MCP server: the 2026 federal estate tax exemption of $15,000,000 under P.L. 119-21, the unified rate schedule, the annual gift exclusion, gift splitting, non-citizen spouse gifts and portability (DSUE).

Your model was probably trained when the estate tax exemption was scheduled to fall to about half on January 1, 2026, when the Tax Cuts and Jobs Act doubling expired. That did not happen. The One Big Beautiful Bill Act (P.L. 119-21, sec. 70106, signed July 4, 2025) set the basic exclusion amount to $15,000,000 for 2026, indexed for inflation after 2026, with no sunset. This server gives an assistant those rules from IRS and statute sources.

Federal only. Not legal or tax advice.

## Tools

| Tool | What it does |
| --- | --- |
| `get_exemption_amounts` | Basic exclusion amount, applicable credit, filing threshold, annual gift exclusion (and doubled with gift splitting), non-citizen spouse exclusion, GST exemption and top rate for a year, 2011-2026. |
| `calculate_estate_tax` | Federal estate tax the Form 706 way: gross estate minus deductions, plus lifetime taxable gifts, tentative tax on the 26 USC 2001(c) schedule, minus gift tax payable and the applicable credit on the basic exclusion plus DSUE. 2013-2026. |
| `check_gift` | Checks a gift: annual exclusion per recipient, gift splitting (sec. 2513), unlimited marital deduction for a US citizen spouse, the separate exclusion for a non-citizen spouse, whether Form 709 is needed, lifetime exemption left and gift tax due. |
| `compare_years` | Two years side by side, with the estate tax on the same taxable estate in each. Default 2025 vs 2026. |

Every result has structured JSON, a plain-English summary, `as_of`, a `source` URL and a `more` link.

## What it knows that your model does not

- The 2026 basic exclusion amount is $15,000,000 per person ($30,000,000 for a married couple using portability). P.L. 119-21 sec. 70106 replaced the $5,000,000 base in sec. 2010(c)(3) with $15,000,000 and struck the TCJA sunset. Amounts after 2026 are indexed and rounded to the nearest $10,000.
- The 2025 amount was $13,990,000 (Rev. Proc. 2024-40). The applicable credit is $5,945,800 for 2026 and $5,541,800 for 2025.
- The 2026 annual gift exclusion is $19,000 per recipient, the same as 2025, or $38,000 with gift splitting.
- Gifts to a spouse who is not a US citizen get no unlimited marital deduction. The annual exclusion for them is $194,000 for 2026 (Rev. Proc. 2025-32) and was $190,000 for 2025 (Rev. Proc. 2024-40).
- The 2026 GST exemption is $15,000,000 (Rev. Proc. 2025-32).
- The top rate is still 40% above $1,000,000 on the unified schedule in 26 USC 2001(c).
- A surviving spouse can add the deceased spouse's unused exclusion (DSUE) only if the executor files a timely Form 706 and elects portability.

## Install

### Claude.ai custom connector or ChatGPT developer mode

Add a custom connector and paste the URL. No token is needed.

```
https://estate-gift-tax-exemption-calculator-mcp.lipmichal.workers.dev/mcp
```

### Claude Code

```
claude mcp add --transport http estate-gift-tax https://estate-gift-tax-exemption-calculator-mcp.lipmichal.workers.dev/mcp
```

Or run it locally:

```
claude mcp add estate-gift-tax -- npx -y github:theluckystrike/estate-gift-tax-exemption-calculator-mcp
```

### Claude Desktop

Add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "estate-gift-tax": {
      "command": "npx",
      "args": ["-y", "github:theluckystrike/estate-gift-tax-exemption-calculator-mcp"]
    }
  }
}
```

### Cursor

Add this to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "estate-gift-tax": {
      "url": "https://estate-gift-tax-exemption-calculator-mcp.lipmichal.workers.dev/mcp"
    }
  }
}
```

### VS Code

Add this to `.vscode/mcp.json`:

```json
{
  "servers": {
    "estate-gift-tax": {
      "type": "http",
      "url": "https://estate-gift-tax-exemption-calculator-mcp.lipmichal.workers.dev/mcp"
    }
  }
}
```

Node 20 or newer is needed for the local `npx` version.

## Example prompts

- "What is the federal estate tax exemption for 2026? Did it get cut in half?"
- "My mother died in 2026 with a $22 million estate, $2 million left to charity. How much federal estate tax is due?"
- "My husband died in 2024 and his executor elected portability of $6 million. What happens if my estate is $19 million?"
- "Can my wife and I give each of our four grandchildren $40,000 in 2026 without a gift tax return?"
- "My wife is not a US citizen. How much can I give her in 2026 tax free?"

## Data sources

All numbers were copied from primary sources fetched on 2026-11-02. See [DATA_SOURCES.md](DATA_SOURCES.md).

## Limitations

- Federal estate and gift tax only. State estate and inheritance taxes are not included.
- Exemption amounts cover 2011-2026. The 2027 inflation-adjusted amounts were not found in an IRS source on 2026-11-02, so 2027 requests return an error. Calculations cover 2013-2026, the years the current 2001(c) schedule applies.
- The non-citizen spouse exclusion is loaded for 2025 and 2026 only.
- You supply the gross estate, deductions, lifetime taxable gifts and DSUE. Valuation, special use valuation (sec. 2032A), credits for foreign death taxes or prior transfers, and the generation-skipping transfer tax calculation are not modeled.
- Gift tax due assumes no earlier gift tax was paid and no DSUE is applied to gifts. Gifts of future interests do not get the annual exclusion; the tool assumes present-interest gifts.
- Not legal or tax advice. Forms 706 and 709 and their instructions decide the official amounts.

## More

Charitable bequests and gifts lower a taxable estate: [taxbreakcalc.com charitable deduction calculator](https://taxbreakcalc.com/charitable-deduction-calculator/?utm_source=mcp&utm_medium=estate-gift-tax-exemption-calculator-mcp).

Part of the Zovo MCP collection: https://mcp.zovo.one

## Development

```
npm install
npm run build
npm test
```

`src/core.ts` holds all the rules and has no I/O. `src/stdio.ts` is the local entry and `src/worker.ts` is the Cloudflare Worker entry. Both use the same tool registry in `src/tools.ts`.

## License

MIT

<!-- data-servers:start -->
## More data servers from the same author

Each one is free, needs no API key and has a hosted URL you can paste into Claude or ChatGPT.

| server | tools | hosted URL |
|---|---|---|
| [cups-to-grams-mcp](https://github.com/theluckystrike/cups-to-grams-mcp) | convert_ingredient, search_ingredients, scale_recipe, convert_oven_temperature | `https://cups-to-grams-mcp.lipmichal.workers.dev/mcp` |
| [dscr-loan-calculator-mcp](https://github.com/theluckystrike/dscr-loan-calculator-mcp) | calculate_dscr, max_loan_for_target_dscr, rent_needed_for_target_dscr, compare_scenarios, amortization_summary | `https://dscr-loan-calculator-mcp.lipmichal.workers.dev/mcp` |
| [gold-price-per-gram-mcp](https://github.com/theluckystrike/gold-price-per-gram-mcp) | get_gold_price_per_gram, get_metal_prices, calculate_jewelry_value, convert_gold_units | `https://gold-price-per-gram-mcp.lipmichal.workers.dev/mcp` |
| [lake-level-mcp](https://github.com/theluckystrike/lake-level-mcp) | search_lakes, get_lake_level, get_lake_history, compare_lakes | `https://lake-level-mcp.lipmichal.workers.dev/mcp` |
| [minimum-wage-mcp](https://github.com/theluckystrike/minimum-wage-mcp) | get_minimum_wage, list_upcoming_increases, compare_states, annual_income_at_minimum_wage | `https://minimum-wage-mcp.lipmichal.workers.dev/mcp` |
| [no-tax-on-overtime-mcp](https://github.com/theluckystrike/no-tax-on-overtime-mcp) | calculate_overtime_deduction, calculate_tips_deduction, calculate_senior_deduction, estimate_tax_savings, explain_eligibility | `https://no-tax-on-overtime-mcp.lipmichal.workers.dev/mcp` |
| [paycheck-calculator-mcp](https://github.com/theluckystrike/paycheck-calculator-mcp) | calculate_take_home_pay, compare_states_take_home, salary_to_hourly, hourly_to_salary, get_federal_tax_brackets | `https://paycheck-calculator-mcp.lipmichal.workers.dev/mcp` |
| [uk-income-tax-salary-mcp](https://github.com/theluckystrike/uk-income-tax-salary-mcp) | calculate_uk_take_home, get_uk_tax_bands, compare_salaries, marginal_rate_at_income | `https://uk-income-tax-salary-mcp.lipmichal.workers.dev/mcp` |
| [us-federal-holidays-business-days-mcp](https://github.com/theluckystrike/us-federal-holidays-business-days-mcp) | list_federal_holidays, is_business_day, add_business_days, count_business_days, invoice_due_date | `https://us-federal-holidays-business-days-mcp.lipmichal.workers.dev/mcp` |
| [ab-test-sample-size-calculator-mcp](https://github.com/theluckystrike/ab-test-sample-size-calculator-mcp) | calculate_sample_size, estimate_test_duration, test_ab_significance, fisher_exact_test, check_peeking_risk | `https://ab-test-sample-size-calculator-mcp.lipmichal.workers.dev/mcp` |
| [aca-premium-tax-credit-calculator-mcp](https://github.com/theluckystrike/aca-premium-tax-credit-calculator-mcp) | get_federal_poverty_level, calculate_premium_tax_credit, check_subsidy_cliff, get_aptc_repayment_cap | `https://aca-premium-tax-credit-calculator-mcp.lipmichal.workers.dev/mcp` |
| [ap-score-distributions-mcp](https://github.com/theluckystrike/ap-score-distributions-mcp) | get_ap_score_distribution, estimate_ap_percentile, compare_ap_exams, list_ap_exams, estimate_ap_score_from_composite | `https://ap-score-distributions-mcp.lipmichal.workers.dev/mcp` |
| [car-loan-interest-deduction-calculator-mcp](https://github.com/theluckystrike/car-loan-interest-deduction-calculator-mcp) | calculate_car_loan_interest_deduction, calculate_salt_deduction, get_tax_brackets_and_standard_deduction, calculate_child_tax_credit | `https://car-loan-interest-deduction-calculator-mcp.lipmichal.workers.dev/mcp` |
| [recipe-nutrition-calculator-mcp](https://github.com/theluckystrike/recipe-nutrition-calculator-mcp) | lookup_ingredient_nutrition, calculate_recipe_nutrition, round_nutrition_label, scale_recipe_nutrition | `https://recipe-nutrition-calculator-mcp.lipmichal.workers.dev/mcp` |
| [retirement-contribution-limits-2027-mcp](https://github.com/theluckystrike/retirement-contribution-limits-2027-mcp) | get_contribution_limits, calculate_max_contribution, get_social_security_cola, compare_years | `https://retirement-contribution-limits-2027-mcp.lipmichal.workers.dev/mcp` |
| [section-179-deduction-calculator-mcp](https://github.com/theluckystrike/section-179-deduction-calculator-mcp) | calculate_section_179, calculate_bonus_depreciation, get_vehicle_depreciation_limits, calculate_asset_loan_payment | `https://section-179-deduction-calculator-mcp.lipmichal.workers.dev/mcp` |
| [student-loan-repayment-assistance-plan-calculator-mcp](https://github.com/theluckystrike/student-loan-repayment-assistance-plan-calculator-mcp) | calculate_rap_payment, compare_rap_vs_standard, get_federal_loan_limits, get_plan_transition_dates | `https://student-loan-repayment-assistance-plan-calculator-mcp.lipmichal.workers.dev/mcp` |
| [subdomain-finder-mcp](https://github.com/theluckystrike/subdomain-finder-mcp) | find_subdomains, resolve_subdomains, get_certificate_history, summarize_attack_surface | `https://subdomain-finder-mcp.lipmichal.workers.dev/mcp` |

The paid back-office collection (invoices, VAT, PDFs, spreadsheets) is at https://mcp.zovo.one
<!-- data-servers:end -->
