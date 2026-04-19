import os
import uuid

from django.core.files.storage import default_storage
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".doc", ".docx", ".xls", ".xlsx"}
MAX_FILE_SIZE = 10 * 1024 * 1024


class InvoiceUploadView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        ext = os.path.splitext(file.name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return Response({"detail": "File type not allowed."}, status=status.HTTP_400_BAD_REQUEST)

        if file.size > MAX_FILE_SIZE:
            return Response({"detail": "File too large (max 10 MB)."}, status=status.HTTP_400_BAD_REQUEST)

        filename = f"{uuid.uuid4().hex}{ext}"
        storage_path = default_storage.save(f"invoices/{filename}", file)
        url = default_storage.url(storage_path)
        return Response({"url": url, "name": file.name}, status=status.HTTP_201_CREATED)
