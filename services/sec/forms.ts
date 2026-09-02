const PRIORITY_FORMS = [
  "8-K",
  "8-K/A",
  "6-K",
  "10-Q",
  "10-K",
  "S-3",
  "S-3ASR",
  "424B5",
  "SC 13D",
  "SC 13D/A",
  "SC 13G",
  "SC 13G/A",
  "4",
] as const;

/** 8-K / earnings / offerings — skip Form 4 noise on the live poll. */
export const SEC_CATALYST_FORMS: readonly string[] = PRIORITY_FORMS.filter((f) => f !== "4" && !f.startsWith("SC 13G"));

export type PriorityForm = (typeof PRIORITY_FORMS)[number];

export const SEC_PRIORITY_FORMS: readonly string[] = PRIORITY_FORMS;

export function normalizeForm(form: string): string {
  return form.replace(/\s+/g, " ").trim().toUpperCase();
}

export function isPriorityForm(form: string): boolean {
  const n = normalizeForm(form);
  return SEC_PRIORITY_FORMS.includes(n) || n.startsWith("4/");
}

export const ITEM_HINTS: Record<string, string> = {
  "1.01": "Entry into a Material Definitive Agreement",
  "1.02": "Termination of a Material Definitive Agreement",
  "1.03": "Bankruptcy or Receivership",
  "2.01": "Completion of Acquisition or Disposition of Assets",
  "2.02": "Results of Operations and Financial Condition",
  "2.03": "Creation of a Direct Financial Obligation",
  "2.05": "Costs Associated with Exit or Disposal Activities",
  "2.06": "Material Impairments",
  "3.01": "Notice of Delisting or Failure to Satisfy a Continued Listing Rule",
  "3.02": "Unregistered Sales of Equity Securities",
  "5.01": "Changes in Control of Registrant",
  "5.02": "Departure of Directors or Certain Officers; Election of Directors; Appointment of Certain Officers",
  "7.01": "Regulation FD Disclosure",
  "8.01": "Other Events",
  "9.01": "Financial Statements and Exhibits",
};
