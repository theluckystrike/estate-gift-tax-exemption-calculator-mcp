// Fixtures: expected values hand-checked against 26 USC 2001(c) (Cornell LII), 26 USC 2010(c),
// the IRS "What's new - Estate and gift tax" tables, the IRS gift tax FAQ, Rev. Proc. 2024-40 sec. 3.41/3.43
// and Rev. Proc. 2025-32 sec. 2.14/4.42. All fetched 2026-11-02.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tentativeTax as tt, getExemptionAmounts as ex, calculateEstateTax as estate, checkGift as gift,
  compareYears as cmp, InputError,
} from "../dist/core.js";

test("F1 2001(c) bracket boundaries are continuous: 10k 1,800; 20k 3,800; 500k 155,800; 750k 248,300; 1M 345,800", () => {
  assert.equal(tt(10000), 1800);
  assert.equal(tt(20000), 3800);
  assert.equal(tt(40000), 8200);
  assert.equal(tt(500000), 155800);
  assert.equal(tt(750000), 248300);
  assert.equal(tt(1000000), 345800);
  assert.equal(tt(5000), 900);
});

test("F2 applicable credit 2026: tentative tax on $15,000,000 = 345,800 + 40% x 14,000,000 = $5,945,800", () => {
  assert.equal(tt(15000000), 5945800);
  assert.equal(ex({ year: 2026 }).applicable_credit_amount, 5945800);
});

test("F3 applicable credit 2025: tentative tax on $13,990,000 = $5,541,800", () => {
  assert.equal(ex({ year: 2025 }).applicable_credit_amount, 5541800);
});

test("F4 2026 amounts: BEA $15,000,000, annual $19,000 ($38,000 split), non-citizen spouse $194,000, GST $15,000,000", () => {
  const r = ex({ year: 2026 });
  assert.equal(r.basic_exclusion_amount, 15000000);
  assert.equal(r.annual_gift_exclusion_per_donee, 19000);
  assert.equal(r.annual_gift_exclusion_with_gift_splitting, 38000);
  assert.equal(r.noncitizen_spouse_annual_exclusion, 194000);
  assert.equal(r.gst_exemption, 15000000);
  assert.equal(r.top_rate, 0.4);
});

test("F5 2025 amounts: BEA $13,990,000, annual $19,000, non-citizen spouse $190,000; 2024 BEA $13,610,000 annual $18,000", () => {
  const r = ex({ year: 2025 });
  assert.equal(r.basic_exclusion_amount, 13990000);
  assert.equal(r.noncitizen_spouse_annual_exclusion, 190000);
  const p = ex({ year: 2024 });
  assert.equal(p.basic_exclusion_amount, 13610000);
  assert.equal(p.annual_gift_exclusion_per_donee, 18000);
  assert.equal(p.noncitizen_spouse_annual_exclusion, null);
  assert.equal(ex({ year: 2018 }).basic_exclusion_amount, 11180000);
});

test("F6 2027 is not confirmed and 2010 is out of range: both refuse", () => {
  assert.throws(() => ex({ year: 2027 }), InputError);
  assert.throws(() => ex({ year: 2010 }), InputError);
  assert.throws(() => estate({ gross_estate: 1e6, year: 2012 }), InputError);
});

test("F7 2026 death, $20,000,000 estate: 40% x 5,000,000 = $2,000,000", () => {
  const r = estate({ gross_estate: 20000000, year: 2026 });
  assert.equal(r.tentative_tax, 7945800);
  assert.equal(r.estate_tax, 2000000);
  assert.equal(r.marginal_rate, 0.4);
  assert.equal(r.filing_required, true);
});

test("F8 2025 death, same $20,000,000 estate: 40% x 6,010,000 = $2,404,000", () => {
  assert.equal(estate({ gross_estate: 20000000, year: 2025 }).estate_tax, 2404000);
});

test("F9 2026: gross 25M, deductions 3M, lifetime gifts 2M, DSUE 5M -> base 24M, exclusion 20M, tax $1,600,000", () => {
  const r = estate({ gross_estate: 25000000, deductions: 3000000, lifetime_taxable_gifts: 2000000, dsue: 5000000, year: 2026 });
  assert.equal(r.tax_base, 24000000);
  assert.equal(r.applicable_exclusion_amount, 20000000);
  assert.equal(r.estate_tax, 1600000);
});

