# ISQ Agent RAG service — container image.
# docker-compose builds this (build: ./rag-service) and runs it as the :8000 API.
# Secrets are injected by compose's `env_file: .env` into the container environment;
# pydantic-settings reads os.environ, so no .env file is copied into the image.

FROM python:3.11-slim

WORKDIR /app

# System deps kept minimal: the Python wheels (pypdf, python-docx, openpyxl,
# pinecone, voyageai) are pure-Python or ship manylinux wheels.

# Install requirements first so the layer caches unless requirements.txt changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code only — tests/scripts/.venv are excluded via .dockerignore.
COPY app ./app

EXPOSE 8000

# 0.0.0.0 so the port is reachable from other compose services + the host.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
