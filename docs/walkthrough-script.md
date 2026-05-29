# Walkthrough script

The words I'll say on the RiverAI call, with timing. About 12 minutes of walkthrough, then
questions. Screen-share: the n8n canvas, VS Code with the repo, the rendered outputs, and the
public GitHub repo.

Every number in here comes from a real run against the live service on 2026-05-29, not an
estimate. Where I quote a flagged reason, it's the exact text the system produced.

---

## Section 1 — Opener (about 90 seconds)

> "Thanks for having me back. I'll spend about 12 minutes walking through what I built, then we
> can get into questions.
>
> Quick bit of framing first. The engine here isn't built from scratch. It's the synthesis of
> patterns I'd already proven in my own projects: the single-call analysis shape from my news
> project, the multi-dimension confidence scoring from my code-review tool, the
> strict-rules-in-the-prompt grounding from my SQL project, and the retrieval core from my
> production RAG work. The CV you saw on Monday came out of the same family of system, my
> job-search product. So I didn't start from a blank page. I took working patterns and applied
> them to your supplier-questionnaire problem.
>
> One thing on how it's built: it's Claude-native top to bottom. Question extraction and answer
> generation both use Anthropic's tool-use API for guaranteed structured output, Claude Sonnet
> 4.5 does the generation, and I've packaged the whole thing as a Claude Code skill you can
> install and run in a sentence. I'll show you that at the end."

Timing: about 90 seconds. Steady, no rushing.

---

## Section 2 — Live demo, the happy path (about 3 minutes)

> "Right, let me show you it running. This is the Sunflowers Charity questionnaire from the
> brief, a PDF."

[Upload Sunflowers into the n8n form trigger]

> "The workflow picks it up. It pulls the text out of the PDF, sends it to the extractor,
> that's a Claude call with tool-use so the questions come back as structured data, not text I
> have to parse. Then it loops the 20 questions through the RAG service one at a time, and
> renders the result into three files."

[While it runs, about two minutes]

> "Worth being honest about the timing: a full 20-question run is about two minutes, because
> each answer is its own grounded Claude call. I'd rather it be right than fast. The questions
> parallelise cleanly, so speeding that up is the first thing on my list."

[Open the DOCX output]

> "Here's the report. Top of the document, the summary: 20 questions answered, 1 flagged for
> review, cost about 18 pence, average confidence 0.92. Then every question and answer in order,
> with the policy citations under each one."

[Scroll to the flagged answer, Q20]

> "This is the one it flagged. The question asks about certifications and compliance standards.
> The answer it gave is solid on GDPR and the governance framework, but it flagged itself,
> because the source policies don't explicitly mention formal certifications like ISO 27001 or
> SOC 2. So rather than imply we hold certs we can't evidence, it answers what it can and tells
> a human to check the rest. That's the behaviour I care about most: it knows what it doesn't
> know."

Timing: about 3 minutes. The show-don't-tell half.

---

## Section 3 — The Blackridge edge case (about 90 seconds)

> "Second one, and this is the interesting one. Blackridge are a wind-energy supplier. Their
> questionnaire asks a lot about operational technology, the industrial control side. The thing
> is, Northstar is a software-only company. It doesn't run any of that. So a lot of the
> questions don't apply, and a lazy system would either make something up or leave it blank."

[Upload Blackridge, open the output]

> "Watch what it does instead. Out of 20 questions, it flagged 11. Here's the OT one. The
> question asks how privileged access to operational-technology systems is controlled. The
> answer says, straight out, that Northstar is software-only and doesn't operate OT, then
> reframes to the access controls we do have. And it flagged itself with this reason:"

> "*The question asks specifically about operational technology systems. Northstar Labs is a
> software-only company and does not operate OT environments. The answer reframes to our
> privileged access controls for production and administrative systems. Recommend manual review
> to confirm the requester accepts this framing or requires clarification.*"

> "That's the system telling the truth about a scope mismatch instead of bluffing. The other
> flags are the same idea: some are scope mismatches, some are 'no policy matched this closely
> enough, get a human to look.' For an audit-facing tool, that honesty is the whole point. A
> high flag count on the wrong-shaped questionnaire is the system working, not failing."

Timing: about 90 seconds. The honest-engineering card, and the strongest one.

---

## Section 4 — Architecture, why it's built this way (about 3 minutes)

> "Let me show you why it's shaped the way it is."

[Show the n8n canvas]

> "Two tiers. The first is n8n. It owns orchestration: the file comes in, it handles pulling
> text out, looping, calling the service, and collecting the rendered files at the end. The
> brief said 'not entirely code-based', so n8n is properly the orchestrator here, not a thin
> wrapper round a script."

