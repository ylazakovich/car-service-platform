FROM python:3.14-slim@sha256:584e89d31009a79ae4d9e3ab2fba078524a6c0921cb2711d05e8bb5f628fc9b9

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
RUN mkdir -p /app/staticfiles && chown -R appuser:appuser /app

ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=${GIT_COMMIT}

USER appuser

EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py collectstatic --noinput && python manage.py seed_admin && gunicorn config.wsgi:application -c gunicorn.conf.py"]