test("F10 2026: $14,000,000 estate owes $0, $1,000,000 unused, no filing requirement; gift_tax_payable reduces tax", () => {
  const r = estate({ gross_estate: 14000000, year: 2026 });
  assert.equal(r.estate_tax, 0);
  assert.equal(r.unused_exclusion, 1000000);
  assert.equal(r.filing_required, false);
  assert.equal(estate({ gross_estate: 20000000, gift_tax_payable: 100000, year: 2026 }).estate_tax, 1900000);
});

test("F11 DSUE above the basic exclusion amount, and deductions above gross estate, are refused", () => {
  assert.throws(() => estate({ gross_estate: 30000000, dsue: 15000001, year: 2026 }), InputError);
  assert.throws(() => estate({ gross_estate: 100, deductions: 200 }), InputError);
});

test("F12 2026 gift $50,000 to each of 3 children: taxable 3 x 31,000 = $93,000, Form 709, no tax, $14,907,000 left", () => {
  const r = gift({ amount: 50000, recipients: 3, year: 2026 });
  assert.equal(r.taxable_gifts_donor, 93000);
  assert.equal(r.form_709_required, true);
  assert.equal(r.gift_tax_due, 0);
  assert.equal(r.exemption_remaining_after_this_gift, 14907000);
});

test("F13 gift splitting: $38,000 fully excluded but Form 709 needed; $50,000 -> $6,000 taxable each spouse", () => {
  const a = gift({ amount: 38000, gift_splitting: true, year: 2026 });
  assert.equal(a.taxable_gifts_donor, 0);
  assert.equal(a.form_709_required, true);
  const b = gift({ amount: 50000, gift_splitting: true, year: 2026 });
  assert.equal(b.taxable_gifts_donor, 6000);
  assert.equal(b.taxable_gifts_spouse, 6000);
  const c = gift({ amount: 19000, year: 2026 });
  assert.equal(c.form_709_required, false);
});

test("F14 non-citizen spouse $250,000: 2026 taxable $56,000 (194k), 2025 taxable $60,000 (190k); citizen spouse $0", () => {
  assert.equal(gift({ amount: 250000, recipient_type: "spouse", spouse_citizen: false, year: 2026 }).taxable_gifts_donor, 56000);
  assert.equal(gift({ amount: 250000, recipient_type: "spouse", spouse_citizen: false, year: 2025 }).taxable_gifts_donor, 60000);
  const c = gift({ amount: 5000000, recipient_type: "spouse", spouse_citizen: true, year: 2026 });
  assert.equal(c.taxable_gifts_donor, 0);
  assert.equal(c.form_709_required, false);
  assert.throws(() => gift({ amount: 250000, recipient_type: "spouse", spouse_citizen: false, year: 2024 }), InputError);
  assert.throws(() => gift({ amount: 1, recipient_type: "spouse" }), InputError);
});

test("F15 gift tax due: prior taxable gifts $14,990,000, 2026 gift $1,019,000 -> taxable $1,000,000, 40% x 990,000 = $396,000", () => {
  const r = gift({ amount: 1019000, prior_taxable_gifts: 14990000, year: 2026 });
  assert.equal(r.taxable_gifts_donor, 1000000);
  assert.equal(r.gift_tax_due, 396000);
  assert.equal(r.exemption_remaining_after_this_gift, 0);
});

test("F16 compare 2025 vs 2026 on a $20,000,000 taxable estate: BEA +$1,010,000, tax $2,404,000 -> $2,000,000", () => {
  const r = cmp({ taxable_estate: 20000000 });
  assert.equal(r.change_basic_exclusion, 1010000);
  assert.equal(r.change_annual_exclusion, 0);
  assert.equal(r.year_a.estate_tax_on_taxable_estate, 2404000);
  assert.equal(r.year_b.estate_tax_on_taxable_estate, 2000000);
  assert.equal(r.change_estate_tax, -404000);
});
