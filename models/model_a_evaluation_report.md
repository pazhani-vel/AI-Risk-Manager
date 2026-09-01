# Model A: Transaction Chargeback Risk Prediction — Evaluation Report

## 1. Overview
- **Model**: Model A — Transaction Chargeback Risk Prediction
- **Algorithm**: Logistic Regression
- **Version**: v1.0.0
- **Training Timestamp**: 2026-08-30T15:17:55.478881+00:00
- **Dataset**: `dataset\model_a_dataset.csv` (50,000 total transactions)

---

## 2. Train / Validation / Test Splits
- **Training Set**: 35,000 samples (70%)
- **Validation Set**: 7,500 samples (15%)
- **Held-out Test Set**: 7,500 samples (15%)
- **Target Balance**: 50.0% Chargeback / 50.0% Non-Chargeback

---

## 3. Model Comparison on Validation Set

| Model Candidate | Precision | Recall | F1 Score | ROC-AUC | PR-AUC |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Logistic Regression** | 0.6503 | 0.5672 | 0.6059 | 0.6744 | 0.6854 |
| **Random Forest** | 0.6450 | 0.5440 | 0.5902 | 0.6647 | 0.6730 |
| **XGBoost** | 0.6430 | 0.5547 | 0.5956 | 0.6641 | 0.6746 |

---

## 4. Final Held-Out Test Evaluation (Logistic Regression)

- **Decision Threshold**: `0.5`
- **Precision**: `0.6477`
- **Recall**: `0.5589`
- **F1 Score**: `0.6001`
- **ROC-AUC**: `0.6758`
- **PR-AUC**: `0.6891`

### Confusion Matrix (Test Set: 7,500 transactions)
- **True Negatives (TN)**: 2,610
- **False Positives (FP)**: 1,140
- **False Negatives (FN)**: 1,654
- **True Positives (TP)**: 2,096

---

## 5. Input Feature Schema (25 Features)
- **Numerical (24)**: `account_age_days, total_orders, successful_orders, cancelled_orders, previous_returns, previous_refunds, previous_chargebacks, customer_chargeback_rate, customer_return_rate, average_order_value, transaction_amount, transaction_hour, is_international, orders_last_24h, amount_vs_customer_avg, device_age_days, multiple_accounts_same_device, ip_country_match, billing_shipping_match, login_after_purchase, product_shipped, delivery_confirmed, otp_verified, tracking_available`
- **Categorical (1)**: `payment_method`
