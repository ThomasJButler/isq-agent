// A labelled mock of the BACKEND canonical envelope (POST /process-questionnaire)
// for the Sunflowers Charity run. The Results screen feeds this through
// toRunViewModel() so it exercises the real Slice 3 adapter, not a hand-shaped
// view model. The §8 glue replaces this import with a live fetch keyed by run_id;
// the screen's binding stays identical.
//
// Content is faithful to the design source (design/.../prototype-hybrid/data.js),
// reshaped into the canonical fields: questionnaire_meta / summary_metrics, the
// nested confidence.dimensions, and citations as { source_id, text_snippet }. The
// snippets are short representative excerpts — the backend supplies the real
// retrieved chunk text. Two questions (Q06 OT, Q11 SCADA) are flagged for review;
// none failed, so this is the normal "answered with a couple flagged" path (the
// failed / all_failed states are Slice 18).

import type { CanonicalEnvelope } from "@/lib/types";

export const MOCK_ENVELOPE: CanonicalEnvelope = {
  questionnaire_meta: {
    origin: "Sunflowers Charity",
    filename: "Sunflowers_Charity_Supplier_ISQ_Questionnaire.pdf",
    received_at: "2026-05-25T19:30:00Z",
    completed_at: "2026-05-25T19:30:42Z",
    total_questions: 20,
    run_id: "sun-20260525-001",
  },
  answers: [
    {
      question_id: 1,
      question_text: "Do you maintain a formal Information Security Policy?",
      answer:
        "Yes. Northstar Labs maintains a formal Information Security Policy which is reviewed annually and approved by senior leadership. The policy covers access control, encryption, acceptable use, security responsibilities, asset management, and incident management.",
      citations: [
        {
          source_id: "ISP §1",
          text_snippet:
            "Northstar Labs maintains a formal Information Security Policy, reviewed annually and approved by leadership.",
        },
        {
          source_id: "ISQ_01 Q1",
          text_snippet:
            "Prior ISQ: confirmed a formal security policy is maintained and reviewed annually.",
        },
      ],
      confidence: {
        score: 0.93,
        dimensions: { cites_policy: 1.0, on_topic: 0.95, vendor_tone: 0.9, complete: 0.8 },
        needs_review: false,
        review_reason: null,
      },
      metrics: { tokens_in: 1240, tokens_out: 95, cost_usd: 0.0042, latency_ms: 1820 },
    },
    {
      question_id: 2,
      question_text:
        "Is multi-factor authentication (MFA) enforced for staff access to business systems?",
      answer:
        "Yes. MFA is enforced for all staff accessing business systems including email, source control, cloud infrastructure, and internal applications. Hardware keys are issued to engineers; TOTP is the default for all other staff.",
      citations: [
        {
          source_id: "ISP §4.2",
          text_snippet:
            "MFA is enforced for all staff accessing business systems; hardware keys for engineers.",
        },
        {
          source_id: "ISQ_01 Q4",
          text_snippet:
            "Prior ISQ: MFA enforced across email, source control, and cloud infrastructure.",
        },
      ],
      confidence: {
        score: 0.91,
        dimensions: { cites_policy: 1.0, on_topic: 0.95, vendor_tone: 0.85, complete: 0.8 },
        needs_review: false,
        review_reason: null,
      },
      metrics: { tokens_in: 1280, tokens_out: 78, cost_usd: 0.0039, latency_ms: 1640 },
    },
    {
      question_id: 3,
      question_text: "How frequently are staff awareness training sessions conducted?",
      answer:
        "Information security awareness training is mandatory for all new starters within their first two weeks and is repeated annually for all staff. Phishing simulations are run quarterly with targeted follow-up training for any staff who interact with simulated phishing messages.",
      citations: [
        {
          source_id: "ISP §6.1",
          text_snippet:
            "Security awareness training is mandatory for new starters and repeated annually.",
        },
      ],
      confidence: {
        score: 0.88,
        dimensions: { cites_policy: 0.95, on_topic: 0.9, vendor_tone: 0.85, complete: 0.75 },
        needs_review: false,
        review_reason: null,
      },
      metrics: { tokens_in: 1190, tokens_out: 88, cost_usd: 0.0041, latency_ms: 1720 },
    },
    {
      question_id: 4,
      question_text: "Do you encrypt customer data at rest and in transit?",
      answer:
        "All customer data is encrypted at rest using AES-256 and in transit using TLS 1.3. Encryption keys are managed via the cloud provider's managed KMS with quarterly rotation. No customer data is stored unencrypted at any point in the lifecycle.",
      citations: [
        {
          source_id: "ISP §7.3",
          text_snippet:
            "Customer data is encrypted at rest with AES-256 and in transit with TLS 1.3.",
        },
        {
          source_id: "ISQ_01 Q8",
          text_snippet: "Prior ISQ: encryption keys managed via cloud KMS with quarterly rotation.",
        },
        {
          source_id: "ISQ_02 Q6",
          text_snippet: "Prior ISQ: no customer data is stored unencrypted at any lifecycle stage.",
        },
      ],
      confidence: {
        score: 0.95,
        dimensions: { cites_policy: 1.0, on_topic: 1.0, vendor_tone: 0.9, complete: 0.85 },
        needs_review: false,
        review_reason: null,
      },
      metrics: { tokens_in: 1330, tokens_out: 91, cost_usd: 0.0044, latency_ms: 1810 },
    },
    {
      question_id: 5,
      question_text: "Are penetration tests conducted on customer-facing systems, and how often?",
      answer:
        "External penetration tests are conducted annually by a CREST-accredited third party. Internal vulnerability scans run weekly across all customer-facing systems. The most recent external test was completed in Q1 2026; findings and remediation evidence are available under NDA.",
      citations: [
        {
          source_id: "ISP §8.4",
          text_snippet:
            "External penetration tests run annually by a CREST-accredited third party.",
        },
        {
          source_id: "ISQ_01 Q12",
          text_snippet:
            "Prior ISQ: internal vulnerability scans run weekly on customer-facing systems.",
        },
      ],
      confidence: {
        score: 0.89,
        dimensions: { cites_policy: 1.0, on_topic: 0.9, vendor_tone: 0.85, complete: 0.75 },
        needs_review: false,
        review_reason: null,
      },
      metrics: { tokens_in: 1310, tokens_out: 102, cost_usd: 0.0046, latency_ms: 1880 },
    },
    {
      question_id: 6,
      question_text: "How is privileged access to operational technology (OT) controlled?",
      answer:
        "Northstar Labs does not operate operational technology (OT) systems. Our services are software-only: cloud-hosted applications and AI engineering work. Privileged access to our software development and production environments is controlled via short-lived credentials, just-in-time access via SSO, and full audit logging.",
      citations: [
        {
          source_id: "ISP §5.2",
          text_snippet:
            "Privileged access uses short-lived credentials, just-in-time SSO, and full audit logging.",
        },
      ],
      confidence: {
        score: 0.55,
        dimensions: { cites_policy: 0.6, on_topic: 0.5, vendor_tone: 0.85, complete: 0.4 },
        needs_review: true,
        review_reason:
          "LLM flagged: Question asks specifically about operational technology. Northstar Labs is software-only. Answer represents a scope-limitation statement.",
      },
      metrics: { tokens_in: 1180, tokens_out: 124, cost_usd: 0.0051, latency_ms: 2140 },
    },
    {
      question_id: 7,
      question_text: "Do you have a documented incident response plan?",
      answer:
        "Yes. Northstar Labs maintains a documented Incident Response Plan covering identification, containment, eradication, recovery, and post-incident review. The plan is reviewed annually and tested via tabletop exercises twice per year. The Information Security Lead is the named incident commander.",
      citations: [
        {
          source_id: "ISP §9.1",
          text_snippet:
            "A documented Incident Response Plan covers identification through post-incident review.",
        },
        {
          source_id: "ISQ_01 Q15",
          text_snippet: "Prior ISQ: IR plan tested via tabletop exercises twice per year.",
        },
      ],
      confidence: {
        score: 0.92,
        dimensions: { cites_policy: 1.0, on_topic: 0.95, vendor_tone: 0.9, complete: 0.8 },
        needs_review: false,
        review_reason: null,
      },
      metrics: { tokens_in: 1220, tokens_out: 102, cost_usd: 0.0044, latency_ms: 1750 },
    },
    {
      question_id: 8,
      question_text:
        "What is your maximum acceptable time to notify customers of a confirmed data breach?",
      answer:
        "Northstar Labs commits to notifying affected customers of a confirmed personal data breach within 72 hours of confirmation, in line with UK GDPR. Notification includes a description of the breach, categories and approximate number of data subjects affected, likely consequences, and the measures being taken to address it.",
      citations: [
        {
          source_id: "ISP §9.3",
          text_snippet:
            "Confirmed personal data breaches are notified to affected customers within 72 hours.",
        },
        {
          source_id: "ISQ_02 Q11",
          text_snippet: "Prior ISQ: breach notification aligns with UK GDPR timelines.",
        },
      ],
      confidence: {
        score: 0.9,
        dimensions: { cites_policy: 0.95, on_topic: 1.0, vendor_tone: 0.85, complete: 0.8 },
        needs_review: false,
        review_reason: null,
      },
      metrics: { tokens_in: 1290, tokens_out: 116, cost_usd: 0.0049, latency_ms: 1900 },
    },
    {
      question_id: 9,
      question_text: "How are third-party suppliers and sub-processors assessed?",
      answer:
        "Third-party suppliers and sub-processors are assessed via a structured due-diligence questionnaire covering security, data handling, and certifications. Critical suppliers are reviewed annually. A current list of sub-processors is maintained and available to customers on request under NDA.",
      citations: [
        {
          source_id: "ISP §11.2",
          text_snippet:
            "Suppliers and sub-processors are assessed via a structured due-diligence questionnaire.",
        },
      ],
      confidence: {
        score: 0.84,
        dimensions: { cites_policy: 0.85, on_topic: 0.9, vendor_tone: 0.8, complete: 0.8 },
        needs_review: false,
        review_reason: null,
      },
      metrics: { tokens_in: 1170, tokens_out: 89, cost_usd: 0.004, latency_ms: 1680 },
    },
    {
      question_id: 10,
      question_text: "Where is customer data physically stored?",
      answer:
        "Customer data is stored in UK and EU data centres operated by our cloud provider. Production data does not leave the UK/EU region under normal operation. Disaster-recovery replicas are maintained within the same legal jurisdiction.",
      citations: [
        {
          source_id: "ISP §7.5",
          text_snippet: "Customer data is stored in UK and EU data centres and stays in-region.",
        },
        {
          source_id: "ISQ_01 Q19",
          text_snippet:
            "Prior ISQ: disaster-recovery replicas held within the same legal jurisdiction.",
        },
      ],
      confidence: {
        score: 0.87,
        dimensions: { cites_policy: 0.95, on_topic: 0.9, vendor_tone: 0.8, complete: 0.75 },
        needs_review: false,
        review_reason: null,
      },
      metrics: { tokens_in: 1210, tokens_out: 81, cost_usd: 0.0041, latency_ms: 1700 },
    },
    {
      question_id: 11,
      question_text:
        "What are your Recovery Time Objective (RTO) and Recovery Point Objective (RPO) for critical SCADA-connected services?",
      answer:
        "Northstar Labs does not operate SCADA-connected services. Our offering is cloud-hosted software with no industrial control system integration. For our cloud platform, RTO is 4 hours and RPO is 1 hour. We can provide tailored figures for non-SCADA scenarios on request.",
      citations: [
        {
          source_id: "ISP §10.1",
          text_snippet: "Cloud platform RTO is 4 hours and RPO is 1 hour.",
        },
      ],
      confidence: {
        score: 0.51,
        dimensions: { cites_policy: 0.55, on_topic: 0.45, vendor_tone: 0.8, complete: 0.4 },
        needs_review: true,
        review_reason:
          "LLM flagged: Question is SCADA-specific. Northstar Labs is software-only and does not operate SCADA-connected services. Answer represents a scope-limitation statement; figures provided are for the equivalent cloud-platform service.",
      },
      metrics: { tokens_in: 1240, tokens_out: 134, cost_usd: 0.0054, latency_ms: 2230 },
    },
    {
      question_id: 12,
      question_text:
        "Do you maintain audit logs for privileged actions, and how long are they retained?",
      answer:
        "Audit logs for privileged actions are maintained for all production systems with a minimum retention period of 12 months. Logs are immutable, centrally aggregated, and reviewed by the Information Security Lead weekly. Tamper-evident storage is used.",
      citations: [
        {
          source_id: "ISP §8.6",
          text_snippet:
            "Audit logs for privileged actions are retained for a minimum of 12 months.",
        },
        {
          source_id: "ISQ_02 Q14",
          text_snippet: "Prior ISQ: logs are immutable, centrally aggregated, and reviewed weekly.",
        },
      ],
      confidence: {
        score: 0.89,
        dimensions: { cites_policy: 1.0, on_topic: 0.9, vendor_tone: 0.85, complete: 0.75 },
        needs_review: false,
        review_reason: null,
      },
      metrics: { tokens_in: 1260, tokens_out: 92, cost_usd: 0.0043, latency_ms: 1770 },
    },
    {
      question_id: 13,
      question_text: "Do staff sign a confidentiality agreement before accessing customer data?",
      answer:
        "Yes. All staff sign a confidentiality and data protection agreement as part of their employment contract before accessing any customer data. Contractors sign an equivalent agreement before being granted access.",
      citations: [
        {
          source_id: "ISP §3.4",
          text_snippet:
            "All staff sign a confidentiality and data protection agreement before data access.",
        },
      ],
      confidence: {
        score: 0.86,
        dimensions: { cites_policy: 0.95, on_topic: 0.9, vendor_tone: 0.8, complete: 0.75 },
        needs_review: false,
        review_reason: null,
      },
      metrics: { tokens_in: 1150, tokens_out: 72, cost_usd: 0.0037, latency_ms: 1590 },
    },
    {
      question_id: 14,
      question_text: "How are vulnerabilities in dependencies identified and remediated?",
      answer:
        "Dependency vulnerabilities are identified via automated scanning on every commit and on a daily schedule. Critical severity issues are remediated within 7 days; high severity within 30 days. The dependency policy and SLA are published internally.",
      citations: [
        {
          source_id: "ISP §8.2",
          text_snippet:
            "Dependency vulnerabilities are scanned on every commit and remediated to SLA.",
        },
        {
          source_id: "ISQ_01 Q17",
          text_snippet: "Prior ISQ: critical issues remediated within 7 days, high within 30.",
        },
      ],
      confidence: {
        score: 0.85,
        dimensions: { cites_policy: 0.9, on_topic: 0.9, vendor_tone: 0.8, complete: 0.75 },
        needs_review: false,
        review_reason: null,
      },
      metrics: { tokens_in: 1220, tokens_out: 87, cost_usd: 0.0041, latency_ms: 1730 },
    },
    {
      question_id: 15,
      question_text: "Is there a documented data retention and disposal policy?",
      answer:
        "Yes. Northstar Labs maintains a documented Data Retention and Disposal Policy. Customer data is retained for the duration of the contract and for a defined post-termination period before secure deletion. Disposal evidence is logged.",
      citations: [
        {
          source_id: "ISP §7.8",
          text_snippet: "A documented Data Retention and Disposal Policy governs secure deletion.",
        },
      ],
      confidence: {
        score: 0.83,
        dimensions: { cites_policy: 0.9, on_topic: 0.85, vendor_tone: 0.8, complete: 0.75 },
        needs_review: false,
        review_reason: null,
      },
      metrics: { tokens_in: 1180, tokens_out: 78, cost_usd: 0.0038, latency_ms: 1620 },
    },
    {
      question_id: 16,
      question_text: "Do you have cyber insurance, and what is the coverage limit?",
      answer:
        "Northstar Labs maintains cyber insurance with a coverage limit appropriate to the scale of customer engagements. Specific policy limits and certificates of insurance are available to customers under NDA on request.",
      citations: [
        {
          source_id: "ISQ_02 Q21",
          text_snippet:
            "Prior ISQ: cyber insurance is held; limits available under NDA on request.",
        },
      ],
      confidence: {
        score: 0.78,
        dimensions: { cites_policy: 0.75, on_topic: 0.85, vendor_tone: 0.8, complete: 0.65 },
        needs_review: false,
        review_reason: null,
      },
      metrics: { tokens_in: 1130, tokens_out: 70, cost_usd: 0.0036, latency_ms: 1580 },
    },
    {
      question_id: 17,
      question_text: "Are background checks performed on staff with access to customer data?",
      answer:
        "Yes. All staff with access to customer data undergo background checks proportionate to the sensitivity of their role, including identity verification, right-to-work checks, and where appropriate criminal record checks. Checks are repeated for role changes.",
      citations: [
        {
          source_id: "ISP §3.2",
          text_snippet:
            "Staff with data access undergo background checks proportionate to their role.",
        },
      ],
      confidence: {
        score: 0.85,
        dimensions: { cites_policy: 0.9, on_topic: 0.9, vendor_tone: 0.8, complete: 0.75 },
        needs_review: false,
        review_reason: null,
      },
      metrics: { tokens_in: 1180, tokens_out: 82, cost_usd: 0.0039, latency_ms: 1650 },
    },
    {
      question_id: 18,
      question_text: "What is the process for revoking access when staff leave?",
      answer:
        "On termination, access to all systems is revoked within one business hour of the effective end date via the central identity provider. Devices are recovered, encryption keys rotated, and the offboarding checklist is signed off by the Information Security Lead.",
      citations: [
        {
          source_id: "ISP §5.5",
          text_snippet: "Access is revoked within one business hour of an effective leave date.",
        },
        {
          source_id: "ISQ_01 Q22",
          text_snippet: "Prior ISQ: devices recovered and encryption keys rotated at offboarding.",
        },
      ],
      confidence: {
        score: 0.88,
        dimensions: { cites_policy: 0.95, on_topic: 0.9, vendor_tone: 0.85, complete: 0.8 },
        needs_review: false,
        review_reason: null,
      },
      metrics: { tokens_in: 1220, tokens_out: 89, cost_usd: 0.0042, latency_ms: 1740 },
    },
    {
      question_id: 19,
      question_text: "Do you maintain audit logs sufficient to support forensic investigation?",
      answer:
        "Yes. Audit logs across application, infrastructure, and access events are centrally aggregated with sufficient detail and retention to support forensic investigation. Logs are protected against tampering and segregated from operational access.",
      citations: [
        {
          source_id: "ISP §8.6",
          text_snippet:
            "Audit logs across app, infra, and access events support forensic investigation.",
        },
        {
          source_id: "ISQ_02 Q14",
          text_snippet:
            "Prior ISQ: logs protected against tampering and segregated from operational access.",
        },
      ],
      confidence: {
        score: 0.87,
        dimensions: { cites_policy: 0.95, on_topic: 0.9, vendor_tone: 0.85, complete: 0.75 },
        needs_review: false,
        review_reason: null,
      },
      metrics: { tokens_in: 1240, tokens_out: 84, cost_usd: 0.004, latency_ms: 1690 },
    },
    {
      question_id: 20,
      question_text:
        "Please provide details of any relevant certifications or compliance frameworks followed by your organisation.",
      answer:
        "Northstar Labs aligns its information security programme with the ISO 27001 framework. Cyber Essentials Plus certification is held and renewed annually. The internal control framework is mapped to NIST CSF for operational reference.",
      citations: [
        {
          source_id: "ISP §1.4",
          text_snippet:
            "The security programme aligns with ISO 27001; Cyber Essentials Plus is held.",
        },
        {
          source_id: "ISQ_01 Q24",
          text_snippet: "Prior ISQ: internal control framework mapped to NIST CSF.",
        },
        {
          source_id: "ISQ_02 Q23",
          text_snippet: "Prior ISQ: certifications renewed annually.",
        },
      ],
      confidence: {
        score: 0.9,
        dimensions: { cites_policy: 1.0, on_topic: 0.95, vendor_tone: 0.85, complete: 0.8 },
        needs_review: false,
        review_reason: null,
      },
      metrics: { tokens_in: 1300, tokens_out: 78, cost_usd: 0.004, latency_ms: 1660 },
    },
  ],
  summary_metrics: {
    total_cost_usd: 0.078,
    total_tokens: 28400, // 26340 in + 2060 out (backend pre-sums; no split)
    total_latency_ms: 42180,
    questions_flagged_for_review: 2,
    average_confidence: 0.86,
    flagged_question_indices: [6, 11],
    banner: null,
  },
};
