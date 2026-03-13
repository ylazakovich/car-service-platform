import threading
import uuid

_local = threading.local()


def get_request_id() -> str:
    return getattr(_local, "req_id", "-")


class RequestIdFilter:
    def filter(self, record):
        record.req_id = get_request_id()
        return True


class RequestIdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _local.req_id = uuid.uuid4().hex[:8]
        request.req_id = _local.req_id
        response = self.get_response(request)
        response["X-Request-ID"] = request.req_id
        _local.req_id = None
        return response
