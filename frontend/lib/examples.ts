// Example questionnaires for the upload screen. Clicking one runs it live through the
// real backend via createRun (extract -> answer), so a reviewer gets genuine grounded
// answers without having to find a blank ISQ PDF first. The source text is a real set of
// ISQ-style questions per example; the backend extracts + answers them against Northstar's
// policies, exactly as it would a fresh upload.

import type { RunSource } from "@/lib/api";

export interface ExampleQuestionnaire {
  label: string;
  filename: string;
  origin: string;
  /** Display size in bytes, for the dropzone's selected-file panel. */
  size: number;
  source: RunSource;
}

export const EXAMPLES: ExampleQuestionnaire[] = [
  {
    label: "Sunflowers Charity (PDF)",
    filename: "Sunflowers_Charity_Supplier_ISQ_Questionnaire.pdf",
    origin: "Sunflowers Charity",
    size: 6.2 * 1024,
    source: {
      source_format: "pdf",
      source_text: `Supplier Information Security Questionnaire — Sunflowers Charity

1. Do you maintain a formal Information Security Policy?
2. Is multi-factor authentication enforced for staff access to business systems?
3. Do you encrypt customer data at rest and in transit?
4. How frequently are staff security-awareness training sessions conducted?
5. Do you have a documented incident response plan?
6. How are third-party suppliers and sub-processors assessed?
7. Where is customer data physically stored?
8. What is the process for revoking access when a staff member leaves?
9. Are penetration tests conducted on customer-facing systems, and how often?
10. Is there a documented data retention and disposal policy?`,
    },
  },
  {
    label: "Blackridge Wind Energy (PDF)",
    filename: "Blackridge_Wind_Energy_ISQ.pdf",
    origin: "Blackridge Wind Energy",
    size: 8.2 * 1024 * 1024,
    source: {
      source_format: "pdf",
      source_text: `Vendor Security Assessment — Blackridge Wind Energy (Operational Technology)

1. How is privileged access to operational technology (OT) controlled?
2. What are your Recovery Time Objective (RTO) and Recovery Point Objective (RPO) for critical SCADA-connected services?
3. Is your OT network segmented from your corporate IT network?
4. How is remote access to industrial control systems authenticated and monitored?
5. Do you maintain audit logs sufficient to support forensic investigation of OT incidents?
6. How are security patches applied to operational technology assets?
7. Do you have cyber insurance, and what is the coverage limit?`,
    },
  },
  {
    label: "Simple Salvage (XLSX)",
    filename: "Simple_Salvage_Vendor_Questionnaire.xlsx",
    origin: "Simple Salvage",
    size: 112 * 1024,
    source: {
      source_format: "pdf",
      source_text: `Vendor Questionnaire — Simple Salvage

1. Do staff sign a confidentiality agreement before accessing customer data?
2. Are background checks performed on staff with access to customer data?
3. How are vulnerabilities in software dependencies identified and remediated?
4. Do you maintain audit logs of access to customer data?
5. What is your process for notifying customers of a data breach?`,
    },
  },
];
