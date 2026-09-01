import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.services.model_a_service import ModelAService

client = TestClient(app)

valid_payload = {
    "account_age_days": 720.0,
    "total_orders": 24.0,
    "successful_orders": 23.0,
    "cancelled_orders": 1.0,
    "previous_returns": 1.0,
    "previous_refunds": 0.0,
    "previous_chargebacks": 0.0,
    "customer_chargeback_rate": 0.0,
    "customer_return_rate": 0.0417,
    "average_order_value": 85.50,
    "transaction_amount": 150.00,
    "payment_method": "CREDIT_CARD",
    "transaction_hour": 14,
    "is_international": 0,
    "orders_last_24h": 1.0,
    "amount_vs_customer_avg": 1.75,
    "device_age_days": 180.0,
    "multiple_accounts_same_device": 0,
    "ip_country_match": 1,
    "billing_shipping_match": 1,
    "login_after_purchase": 0,
    "product_shipped": 1,
    "delivery_confirmed": 1,
    "otp_verified": 1,
    "tracking_available": 1
}

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "AI Risk Manager ML Service"
    }

def test_model_loading():
    service = ModelAService.get_instance()
    assert service._pipeline is not None
    assert service._metadata is not None
    assert service._metadata["version"] == "v1.0.0"

def test_model_metrics_endpoint():
    response = client.get("/model/model-a/metrics")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "test_metrics" in data["data"]
    assert "roc_auc" in data["data"]["test_metrics"]
    assert data["data"]["test_metrics"]["roc_auc"] > 0.5

def test_valid_prediction_and_expected_loss():
    response = client.post("/predict/chargeback-risk", json=valid_payload)
    assert response.status_code == 200
    res_data = response.json()
    
    assert "probability" in res_data
    assert "risk_score" in res_data
    assert "risk_level" in res_data
    assert "expected_loss" in res_data
    assert "model_version" in res_data
    
    prob = res_data["probability"]
    assert 0.0 <= prob <= 1.0
    
    # Verify risk_score = probability * 100
    expected_score = round(prob * 100.0, 2)
    assert abs(res_data["risk_score"] - expected_score) <= 0.1
    
    # Verify expected_loss = probability * transaction_amount
    expected_loss = round(prob * valid_payload["transaction_amount"], 2)
    assert abs(res_data["expected_loss"] - expected_loss) <= 0.1
    
    assert res_data["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

def test_invalid_input_validation():
    # Missing required field 'transaction_amount'
    bad_payload = valid_payload.copy()
    del bad_payload["transaction_amount"]
    
    response = client.post("/predict/chargeback-risk", json=bad_payload)
    assert response.status_code == 422  # Unprocessable Entity Pydantic validation error

def test_out_of_range_input_validation():
    # Out of range customer_chargeback_rate > 1.0
    bad_payload = valid_payload.copy()
    bad_payload["customer_chargeback_rate"] = 2.5
    
    response = client.post("/predict/chargeback-risk", json=bad_payload)
    assert response.status_code == 422
