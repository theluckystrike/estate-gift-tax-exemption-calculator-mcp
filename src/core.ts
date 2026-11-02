// Pure core: US federal estate and gift tax (IRC chapters 11 and 12). No I/O.
// P.L. 119-21 (One Big Beautiful Bill Act, called the Working Families Tax Cuts Act by the IRS) sec. 70106
// set the basic exclusion amount to $15,000,000 for 2026, indexed after 2026, and struck the TCJA sunset
// (old sec. 2010(c)(3)(C)). Without it the base would have dropped back to $5,000,000 (indexed).
// Every number was copied from a primary source fetched on 2026-11-02; see DATA_SOURCES.md.

export const AS_OF = "2026-11-02";
export const REPO = "estate-gift-tax-exemption-calculator-mcp";
export const DISCLAIMER =
  "Federal estate and gift tax only. State estate and inheritance taxes are not included. General information, not legal or tax advice; Forms 706 and 709 and their instructions decide the official amounts.";

export const SOURCES = {
  whatsNew: "https://www.irs.gov/businesses/small-businesses-self-employed/whats-new-estate-and-gift-tax",
  estateTax: "https://www.irs.gov/businesses/small-businesses-self-employed/estate-tax",
  giftFaq: "https://www.irs.gov/businesses/small-businesses-self-employed/frequently-asked-questions-on-gift-taxes",
  revProc202532: "https://www.irs.gov/pub/irs-drop/rp-25-32.pdf",
  revProc202440: "https://www.irs.gov/pub/irs-drop/rp-24-40.pdf",
  sec2001: "https://www.law.cornell.edu/uscode/text/26/2001",
  sec2010: "https://www.law.cornell.edu/uscode/text/26/2010",
  sec2513: "https://www.law.cornell.edu/uscode/text/26/2513",
  sec2523: "https://www.law.cornell.edu/uscode/text/26/2523",
  obbba: "https://www.congress.gov/119/bills/hr1/BILLS-119hr1enr.htm",
} as const;

const MORE = "https://taxbreakcalc.com/charitable-deduction-calculator/";
export function moreUrl(): string {
  return `${MORE}?utm_source=mcp&utm_medium=${REPO}`;
}

export class InputError extends Error {}

export const LAW_NOTE =
  "P.L. 119-21 sec. 70106 (signed July 4, 2025) amended IRC sec. 2010(c)(3): the basic exclusion amount is $15,000,000 for decedents dying and gifts made in 2026, indexed for inflation after 2026 (rounded to the nearest $10,000), with no sunset. Before that law the TCJA doubling ($10,000,000 base) ended after 2025 and the base would have reverted to $5,000,000 indexed, about half. The top rate stays 40% (sec. 2001(c)).";

// IRS "What's new - Estate and gift tax": basic exclusion amount for year of death, and annual exclusion per donee.
export const BASIC_EXCLUSION: Record<number, number> = {
  2011: 5000000, 2012: 5120000, 2013: 5250000, 2014: 5340000, 2015: 5430000, 2016: 5450000, 2017: 5490000,
  2018: 11180000, 2019: 11400000, 2020: 11580000, 2021: 11700000, 2022: 12060000, 2023: 12920000,
  2024: 13610000, 2025: 13990000, 2026: 15000000,
};
export const ANNUAL_EXCLUSION: Record<number, number> = {
  2011: 13000, 2012: 13000, 2013: 14000, 2014: 14000, 2015: 14000, 2016: 14000, 2017: 14000,
  2018: 15000, 2019: 15000, 2020: 15000, 2021: 15000, 2022: 16000, 2023: 17000, 2024: 18000,
  2025: 19000, 2026: 19000,
};
// Rev. Proc. 2024-40 sec. 3.43(2) and Rev. Proc. 2025-32 sec. 4.42(2): gifts to a spouse who is not a US citizen.
export const NONCITIZEN_SPOUSE_EXCLUSION: Record<number, number> = { 2025: 190000, 2026: 194000 };
const NONCITIZEN_SOURCE: Record<number, string> = { 2025: SOURCES.revProc202440, 2026: SOURCES.revProc202532 };
// Rev. Proc. 2025-32 sec. 2.14: GST exemption for 2026.
export const GST_EXEMPTION: Record<number, number> = { 2026: 15000000 };

export const FIRST_YEAR = 2011;
export const LAST_YEAR = 2026;
// The sec. 2001(c) schedule below has been in force since Pub. L. 112-240 (Jan. 2, 2013).
export const FIRST_CALC_YEAR = 2013;

