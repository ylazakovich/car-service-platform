import allure
import pytest


def _pytest_file_path(request: pytest.FixtureRequest) -> str:
    p = getattr(request, "path", None)
    if p is not None:
        return str(p)
    return str(request.node.fspath)


def _allure_feature_from_backend_path(path: str) -> str:
    p = path.replace("\\", "/").lower()
    if "/repairs/" in p:
        return "repairs"
    if "/users/" in p:
        return "users"
    if "/vehicles/" in p:
        return "vehicles"
    if "/uploads/" in p:
        return "uploads"
    if "/purchases/" in p:
        return "purchases"
    if "/customers/" in p:
        return "customers"
    if "/services/" in p:
        return "services"
    if "/foundation/" in p:
        return "foundation"
    if "/config/" in p:
        return "config"
    return "other"


@pytest.fixture(autouse=True)
def _allure_backend_labels(request: pytest.FixtureRequest):
    allure.dynamic.label("component", "backend")
    # Allure 3 pyramid charts expect `layer`; `integration` = middle tier (API tests), see docs/testing/test-pyramid.md
    allure.dynamic.label("layer", "integration")
    allure.dynamic.epic("api")
    allure.dynamic.feature(_allure_feature_from_backend_path(_pytest_file_path(request)))
