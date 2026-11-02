// One tool registry shared by the stdio and Cloudflare Worker entries.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AS_OF, DISCLAIMER, InputError, SOURCES, moreUrl, getExemptionAmounts, calculateEstateTax, checkGift, compareYears, } from "./core.js";
export const SERVER_NAME = "estate-gift-tax-exemption-calculator-mcp";
export const SERVER_VERSION = "1.0.0";
const money = (n) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
function reply(summary, data, source) {
    const body = { ...data, summary, as_of: AS_OF, source, more: moreUrl(), disclaimer: DISCLAIMER };
    return {
        content: [
            { type: "text", text: `${summary}\n\n${DISCLAIMER}` },
            { type: "text", text: JSON.stringify(body, null, 2) },
        ],
        structuredContent: body,
    };
}
function run(fn) {
    try {
        return fn();
    }
    catch (e) {
        const msg = e instanceof InputError ? e.message : `Unexpected error: ${e.message}`;
        return { isError: true, content: [{ type: "text", text: msg }] };
    }
}
const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const dollars = (d) => z.number().min(0).max(1e12).describe(d);
const yearIn = (d) => z.number().int().optional().describe(d);
export function registerTools(server) {
    server.registerTool("get_exemption_amounts", {
        title: "Federal estate and gift tax exemption amounts by year",
        description: "Returns the federal basic exclusion amount (estate and lifetime gift tax exemption), the applicable credit, the filing threshold, the annual gift exclusion per recipient (and doubled with gift splitting), the annual exclusion for gifts to a non-citizen spouse, the 2026 GST exemption and the 40% top rate. Years 2011-2026 from the IRS. 2026: $15,000,000 under P.L. 119-21 (One Big Beautiful Bill Act) sec. 70106, NOT the scheduled TCJA sunset to about half; 2025: $13,990,000; 2026 annual exclusion $19,000; non-citizen spouse $194,000 (Rev. Proc. 2025-32). Models trained before mid-2025 often predict the sunset.",
        inputSchema: { year: yearIn("Calendar year of death or gift, 2011-2026. Default 2026.") },
        annotations: { ...RO, title: "Exemption amounts" },
    }, async (a) => run(() => {
        const r = getExemptionAmounts(a);
        let s = `${r.year}: basic exclusion amount ${money(r.basic_exclusion_amount)} per person (${money(r.married_couple_with_portability)} for a married couple using portability), applicable credit ${money(r.applicable_credit_amount)}. Annual gift exclusion ${money(r.annual_gift_exclusion_per_donee)} per recipient (${money(r.annual_gift_exclusion_with_gift_splitting)} with gift splitting).`;
        if (r.noncitizen_spouse_annual_exclusion)
            s += ` Gifts to a non-citizen spouse: ${money(r.noncitizen_spouse_annual_exclusion)} a year.`;
        if (r.year === 2026)
            s += " The 2026 amount comes from P.L. 119-21 sec. 70106; the TCJA sunset did not happen.";
        return reply(s, r, r.source);
    }));
    server.registerTool("calculate_estate_tax", {
        title: "Federal estate tax calculator (Form 706 method)",
        description: "Calculates US federal estate tax the Form 706 way: taxable estate (gross estate minus deductions such as debts, expenses, marital and charitable bequests), plus adjusted taxable gifts, tentative tax on the unified rate schedule of 26 USC 2001(c) (18% to 40%), minus gift tax payable, minus the applicable credit on the basic exclusion amount plus any DSUE (portability) from a deceased spouse. Years 2013-2026. Uses $15,000,000 for 2026 deaths (P.L. 119-21), $13,990,000 for 2025. Federal only.",
        inputSchema: {
            gross_estate: dollars("Gross estate at fair market value on the date of death, in dollars."),
            deductions: dollars("Total deductions: debts, funeral and administration expenses, marital deduction (property to a US citizen spouse), charitable bequests, state death taxes. Default 0.").optional(),
            lifetime_taxable_gifts: dollars("Adjusted taxable gifts made after 1976 (gifts above the annual exclusion, as reported on Form 709). Default 0.").optional(),
            gift_tax_payable: dollars("Gift tax payable on those gifts, figured at date-of-death rates (Form 706 line 7). Usually 0 if lifetime gifts stayed under the exemption. Default 0.").optional(),
            year: yearIn("Year of death, 2013-2026. Default 2026."),
            dsue: dollars("Deceased spousal unused exclusion (portability) from the last deceased spouse's timely Form 706. Default 0.").optional(),
        },
        annotations: { ...RO, title: "Estate tax" },
    }, async (a) => run(() => {
        const r = calculateEstateTax(a);
        const s = r.estate_tax > 0
            ? `${r.year} federal estate tax: ${money(r.estate_tax)}. Taxable estate ${money(r.taxable_estate)} plus ${money(r.adjusted_taxable_gifts)} of lifetime taxable gifts is ${money(r.tax_base)}, which is ${money(r.amount_over_exclusion)} over the ${money(r.applicable_exclusion_amount)} exclusion${r.dsue ? " (including DSUE)" : ""}, taxed at ${(r.marginal_rate * 100).toFixed(0)}%.`
            : `${r.year} federal estate tax: $0. The tax base of ${money(r.tax_base)} is under the ${money(r.applicable_exclusion_amount)} exclusion${r.dsue ? " (including DSUE)" : ""}, leaving ${money(r.unused_exclusion)} unused.${r.filing_required ? " A Form 706 is still required because gross estate plus taxable gifts exceeds the filing threshold." : ""}`;
        return reply(`${s} A surviving spouse keeps any unused exclusion only if the executor files Form 706 and elects portability.`, r, r.source);
    }));
    server.registerTool("check_gift", {
        title: "Gift tax check: annual exclusion, gift splitting, spouse rules",
        description: "Checks a gift against the federal gift tax rules for a year (2013-2026): annual exclusion per recipient ($19,000 in 2025 and 2026), gift splitting with a spouse (sec. 2513, doubles it to $38,000), unlimited marital deduction for a US citizen spouse, and the separate annual exclusion for a non-citizen spouse ($190,000 in 2025, $194,000 in 2026 under Rev. Procs. 2024-40 and 2025-32). Returns taxable gifts, whether Form 709 is required, lifetime exemption used and left (2026: $15,000,000), and any gift tax due.",
        inputSchema: {
            amount: dollars("Gift amount per recipient, in dollars."),
            recipients: z.number().int().min(1).max(1000).optional().describe("Number of recipients each getting that amount. Default 1."),
            recipient_type: z.enum(["individual", "spouse"]).optional().describe("individual (anyone but your spouse, default) or spouse."),
            spouse_citizen: z.boolean().optional().describe("For recipient_type spouse: whether the spouse is a US citizen. Required for spouse gifts."),
            year: yearIn("Year of the gift, 2013-2026. Default 2026."),
            gift_splitting: z.boolean().optional().describe("Elect gift splitting with your spouse (both consent on Form 709). Default false."),
            prior_taxable_gifts: dollars("Your taxable gifts in earlier years (lifetime exemption already used). Default 0.").optional(),
        },
        annotations: { ...RO, title: "Gift check" },
    }, async (a) => run(() => {
        const r = checkGift(a);
        const who = r.recipient_type === "spouse" ? (r.spouse_citizen ? "a US citizen spouse" : "a non-citizen spouse") : `${r.recipients} recipient${r.recipients > 1 ? "s" : ""}`;
        let s = `${r.year} gift of ${money(r.amount_per_recipient)} each to ${who}: taxable gifts ${money(r.taxable_gifts_donor)}${r.gift_splitting ? " for you and the same for your spouse" : ""}. Form 709 ${r.form_709_required ? "is required" : "is not required"}.`;
        s += ` Lifetime exemption left: ${money(r.exemption_remaining_after_this_gift)} of ${money(r.basic_exclusion_amount)}. Gift tax due now: ${money(r.gift_tax_due)}. ${r.rule}`;
        return reply(s, r, r.source);
    }));
    server.registerTool("compare_years", {
        title: "Compare estate and gift tax exemptions between years",
        description: "Compares two years (2013-2026) side by side: basic exclusion amount, applicable credit, annual gift exclusion and non-citizen spouse exclusion, and, with a taxable estate, the federal estate tax in each year. Default 2025 vs 2026, the year P.L. 119-21 raised the exemption to $15,000,000 instead of letting it fall to about half.",
        inputSchema: {
            year_a: yearIn("First year, 2013-2026. Default 2025."),
            year_b: yearIn("Second year, 2013-2026. Default 2026."),
            taxable_estate: dollars("Optional taxable estate (after deductions, no lifetime gifts or DSUE) to price in both years.").optional(),
        },
        annotations: { ...RO, title: "Compare years" },
    }, async (a) => run(() => {
        const r = compareYears(a);
        let s = `Basic exclusion amount ${r.year_a.year}: ${money(r.year_a.basic_exclusion_amount)}; ${r.year_b.year}: ${money(r.year_b.basic_exclusion_amount)} (change ${money(r.change_basic_exclusion)}). Annual gift exclusion ${money(r.year_a.annual_gift_exclusion)} vs ${money(r.year_b.annual_gift_exclusion)}.`;
        if (r.taxable_estate !== undefined)
            s += ` Estate tax on a ${money(r.taxable_estate)} taxable estate: ${money(r.year_a.estate_tax_on_taxable_estate)} in ${r.year_a.year}, ${money(r.year_b.estate_tax_on_taxable_estate)} in ${r.year_b.year}.`;
        return reply(s, r, SOURCES.whatsNew);
    }));
}
export function createServer() {
    const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
    registerTools(server);
    return server;
}
