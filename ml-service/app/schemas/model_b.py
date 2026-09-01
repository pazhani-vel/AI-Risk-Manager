from pydantic import BaseModel, Field
from typing import Literal

class ModelBPredictionInput(BaseModel):
    # Transaction & Customer
    transaction_amount: float = Field(..., gt=0.0, description="Disputed transaction amount in USD")
    customer_account_age_days: float = Field(..., ge=0.0, description="Customer account age in days")
    previous_chargebacks: float = Field(..., ge=0.0, description="Historical chargeback count")
    previous_refunds: float = Field(..., ge=0.0, description="Historical refund count")
    customer_order_count: float = Field(..., ge=0.0, description="Total order volume of customer")
    
    # Dispute Reason
    dispute_reason: str = Field(..., description="Dispute code / reason string")
    
    # Evidence Present
    payment_verified: int = Field(..., ge=0, le=1, description="1 if payment gateway auth confirmed, 0 otherwise")
    authentication_verified: int = Field(..., ge=0, le=1, description="1 if 3D Secure / OTP passed, 0 otherwise")
    delivery_confirmed: int = Field(..., ge=0, le=1, description="1 if signed delivery proof present, 0 otherwise")
    otp_verified: int = Field(..., ge=0, le=1, description="1 if OTP verified at purchase, 0 otherwise")
    tracking_available: int = Field(..., ge=0, le=1, description="1 if valid carrier tracking exists, 0 otherwise")
    shipping_address_match: int = Field(..., ge=0, le=1, description="1 if shipping matches cardholder profile, 0 otherwise")
    billing_address_match: int = Field(..., ge=0, le=1, description="1 if billing matches AVS check, 0 otherwise")
    device_consistent: int = Field(..., ge=0, le=1, description="1 if regular customer device, 0 otherwise")
    transaction_authenticated: int = Field(..., ge=0, le=1, description="1 if authenticated session, 0 otherwise")
    customer_identity_verified: int = Field(..., ge=0, le=1, description="1 if KYC / ID verification present, 0 otherwise")
    
    # Evidence Quality & Completeness
    evidence_count: float = Field(..., ge=0.0, description="Total count of distinct evidence items")
    evidence_completeness: float = Field(..., ge=0.0, le=1.0, description="Score 0.0 to 1.0 on required fields attached")
    evidence_consistency: float = Field(..., ge=0.0, le=1.0, description="Score 0.0 to 1.0 on document consistency")
    
    # Response Time & Quality
    response_time_hours: float = Field(..., ge=0.0, description="Hours elapsed from dispute notification to rebuttal")
    merchant_response_quality_score: float = Field(..., ge=0.0, le=1.0, description="Score 0.0 to 1.0 on rebuttal letter quality")

class ModelBPredictionResponse(BaseModel):
    probability: float = Field(..., ge=0.0, le=1.0, description="Defense recovery probability")
    defense_score: float = Field(..., ge=0.0, le=100.0, description="Scaled defense score 0-100")
    recommendation: Literal["STRONG_DEFENSE", "REVIEW_REQUIRED", "WEAK_DEFENSE"] = Field(..., description="Actionable defense recommendation")
    model_version: str = Field(..., description="Model B version")
