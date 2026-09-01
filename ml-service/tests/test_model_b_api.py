import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.services.model_b_service import ModelBService

client = TestClient(app)

valid_payload_model_b = {
    "transaction_amount": 175.50,
    "customer_account_age_days": 320.0,
    "previous_chargebacks": 0.0,
    "previous_refunds": 1.0,
    "customer_order_count": 8.0,
    
    "dispute_reason": "FRAUDULENT_TRANSACTION",
    
    "payment_verified": 1,
    "authentication_verified": 1,
    "delivery_confirmed": 1,
    "otp_verified": 1,
    "tracking_available": 1,
    "shipping_address_match": 1,
    "billing_address_match": 1,
    "device_consistent": 1,
    "transaction_authenticated": 1,
    "customer_identity_verified": 1,
    
    "evidence_count": 4.0,
    "evidence_completeness": 0.95,
    "evidence_consistency": 0.90,
    
    "response_time_hours": 12.0,
    "merchant_response_quality_score": 0.88
}

def test_model_b_loading():
    service = ModelBService.get_instance()
    assert service._pipeline is not None
    assert service._metadata is not None
    assert service._metadata["version"] == "v1.0.0"

def test_model_b_metrics_endpoint():
    response = client.get("/model/model-b/metrics")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "test_metrics" in data["data"]
    assert "roc_auc" in data["data"]["test_metrics"]
    assert data["data"]["test_metrics"]["roc_auc"] > 0.5

def test_valid_defense_prediction():
    response = client.post("/predict/defense-success", json=valid_payload_model_b)
    assert response.status_code == 200
    res_data = response.json()
    
    assert "probability" in res_data
    assert "defense_score" in res_data
    assert "recommendation" in res_data
    assert "model_version" in res_data
    
    prob = res_data["probability"]
    assert 0.0 <= prob <= 1.0
    
    score = res_data["defense_score"]
    assert abs(score - round(prob * 100.0, 2)) <= 0.1
    
    assert res_data["recommendation"] in ["STRONG_DEFENSE", "REVIEW_REQUIRED", "WEAK_DEFENSE"]

def test_invalid_input_model_b():
    # Missing required field 'dispute_reason'
    bad_payload = valid_payload_model_b.copy()
    del bad_payload["dispute_reason"]
    
    response = client.post("/predict/defense-success", json=bad_payload)
    assert response.status_code == 422

def test_out_of_bounds_score_model_b():
    # evidence_completeness > 1.0
    bad_payload = valid_payload_model_b.copy()
    bad_payload["evidence_completeness"] = 1.8
    
    response = client.post("/predict/defense-success", json=bad_payload)
    assert response.status_code == 422
