import os

bind = "0.0.0.0:8000"
workers = int(os.environ.get("GUNICORN_WORKERS", "1"))
threads = 2
timeout = 120
accesslog = "-"
errorlog = "-"
capture_output = True
