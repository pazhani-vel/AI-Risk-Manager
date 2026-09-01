# Model B: Chargeback Defense Success Prediction — Evaluation Report

## 1. Overview
- **Model**: Model B — Chargeback Defense Success Prediction
- **Algorithm**: Logistic Regression
- **Version**: v1.0.0
- **Training Timestamp**: 2026-08-30T15:25:53.508027+00:00
- **Dataset**: `dataset\model_b_dataset.csv` (20,000 total disputes)

---

## 2. Train / Validation / Test Splits
- **Training Set**: 14,000 samples (70%)
- **Validation Set**: 3,000 samples (15%)
- **Held-out Test Set**: 3,000 samples (15%)
- **Target Balance**: 50.0% Win (1) / 50.0% Loss (0)

---

## 3. Model Comparison on Validation Set

| Model Candidate | Precision | Recall | F1 Score | ROC-AUC | PR-AUC |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Logistic Regression** | 0.6662 | 0.6853 | 0.6756 | 0.7363 | 0.7199 |
| **Random Forest** | 0.6605 | 0.6887 | 0.6743 | 0.7292 | 0.7084 |
| **XGBoost** | 0.6566 | 0.6947 | 0.6751 | 0.7280 | 0.7094 |

---

## 4. Final Held-Out Test Evaluation (Logistic Regression)

- **Decision Threshold**: `0.5`
- **Precision**: `0.6669`
- **Recall**: `0.7167`
- **F1 Score**: `0.6909`
- **ROC-AUC**: `0.7423`
- **PR-AUC**: `0.7289`

### Confusion Matrix (Test Set: 3,000 disputes)
- **True Negatives (TN)**: 963
- **False Positives (FP)**: 537
- **False Negatives (FN)**: 425
- **True Positives (TP)**: 1,075

---

## 5. Input Feature Schema (21 Features)
- **Numerical (20)**: `transaction_amount, customer_account_age_days, previous_chargebacks, previous_refunds, customer_order_count, payment_verified, authentication_verified, delivery_confirmed, otp_verified, tracking_available, shipping_address_match, billing_address_match, device_consistent, transaction_authenticated, customer_identity_verified, evidence_count, evidence_completeness, evidence_consistency, response_time_hours, merchant_response_quality_score`
- **Categorical (1)**: `dispute_reason`
