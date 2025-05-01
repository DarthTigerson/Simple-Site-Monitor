FROM python:3.13-slim

WORKDIR /app

COPY . .

RUN pip install --no-cache-dir pdm && \
    pdm install --no-self && \
    chmod -R 777 /app/data

EXPOSE 8000

CMD ["pdm", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 