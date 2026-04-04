import allure
import pytest


@pytest.fixture(autouse=True)
def _allure_backend_epic():
    allure.dynamic.epic("api")
