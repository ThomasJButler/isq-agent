# n8n credentials

**This workflow needs no credentials.**

- The `rag-service` is unauthenticated on the internal docker-compose network, so the HTTP
  Request nodes call `http://rag-service:8000` directly with no auth.
- The Form Trigger needs no login (`N8N_BASIC_AUTH_ACTIVE=false` in `docker-compose.yml` for
  local use).

If you later put an API key in front of the rag-service (a sensible production step, see
`SECURITY.md`), add an **HTTP Header Auth** credential in n8n (header `Authorization`, value
`Bearer <key>`) and attach it to the three HTTP Request nodes. Never commit the key; n8n stores
credentials encrypted in its `~/.n8n` volume.

## Optional, for the other input methods (not built)

The brief lists email / webhook / cloud-folder triggers as alternatives. If you add those:

| Trigger | Credential needed |
|---|---|
| Email (IMAP/Gmail) | Gmail OAuth2 or IMAP account |
| Cloud folder | the provider's OAuth (e.g. Google Drive, S3) |

The current scaffold uses the **manual dashboard upload** method only, which needs nothing.
