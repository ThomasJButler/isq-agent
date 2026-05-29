# Pre-meeting checklist

Print this or keep it on a second screen. The aim is that nothing technical surprises me on the
call.

---

## The day before

- [ ] Full run-through once, start to finish, silent. Confirm it all works.
- [ ] Read Section 1 (the opener) out loud three times until it's natural, not recited.
- [ ] Read the rest of the script out loud once, end to end, and time it. Target under 13
      minutes so there's room for questions.
- [ ] Index the corpus earlier in the day so Pinecone is warm:
      `curl -X POST http://localhost:8000/index -d '{"force_reindex":true}' -H "Content-Type: application/json"`
- [ ] Do one real Sunflowers run so the outputs are fresh and the numbers match the script.
- [ ] Anything that feels forced when I say it, reword it into my own words. The script is a
      starting point, not a cage.

---

## 30 minutes before

- [ ] `docker compose up -d`, then check both are up: `docker compose ps`
- [ ] Health check: `curl -s http://localhost:8000/health` returns `{"status":"ok"}`
- [ ] n8n open and reachable at http://localhost:5678, workflow imported and ready
- [ ] VS Code open on the repo, with these files already in tabs so I'm not hunting:
      - `rag-service/app/main.py`
      - `rag-service/app/rag/generator.py`
      - `rag-service/app/confidence/aggregator.py`
- [ ] The public GitHub repo open in a browser tab
- [ ] Sunflowers PDF and Blackridge PDF ready to upload (Simple Salvage XLSX if asked)
- [ ] A terminal open and ready for the `docker compose logs` observability bit
- [ ] Water and coffee within reach
- [ ] Phone on silent, notifications off, other apps closed

---

## 10 minutes before

- [ ] Read the opener out loud once more. That's it. No more cramming.
- [ ] Close everything I'm not demoing.
- [ ] Walk in confident. The work's done and it's solid.

---

## On the call, things to remember

- Show first, explain after. Don't apologise for anything before they've seen it work.
- Don't oversell. "This is the shape of how I'd build production" lands better than "this is
  production-ready."
- Don't read code aloud. Talk to the decisions, not the syntax.
- If they say "I'd have done X", that's good, not an attack: "good call, I considered X and went
  with Y because Z."
- Answer the question asked, then stop.
- Ask them questions back. It's a conversation, not an exam.

---

## If something breaks live

- If a run is slow, that's expected, about two minutes for 20 questions. Say so and keep talking
  through the architecture while it runs.
- If a live run fails outright, I've got fresh outputs from earlier in the day already on disk:
  open those and talk through them. The numbers are real either way.
- If n8n is being awkward, fall back to the Claude Code skill, it runs the same pipeline and
  it's a stronger story anyway.
