FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY signalos ./signalos
COPY scripts ./scripts
COPY data ./data

CMD ["uvicorn", "signalos.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