// 26 USC 2001(c): [over, base tax, rate]
export const RATE_SCHEDULE: Array<[number, number, number]> = [
  [0, 0, 0.18], [10000, 1800, 0.20], [20000, 3800, 0.22], [40000, 8200, 0.24], [60000, 13000, 0.26],
  [80000, 18200, 0.28], [100000, 23800, 0.30], [150000, 38800, 0.32], [250000, 70800, 0.34],
  [500000, 155800, 0.37], [750000, 248300, 0.39], [1000000, 345800, 0.40],
];
export const TOP_RATE = 0.40;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function tentativeTax(amount: number): number {
  if (!(amount > 0)) return 0;
  let row = RATE_SCHEDULE[0];
  for (const r of RATE_SCHEDULE) if (amount > r[0]) row = r;
  return round2(row[1] + row[2] * (amount - row[0]));
}

function bracketRate(amount: number): number {
  let rate = RATE_SCHEDULE[0][2];
  for (const r of RATE_SCHEDULE) if (amount > r[0]) rate = r[2];
  return rate;
}

function checkYear(year: number, first = FIRST_YEAR): number {
  if (!Number.isInteger(year)) throw new InputError("year must be a whole calendar year, for example 2026.");
  if (year > LAST_YEAR) {
    throw new InputError(
      `${year} amounts are not confirmed. The statute (sec. 2010(c)(3)(B)) indexes the $15,000,000 basic exclusion amount for inflation after 2026, rounded to the nearest $10,000, but no IRS revenue procedure with ${year} amounts was found in sources fetched on ${AS_OF}. Supported years: ${first}-${LAST_YEAR}.`,
    );
  }
  if (year < first) throw new InputError(`Year ${year} is not supported. Supported years: ${first}-${LAST_YEAR}.`);
  return year;
}

function nonNeg(name: string, v: number | undefined, def = 0): number {
  const n = v ?? def;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) throw new InputError(`${name} must be a number of dollars, 0 or more.`);
  return n;
}

export function getExemptionAmounts(a: { year?: number }) {
  const year = checkYear(a.year ?? 2026);
  const bea = BASIC_EXCLUSION[year];
  const ae = ANNUAL_EXCLUSION[year];
  return {
    year,
    basic_exclusion_amount: bea,
    married_couple_with_portability: bea * 2,
    applicable_credit_amount: tentativeTax(bea),
    estate_tax_filing_threshold: bea,
    annual_gift_exclusion_per_donee: ae,
    annual_gift_exclusion_with_gift_splitting: ae * 2,
    noncitizen_spouse_annual_exclusion: NONCITIZEN_SPOUSE_EXCLUSION[year] ?? null,
    gst_exemption: GST_EXEMPTION[year] ?? null,
    top_rate: year >= FIRST_CALC_YEAR ? TOP_RATE : null,
    citizen_spouse: "Unlimited marital deduction for transfers to a US citizen spouse (sec. 2523(a), sec. 2056).",
    notes: [
      LAW_NOTE,
      NONCITIZEN_SPOUSE_EXCLUSION[year] === undefined ? `Non-citizen spouse exclusion for ${year} not loaded; only 2025 ($190,000) and 2026 ($194,000) were confirmed from Rev. Procs. 2024-40 and 2025-32.` : null,
      GST_EXEMPTION[year] === undefined ? `GST exemption for ${year} not loaded; Rev. Proc. 2025-32 confirms $15,000,000 for 2026.` : null,
    ].filter(Boolean),
    source: SOURCES.whatsNew,
  };
}

export interface EstateInput {
  gross_estate: number; deductions?: number; lifetime_taxable_gifts?: number; gift_tax_payable?: number; year?: number; dsue?: number;
}

