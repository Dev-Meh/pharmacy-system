from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from core import views

urlpatterns = [
    # Auth
    path("auth/login/", views.LoginView.as_view(), name="auth-login"),
    path("auth/logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", views.MeView.as_view(), name="auth-me"),
    path("auth/change-password/", views.ChangePasswordView.as_view(), name="auth-change-password"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    # Users (admin)
    path("users/", views.UserListCreateView.as_view(), name="user-list"),
    path("users/<int:user_id>/role/", views.SetUserRoleView.as_view(), name="user-role"),
    # Pharmacies (platform admin)
    path("pharmacies/", views.PharmacyListCreateView.as_view(), name="pharmacy-list"),
    path("pharmacies/<uuid:pk>/access/", views.PharmacyAccessView.as_view(), name="pharmacy-access"),
    path("pharmacies/<uuid:pk>/manager-password/", views.PharmacyManagerPasswordView.as_view(), name="pharmacy-manager-password"),
    # Branches
    path("branches/", views.BranchListCreateView.as_view(), name="branch-list"),
    path("branches/<uuid:pk>/", views.BranchDetailView.as_view(), name="branch-detail"),
    path("branches/<uuid:pk>/members/", views.BranchMemberListCreateView.as_view(), name="branch-members"),
    path("branches/<uuid:pk>/members/<int:user_id>/", views.BranchMemberDetailView.as_view(), name="branch-member-detail"),
    # Products (global catalog)
    path("products/", views.ProductListCreateView.as_view(), name="product-list"),
    path("products/<uuid:pk>/", views.ProductDetailView.as_view(), name="product-detail"),
    # Branch inventory (legacy /drugs/ paths)
    path("drugs/", views.DrugListCreateView.as_view(), name="drug-list"),
    path("drugs/in-stock/", views.DrugInStockListView.as_view(), name="drug-in-stock"),
    path("drugs/<uuid:pk>/", views.DrugDetailView.as_view(), name="drug-detail"),
    # Sales
    path("sales/", views.SaleListCreateView.as_view(), name="sale-list"),
    path("sales/report/", views.SalesReportView.as_view(), name="sales-report"),
    # Dashboard
    path("dashboard/stats/", views.DashboardStatsView.as_view(), name="dashboard-stats"),
    path("dashboard/sales-chart/", views.SalesChartView.as_view(), name="dashboard-sales-chart"),
    path("drugs/low-stock/", views.LowStockDrugListView.as_view(), name="drug-low-stock"),
    # Stock orders (reorder requests)
    path("stock-orders/", views.StockOrderListCreateView.as_view(), name="stock-order-list"),
    path("stock-orders/<uuid:pk>/", views.StockOrderDetailView.as_view(), name="stock-order-detail"),
    # Direct stock imports (no order)
    path("inventory/imports/", views.StockImportListCreateView.as_view(), name="stock-import-list"),
]
