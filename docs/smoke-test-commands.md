# Smoke-test commands

Quick manual checks against a running stack (`docker compose up`, rag-service on `:8000`).
Each hits a real endpoint; the `/answer` and `/process-questionnaire` ones make billable
Claude + Voyage calls, so they cost a few pence. Use these to confirm the service is healthy
and behaving before a demo.

Pipe responses through `python3 -m json.tool` to pretty-print.

## Liveness

```bash
# Service is up
curl -s http://localhost:8000/health | python3 -m json.tool

# Root: version + links
curl -s http://localhost:8000/ | python3 -m json.tool
```

## Retrieval + answering (billable)

```bash
# A single grounded answer — a real, on-topic question
curl -s -X POST http://localhost:8000/answer \
  -H "Content-Type: application/json" \
  -d '{"question":"Do you maintain a formal Information Security Policy?"}' \
  | python3 -m json.tool

# An access-control question (should retrieve from the InfoSec policy)
curl -s -X POST http://localhost:8000/answer \
  -H "Content-Type: application/json" \
  -d '{"question":"How do you control access to systems and data?"}' \
  | python3 -m json.tool

# A question the corpus does NOT cover — confirms honest flagging
# (expect a low confidence score + needs_review = true)
curl -s -X POST http://localhost:8000/answer \
  -H "Content-Type: application/json" \
  -d '{"question":"How is privileged access to operational technology (OT) systems controlled?"}' \
  | python3 -m json.tool
```

## Request correlation

```bash
# Confirm the X-Request-Id is echoed back (cross-system tracing)
curl -s -D - -o /dev/null -X POST http://localhost:8000/answer \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: smoke-001" \
  -d '{"question":"Do you encrypt data at rest?"}' \
  | grep -i x-request-id
```

## Rendering

```bash
# Render a tiny canonical envelope to each format (writes a downloadable file)
ENV='{"questionnaire_meta":{"origin":"Smoke","filename":"smoke.pdf","completed_at":"2026-05-29T00:00:00Z","total_questions":1},"answers":[{"question_id":"q1","question_text":"Do you encrypt data at rest?","answer":"Yes, AES-256.","citations":[],"confidence":{"score":0.9,"needs_review":false,"review_reason":null},"metrics":{"tokens_in":10,"tokens_out":5,"cost_usd":0.001,"latency_ms":100}}],"summary_metrics":{"total_cost_usd":0.001,"total_tokens":15,"total_latency_ms":100,"questions_flagged_for_review":0,"banner":null}}'

curl -s -o smoke.json -w "json: %{http_code} %{content_type}\n" \
  -F "format=json" -F "envelope=$ENV" http://localhost:8000/render
curl -s -o smoke.docx -w "docx: %{http_code} %{content_type}\n" \
  -F "format=docx" -F "envelope=$ENV" http://localhost:8000/render
curl -s -o smoke.xlsx -w "xlsx: %{http_code} %{content_type}\n" \
  -F "format=xlsx" -F "envelope=$ENV" http://localhost:8000/render
```

## Whole questionnaire (billable, slower)

```bash
# Process a small set of questions end to end (one canonical envelope back)
curl -s -X POST http://localhost:8000/process-questionnaire \
  -H "Content-Type: application/json" \
  -d '{"origin":"Smoke Co","filename":"smoke.pdf","questions":[
        {"question_id":"q1","text":"Do you encrypt sensitive data?","index":1},
        {"question_id":"q2","text":"Do you provide security awareness training?","index":2}
      ]}' \
  | python3 -m json.tool
```