export function calculateEstateTax(a: EstateInput) {
  const year = checkYear(a.year ?? 2026, FIRST_CALC_YEAR);
  const gross = nonNeg("gross_estate", a.gross_estate);
  const deductions = nonNeg("deductions", a.deductions);
  const gifts = nonNeg("lifetime_taxable_gifts", a.lifetime_taxable_gifts);
  const giftTaxPayable = nonNeg("gift_tax_payable", a.gift_tax_payable);
  const dsue = nonNeg("dsue", a.dsue);
  const bea = BASIC_EXCLUSION[year];
  if (dsue > bea) {
    throw new InputError(`dsue ${dsue} is more than the ${year} basic exclusion amount (${bea}). Sec. 2010(c)(4) caps DSUE at the basic exclusion amount; use the DSUE figure from the deceased spouse's Form 706 portability election.`);
  }
  if (deductions > gross) throw new InputError("deductions cannot be more than gross_estate.");
  const taxableEstate = round2(gross - deductions);
  const taxBase = round2(taxableEstate + gifts);
  const tentative = tentativeTax(taxBase);
  const applicableExclusion = bea + dsue;
  const credit = tentativeTax(applicableExclusion);
  const afterGifts = Math.max(0, round2(tentative - giftTaxPayable));
  const tax = Math.max(0, round2(afterGifts - credit));
  return {
    year,
    gross_estate: gross,
    deductions,
    taxable_estate: taxableEstate,
    adjusted_taxable_gifts: gifts,
    tax_base: taxBase,
    tentative_tax: tentative,
    gift_tax_payable: giftTaxPayable,
    basic_exclusion_amount: bea,
    dsue,
    applicable_exclusion_amount: applicableExclusion,
    applicable_credit_amount: credit,
    estate_tax: tax,
    amount_over_exclusion: Math.max(0, round2(taxBase - applicableExclusion)),
    unused_exclusion: Math.max(0, round2(applicableExclusion - taxBase)),
    marginal_rate: tax > 0 ? bracketRate(taxBase) : 0,
    effective_rate_on_gross_estate: gross > 0 ? Math.round((tax / gross) * 10000) / 10000 : 0,
    filing_required: round2(gross + gifts) > bea,
    portability_note:
      "If there is a surviving spouse, the unused exclusion (DSUE) passes to them only if the executor files a timely Form 706 and elects portability, even when no return is otherwise required (sec. 2010(c)(5)(A)).",
    method:
      "Form 706 Part 2 order: taxable estate = gross estate - deductions; add adjusted taxable gifts (post-1976); tentative tax under sec. 2001(c); subtract gift tax payable on those gifts (at date-of-death rates, sec. 2001(b)(2)); subtract the applicable credit (tentative tax on basic exclusion + DSUE). Other credits (foreign death taxes, prior transfers) are not applied.",
    source: SOURCES.sec2001,
  };
}

export interface GiftInput {
  amount: number; recipients?: number; recipient_type?: "individual" | "spouse"; spouse_citizen?: boolean;
  year?: number; gift_splitting?: boolean; prior_taxable_gifts?: number;
}

