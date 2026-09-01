from pydantic import BaseModel, Field
from typing import Literal, Optional

class ModelAPredictionInput(BaseModel):
    account_age_days: float = Field(..., ge=0, description="Customer account age in days")
    total_orders: float = Field(..., ge=0, description="Total historical orders placed")
    successful_orders: float = Field(..., ge=0, description="Total successfully completed orders")
    cancelled_orders: float = Field(..., ge=0, description="Total cancelled orders")
    previous_returns: float = Field(..., ge=0, description="Number of previous item returns")
    previous_refunds: float = Field(..., ge=0, description="Number of previous refunds requested")
    previous_chargebacks: float = Field(..., ge=0, description="Number of previous chargebacks filed")
    customer_chargeback_rate: float = Field(..., ge=0.0, le=1.0, description="Historical chargeback rate")
    customer_return_rate: float = Field(..., ge=0.0, le=1.0, description="Historical return rate")
    average_order_value: float = Field(..., ge=0.0, description="Customer average order value")
    
    transaction_amount: float = Field(..., gt=0.0, description="Transaction gross amount in USD")
    payment_method: str = Field(..., description="Payment method: CREDIT_CARD, DEBIT_CARD, PAYPAL, etc.")
    transaction_hour: int = Field(..., ge=0, le=23, description="Hour of the day (0-23)")
    is_international: int = Field(..., ge=0, le=1, description="Binary flag 1 if cross-border, 0 otherwise")
    orders_last_24h: float = Field(..., ge=0, description="Order velocity in past 24 hours")
    amount_vs_customer_avg: float = Field(..., ge=0.0, description="Ratio of transaction amount to average order value")
    
    device_age_days: float = Field(..., ge=0, description="Device footprint age in days")
    multiple_accounts_same_device: int = Field(..., ge=0, le=1, description="1 if device shared across accounts, 0 otherwise")
    ip_country_match: int = Field(..., ge=0, le=1, description="1 if IP matches billing country, 0 otherwise")
    billing_shipping_match: int = Field(..., ge=0, le=1, description="1 if billing address matches shipping, 0 otherwise")
    login_after_purchase: int = Field(..., ge=0, le=1, description="1 if user logged in post purchase, 0 otherwise")
    
    product_shipped: int = Field(..., ge=0, le=1, description="1 if product has been dispatched, 0 otherwise")
    delivery_confirmed: int = Field(..., ge=0, le=1, description="1 if delivery confirmation received, 0 otherwise")
    otp_verified: int = Field(..., ge=0, le=1, description="1 if SMS/Email OTP verified, 0 otherwise")
    tracking_available: int = Field(..., ge=0, le=1, description="1 if carrier tracking number exists, 0 otherwise")

class ModelAPredictionResponse(BaseModel):
    probability: float = Field(..., ge=0.0, le=1.0, description="Chargeback probability")
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Risk score 0-100")
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = Field(..., description="Assigned risk tier")
    expected_loss: float = Field(..., ge=0.0, description="Expected loss in USD = probability * amount")
    model_version: str = Field(..., description="Deployed Model A version")
