"""
Single source of truth for admin navigation and dashboard grouping.
"""

from __future__ import annotations

from typing import Callable


ADMIN_NAVIGATION_SECTIONS = (
    {
        "title": "Authorization",
        "app_labels": ("auth", "users"),
        "items": (
            {"title": "Groups", "url_name": "admin:auth_group_changelist"},
            {"title": "Users", "url_name": "admin:users_user_changelist"},
        ),
    },
    {
        "title": "Platform",
        "app_labels": ("customers", "vehicles"),
        "items": (
            {"title": "Customers", "url_name": "admin:customers_customer_changelist"},
            {"title": "Vehicles", "url_name": "admin:vehicles_vehicle_changelist"},
        ),
    },
    {
        "title": "Operations",
        "app_labels": ("services", "purchases", "repairs"),
        "items": (
            {"title": "Services", "url_name": "admin:services_service_changelist"},
            {"title": "Suppliers", "url_name": "admin:purchases_supplier_changelist"},
            {"title": "Purchases", "url_name": "admin:purchases_purchase_changelist"},
            {"title": "Repairs", "url_name": "admin:repairs_repair_changelist"},
            {"title": "Repair Financial Snapshots", "url_name": "admin:repairs_repairfinancialsnapshot_changelist"},
        ),
    },
)


def build_sidebar_navigation(reverse_fn: Callable[[str], str]) -> list[dict]:
    navigation = []

    for section in ADMIN_NAVIGATION_SECTIONS:
        navigation.append(
            {
                "title": section["title"],
                "collapsible": True,
                "items": [
                    {
                        "title": item["title"],
                        "link": reverse_fn(item["url_name"]),
                    }
                    for item in section["items"]
                ],
            }
        )

    return navigation


def group_admin_app_list(app_list: list[dict]) -> list[dict]:
    sections = []

    for section in ADMIN_NAVIGATION_SECTIONS:
        grouped_models = []
        allowed_labels = set(section["app_labels"])

        for app in app_list:
            if not isinstance(app, dict):
                continue

            if app.get("app_label", "") not in allowed_labels:
                continue

            models = app.get("models") or []
            for model in models:
                if isinstance(model, dict):
                    grouped_models.append(model)

        if grouped_models:
            sections.append(
                {
                    "name": section["title"],
                    "app_label": section["title"].lower(),
                    "models": grouped_models,
                }
            )

    return sections
