from unittest import TestCase

from config.admin_navigation import build_sidebar_navigation, group_admin_app_list


class AdminNavigationTests(TestCase):
    def test_build_sidebar_navigation_uses_shared_section_definitions(self):
        reverse_calls = []

        def reverse_stub(url_name: str) -> str:
            reverse_calls.append(url_name)
            return f"/mocked/{url_name}/"

        navigation = build_sidebar_navigation(reverse_stub)

        self.assertEqual(
            navigation,
            [
                {
                    "title": "Authorization",
                    "collapsible": True,
                    "items": [
                        {"title": "Groups", "link": "/mocked/admin:auth_group_changelist/"},
                        {"title": "Users", "link": "/mocked/admin:users_user_changelist/"},
                    ],
                },
                {
                    "title": "Platform",
                    "collapsible": True,
                    "items": [
                        {"title": "Customers", "link": "/mocked/admin:customers_customer_changelist/"},
                        {"title": "Vehicles", "link": "/mocked/admin:vehicles_vehicle_changelist/"},
                    ],
                },
                {
                    "title": "Operations",
                    "collapsible": True,
                    "items": [
                        {"title": "Services", "link": "/mocked/admin:services_service_changelist/"},
                        {"title": "Suppliers", "link": "/mocked/admin:purchases_supplier_changelist/"},
                        {"title": "Purchases", "link": "/mocked/admin:purchases_purchase_changelist/"},
                        {"title": "Repairs", "link": "/mocked/admin:repairs_repair_changelist/"},
                        {
                            "title": "Repair Financial Snapshots",
                            "link": "/mocked/admin:repairs_repairfinancialsnapshot_changelist/",
                        },
                    ],
                },
            ],
        )
        self.assertEqual(
            reverse_calls,
            [
                "admin:auth_group_changelist",
                "admin:users_user_changelist",
                "admin:customers_customer_changelist",
                "admin:vehicles_vehicle_changelist",
                "admin:services_service_changelist",
                "admin:purchases_supplier_changelist",
                "admin:purchases_purchase_changelist",
                "admin:repairs_repair_changelist",
                "admin:repairs_repairfinancialsnapshot_changelist",
            ],
        )

    def test_group_admin_app_list_matches_sidebar_sections(self):
        app_list = [
            {
                "app_label": "auth",
                "models": [{"name": "Groups"}],
            },
            {
                "app_label": "users",
                "models": [{"name": "Users"}],
            },
            {
                "app_label": "customers",
                "models": [{"name": "Customers"}],
            },
            {
                "app_label": "vehicles",
                "models": [{"name": "Vehicles"}],
            },
            {
                "app_label": "foundation",
                "models": [{"name": "Ignored"}],
            },
            {
                "app_label": "services",
                "models": [{"name": "Services"}],
            },
            {
                "app_label": "purchases",
                "models": [{"name": "Suppliers"}, {"name": "Purchases"}],
            },
            {
                "app_label": "repairs",
                "models": [{"name": "Repairs"}, {"name": "Repair Financial Snapshots"}],
            },
        ]

        grouped = group_admin_app_list(app_list)

        self.assertEqual(
            grouped,
            [
                {
                    "name": "Authorization",
                    "app_label": "authorization",
                    "models": [{"name": "Groups"}, {"name": "Users"}],
                },
                {
                    "name": "Platform",
                    "app_label": "platform",
                    "models": [{"name": "Customers"}, {"name": "Vehicles"}],
                },
                {
                    "name": "Operations",
                    "app_label": "operations",
                    "models": [
                        {"name": "Services"},
                        {"name": "Suppliers"},
                        {"name": "Purchases"},
                        {"name": "Repairs"},
                        {"name": "Repair Financial Snapshots"},
                    ],
                },
            ],
        )
