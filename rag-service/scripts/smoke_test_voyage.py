import time
from app.voyage.client import VoyageClient

client = VoyageClient()
vec = client.embed_query("Do you maintain a formal security policy?")
print(f"Query embedded - vector dim: {len(vec)}")  # should print 1024

time.sleep(20)  # Wait 20s to avoid rate limit on free tier

docs = [
    "MFA is mandatory for all cloud platforms.",
    "Backups are encrypted using AES-256.",
]
vecs = client.embed_documents(docs)
print(
    f"Documents embedded - count: {len(vecs)}, dim: {len(vecs[0])}"
)  # Should print 2, 1024

print(f"total tokens used: {client.tokens_used}")
print(f"Estimated cost: ${client.get_cost_estimate():.6f}")