[Switch to VS Code, open rag-service/app/main.py]

> "The second tier is a small Python FastAPI service. It owns the RAG core: embedding with
> Voyage, vector search with Pinecone, generation with Claude. They talk over HTTP. The split
> is deliberate. I'd already solved enterprise RAG properly in an earlier project, so rebuilding
> it inside n8n's code nodes would've been worse than what I already had. So n8n does what n8n
> is good at, and the Python does what it's good at."

[Open rag-service/app/rag/generator.py]

> "The answer generator is one Claude call per question with tool-use forcing the JSON shape.
> The system prompt is strict: use only the chunks provided, prefer policies over old answers,
> never invent, and score yourself across four dimensions. That strict-rules pattern and the
> single-call-multi-field shape are both lifted from my earlier projects."

[Open rag-service/app/confidence/aggregator.py]

> "Confidence is hybrid. It takes the model's own four-dimension self-score and sanity-checks it
> against how well retrieval actually matched. If the model sounds confident but retrieval was
> weak, the score gets pulled down. That's exactly what caught the Blackridge questions where no
> policy really matched."

Timing: about 3 minutes. The architecture story plus the proof it's drawn from real prior work.

---

## Section 5 — Cross-system observability (about 1 minute)

> "One production detail worth showing, because it's the kind of thing that matters when
> something goes wrong at 2am."

[Open a terminal: docker compose logs rag-service | tail -20]

> "Every run gets a request id that n8n generates and passes on the header, and the service
> echoes it back and stamps it on every log line. So if one question misbehaves, I take that one
> id and trace it across n8n's execution view and the service logs and see the whole story end
> to end. I built that in from the start, not bolted on after."

Timing: about 1 minute.

---

## Section 6 — The Claude Code skill (about 1 minute)

> "Last thing before questions, and this is the bit no other candidate will have. The same
> engine is packaged as a Claude Code skill. So instead of the n8n form, I can sit in a Claude
> Code chat and just say 'process this questionnaire', and it runs the whole pipeline against
> the service and writes the three files out. One install. Same backend, same honest flagging,
> just a different front door, the one I actually live in as an engineer."

[Optionally show process_isq.py producing outputs/]

Timing: about 1 minute.

---

## Section 7 — What I'd do with more time (about 2 minutes)

> "You asked for an honest 'next steps' list, so here it is:
>
> 1. Run the questions in parallel. Right now it's one at a time for clarity; batching would
>    take a 20-question run from two minutes down to seconds.
> 2. A PDF renderer. It does DOCX, XLSX and JSON today. PDF was on the list, I deferred it
>    because true form-overlay is fiddly and I'd rather ship three solid formats than four shaky
>    ones.
> 3. An MCP layer, so the answer and extract endpoints are callable as tools from any Claude
>    Code chat, not just the packaged skill.
> 4. A reranker stage on retrieval. I've got one in an earlier project I can lift. For this
>    corpus retrieval is already strong, but it'd matter at enterprise scale.
> 5. Extended thinking on the hard, flagged questions, a deeper second pass before a human sees
>    them.
> 6. The other input triggers from the brief, email and a cloud folder, which n8n does natively.
> 7. A question cap and rate limit, so an enormous upload can't run up the bill. Each question
>    is a real Claude call, so cost scales with size.
> 8. Hosting it properly rather than docker compose on my machine.
> 9. More few-shot examples in the prompt, with a bigger set of historical answers to draw on.
> 10. An overnight tuning loop, the same harness I used to build this, pointed at chunking and
>     prompt variations to improve answer quality over time."

Timing: about 2 minutes. The senior-thinking signal.

---

## Section 8 — Close (about 30 seconds)

> "That's the walkthrough. The whole thing is on GitHub, public. There's the README, the
> planning folder with every iteration I went through before writing a line of code, the test
> suite, and the tags showing the milestones build up. Happy to take questions, and I've got a
> couple for you too about how RiverAI handles questionnaires today."

Timing: about 30 seconds.

---

## Real numbers (captured 2026-05-29, keep on a second screen)

| Questionnaire | Format | Questions | Flagged | Cost | Time | Avg confidence |
|---|---|---|---|---|---|---|
| Sunflowers Charity | PDF | 20 | 1 | $0.18 | ~2 min | 0.92 |
| Blackridge Wind Energy | PDF | 20 | 11 | $0.14 | ~99s | 0.76 |
| Simple Salvage | XLSX | 10 | 0 | $0.08 | ~50s | 0.91 |

The Blackridge flag count is high on purpose: it's the wrong-shaped questionnaire for a
software-only company, and the system is honest about that rather than bluffing.
