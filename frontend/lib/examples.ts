// Example questionnaires for the upload screen. Clicking one runs it live through the
// real backend via createRun (extract -> answer), so a reviewer gets genuine grounded
// answers without having to find a blank ISQ first.
//
// These three are OUR OWN fictional companies with realistic, full-length (20-question)
// supplier security questionnaires, deliberately NOT the assessment's source files, which
// stay private. Each set is written to map onto Northstar Labs' policy topics (infosec
// policy, MFA/access control, encryption, incident response, BCDR/RTO-RPO, secure SDLC,
// audit logs, BYOD/remote, certifications) so the answers ground well; the certification
// question at the end is the kind that honestly gets flagged for review.

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
    label: "Northwind Pay (Fintech)",
    filename: "Northwind_Pay_Supplier_Security_Questionnaire.pdf",
    origin: "Northwind Pay",
    size: 24 * 1024,
    source: {
      source_format: "pdf",
      source_text: `Supplier Information Security Questionnaire: Northwind Pay

1. Do you maintain a formal, board-approved Information Security Policy, and how often is it reviewed?
2. Is multi-factor authentication enforced for all staff access to systems that process or store customer or payment data?
3. How is customer and payment data encrypted in transit and at rest?
4. Describe your access control model and how the principle of least privilege is applied.
5. How is privileged and administrative access granted, reviewed, and revoked?
6. What is your process for provisioning and deprovisioning access when staff join or leave?
7. Do you conduct regular vulnerability scanning of internet-facing systems and applications?
8. Are penetration tests performed against customer-facing services, and how frequently?
9. How are security patches and updates assessed and applied across your estate?
10. Do you operate a secure software development lifecycle, and are security reviews part of it?
11. Are peer code reviews required before changes are deployed to production?
12. How are third-party libraries and software dependencies monitored for known vulnerabilities?
13. Do you maintain a documented incident response process, and what are your escalation timelines?
14. How quickly would you notify clients in the event of a confirmed data breach affecting their data?
15. Do you maintain audit logs of access to sensitive systems and customer data, and how long are they retained?
16. What are your backup arrangements and your Recovery Time and Recovery Point Objectives for critical services?
17. Where is customer data hosted geographically, and is it kept within agreed jurisdictions?
18. Do all employees complete security awareness and phishing training, and how often?
19. What controls govern remote working and the use of personal devices (BYOD) to access company systems?
20. Please list any security certifications or compliance frameworks your organisation holds or aligns to (e.g. ISO 27001, SOC 2, PCI DSS).`,
    },
  },
  {
    label: "Caldera Health (SaaS)",
    filename: "Caldera_Health_Vendor_ISQ.pdf",
    origin: "Caldera Health",
    size: 22 * 1024,
    source: {
      source_format: "pdf",
      source_text: `Vendor Security Assessment: Caldera Health

1. Do you maintain a formal Information Security Policy approved by senior management, and how often is it reviewed?
2. How is patient and customer personal data protected through encryption, both in transit and at rest?
3. Is multi-factor authentication required for all staff accessing systems that hold personal or health data?
4. Describe how access to sensitive data is restricted on a least-privilege, role-based basis.
5. How frequently are user access rights reviewed and recertified?
6. What is your joiner, mover, and leaver process for granting and revoking system access?
7. How is privileged administrative access controlled and monitored?
8. Do you maintain audit logs of access to personal data, and what is the retention period?
9. What is your documented process for detecting, responding to, and escalating security incidents?
10. In the event of a personal data breach, what is your client and regulator notification timeline?
11. Do you have a documented data retention and secure disposal policy for customer data?
12. Describe your backup strategy and your Recovery Time and Recovery Point Objectives.
13. How is business continuity maintained in the event of a major outage or disaster?
14. Where is customer data stored, and do you guarantee it remains within specified regions?
15. Do you perform regular vulnerability assessments of your systems and applications?
16. Are independent penetration tests conducted, and are summary results available to clients?
17. Do you operate a secure development lifecycle with security testing built into releases?
18. How are software dependencies and open-source components assessed for vulnerabilities?
19. Do all staff receive regular security and data-protection awareness training?
20. Which security or privacy certifications does your organisation hold (e.g. ISO 27001, SOC 2, Cyber Essentials)?`,
    },
  },
  {
    label: "Tidewell Logistics (OT)",
    filename: "Tidewell_Logistics_Security_Assessment.pdf",
    origin: "Tidewell Logistics",
    size: 26 * 1024,
    source: {
      source_format: "pdf",
      source_text: `Operational Technology Supplier Security Questionnaire: Tidewell Logistics

1. Do you maintain a formal Information Security Policy, and is it reviewed at least annually?
2. Is your operational technology (OT) and warehouse-automation network segmented from your corporate IT network?
3. How is remote access to control systems and critical infrastructure authenticated and monitored?
4. Is multi-factor authentication enforced for staff and third parties accessing your systems?
5. How is privileged access to operational and administrative systems controlled?
6. Describe how access is provisioned and promptly revoked when staff or contractors leave.
7. How is customer and shipment data encrypted in transit and at rest?
8. Do you maintain audit logs for access to critical systems, and how long are they retained?
9. What is your incident response process, and how are critical incidents escalated and contained?
10. How quickly would affected customers be notified of a security incident impacting their data?
11. What controls govern Bring Your Own Device (BYOD) and the use of personal devices on company systems?
12. Do you perform regular vulnerability scanning across IT and OT assets?
13. How are security patches evaluated and applied to operational technology systems?
14. Do you assess the security of your own suppliers and sub-processors?
15. Describe your backup arrangements and your Recovery Time and Recovery Point Objectives for critical services.
16. How is business continuity maintained for warehouse and logistics operations during a disruption?
17. Do you operate a secure software development lifecycle for any software you build or maintain?
18. Are code changes peer-reviewed before being deployed to production?
19. Do employees receive regular cyber security and operational-security awareness training?
20. Please describe any compliance standards, certifications, or industry frameworks your organisation follows (e.g. ISO 27001, IEC 62443, SOC 2).`,
    },
  },
];
