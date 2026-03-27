from django.urls import path

from .views import RepairDetailView, RepairListCreateView, RepairNoteCreateView, RepairNoteDeleteView

urlpatterns = [
    path("", RepairListCreateView.as_view(), name="repair-list"),
    path("<int:pk>", RepairDetailView.as_view(), name="repair-detail"),
    path("<int:repair_pk>/notes/", RepairNoteCreateView.as_view(), name="repair-note-create"),
    path("<int:repair_pk>/notes/<int:note_pk>", RepairNoteDeleteView.as_view(), name="repair-note-delete"),
]