export function checkGift(a: GiftInput) {
  const year = checkYear(a.year ?? 2026, FIRST_CALC_YEAR);
  const amount = nonNeg("amount", a.amount);
  const recipients = a.recipients ?? 1;
  if (!Number.isInteger(recipients) || recipients < 1 || recipients > 1000) throw new InputError("recipients must be a whole number from 1 to 1000.");
  const type = a.recipient_type ?? "individual";
  const prior = nonNeg("prior_taxable_gifts", a.prior_taxable_gifts);
  const bea = BASIC_EXCLUSION[year];
  const ae = ANNUAL_EXCLUSION[year];
  const notes: string[] = ["Only gifts of present interests qualify for the annual exclusion. Tuition or medical expenses paid directly to the school or provider are excluded separately (IRS gift tax FAQ)."];
  let exclusionPerRecipient: number;
  let donorTaxable: number;
  let spouseTaxable = 0;
  let formRequired: boolean;
  let rule: string;
  let source: string = SOURCES.giftFaq;

  if (type === "spouse") {
    if (recipients !== 1) throw new InputError("recipient_type spouse means one recipient; set recipients to 1.");
    if (a.gift_splitting) throw new InputError("Gift splitting (sec. 2513) applies to gifts to people other than your spouse.");
    if (a.spouse_citizen === undefined) throw new InputError("For a gift to a spouse, set spouse_citizen (true or false): the rules differ.");
    if (a.spouse_citizen) {
      exclusionPerRecipient = amount;
      donorTaxable = 0;
      formRequired = false;
      rule = "Gifts to a spouse who is a US citizen qualify for the unlimited marital deduction (sec. 2523(a)). Some terminable interests do not.";
      source = SOURCES.sec2523;
    } else {
      const nc = NONCITIZEN_SPOUSE_EXCLUSION[year];
      if (nc === undefined) throw new InputError(`The ${year} annual exclusion for gifts to a non-citizen spouse is not loaded. Confirmed years: 2025 ($190,000) and 2026 ($194,000).`);
      exclusionPerRecipient = nc;
      donorTaxable = Math.max(0, round2(amount - nc));
      formRequired = donorTaxable > 0;
      rule = `No unlimited marital deduction for a spouse who is not a US citizen (sec. 2523(i)). The ${year} annual exclusion for such gifts is $${nc.toLocaleString("en-US")} (${year === 2026 ? "Rev. Proc. 2025-32 sec. 4.42(2)" : "Rev. Proc. 2024-40 sec. 3.43(2)"}).`;
      source = NONCITIZEN_SOURCE[year];
    }
  } else {
    if (a.gift_splitting) {
      exclusionPerRecipient = ae * 2;
      const half = amount / 2;
      donorTaxable = round2(Math.max(0, half - ae) * recipients);
      spouseTaxable = donorTaxable;
      formRequired = true;
      rule = `Gift splitting (sec. 2513): each gift is treated as made half by each spouse, so $${(ae * 2).toLocaleString("en-US")} per recipient is excluded in ${year}. Both spouses must consent and must be US citizens or residents; a Form 709 is required to elect it.`;
      source = SOURCES.sec2513;
    } else {
      exclusionPerRecipient = ae;
      donorTaxable = round2(Math.max(0, amount - ae) * recipients);
      formRequired = donorTaxable > 0;
      rule = `The ${year} annual exclusion is $${ae.toLocaleString("en-US")} per recipient (IRS).`;
    }
  }

  // Gift tax under sec. 2502/2505 with an unchanged rate schedule: tax on cumulative gifts above the basic exclusion,
  // minus the same on prior gifts. Assumes no DSUE and no gift tax paid in earlier years.
  const cumulative = round2(prior + donorTaxable);
  const giftTaxDue = Math.max(0, round2(Math.max(0, tentativeTax(cumulative) - tentativeTax(bea)) - Math.max(0, tentativeTax(prior) - tentativeTax(bea))));
  if (a.gift_splitting) notes.push("Figures for the donor are for the donor's half. The consenting spouse reports the other half on their own Form 709 against their own exemption.");
  return {
    year,
    amount_per_recipient: amount,
    recipients,
    recipient_type: type,
    spouse_citizen: type === "spouse" ? a.spouse_citizen : undefined,
    gift_splitting: !!a.gift_splitting,
    exclusion_per_recipient: exclusionPerRecipient,
    total_gifts: round2(amount * recipients),
    taxable_gifts_donor: donorTaxable,
    taxable_gifts_spouse: spouseTaxable,
    form_709_required: formRequired,
    prior_taxable_gifts: prior,
    basic_exclusion_amount: bea,
    exemption_used_after_this_gift: Math.min(cumulative, bea),
    exemption_remaining_after_this_gift: Math.max(0, round2(bea - cumulative)),
    gift_tax_due: giftTaxDue,
    rule,
    notes,
    source,
  };
}

export function compareYears(a: { year_a?: number; year_b?: number; taxable_estate?: number }) {
  const ya = checkYear(a.year_a ?? 2025, FIRST_CALC_YEAR);
  const yb = checkYear(a.year_b ?? 2026, FIRST_CALC_YEAR);
  const one = (y: number) => {
    const r: Record<string, unknown> = {
      year: y,
      basic_exclusion_amount: BASIC_EXCLUSION[y],
      applicable_credit_amount: tentativeTax(BASIC_EXCLUSION[y]),
      annual_gift_exclusion: ANNUAL_EXCLUSION[y],
      noncitizen_spouse_annual_exclusion: NONCITIZEN_SPOUSE_EXCLUSION[y] ?? null,
    };
    if (a.taxable_estate !== undefined) {
      r.estate_tax_on_taxable_estate = calculateEstateTax({ gross_estate: nonNeg("taxable_estate", a.taxable_estate), year: y }).estate_tax;
    }
    return r;
  };
  const A = one(ya);
  const B = one(yb);
  const out: Record<string, unknown> = {
    year_a: A,
    year_b: B,
    change_basic_exclusion: BASIC_EXCLUSION[yb] - BASIC_EXCLUSION[ya],
    change_annual_exclusion: ANNUAL_EXCLUSION[yb] - ANNUAL_EXCLUSION[ya],
    law_note: LAW_NOTE,
    source: SOURCES.whatsNew,
  };
  if (a.taxable_estate !== undefined) {
    out.taxable_estate = a.taxable_estate;
    out.change_estate_tax = round2((B.estate_tax_on_taxable_estate as number) - (A.estate_tax_on_taxable_estate as number));
  }
  return out;
}
