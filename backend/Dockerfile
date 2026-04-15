FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
COPY backend/alembic.ini ./alembic.ini
COPY backend/alembic ./alembic

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY frontend ./frontend

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
