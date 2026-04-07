FROM python:3.14-slim@sha256:5e59aae31ff0e87511226be8e2b94d78c58f05216efda3b07dbbed938ec8583b

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /usr/sbin/nologin appuser

WORKDIR /app

COPY requirements.txt requirements-test.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY --chown=appuser:appuser . .
RUN mkdir -p /app/staticfiles /app/media && chown -R appuser:appuser /app

ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=${GIT_COMMIT}

USER appuser

EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py collectstatic --noinput && python manage.py seed_admin && python manage.py seed_staff && gunicorn config.wsgi:application -c gunicorn.conf.py"]
