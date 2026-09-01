import os
import json
import datetime
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
    classification_report
)

def main():
    print("=" * 70)
    print("AI RISK MANAGER — MODEL A: TRANSACTION CHARGEBACK RISK TRAINING")
    print("=" * 70)

    # 1. Dataset Verification
    data_path = os.path.join("dataset", "model_a_dataset.csv")
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at {data_path}. Must be generated first.")

    print(f"\n[1] Loading dataset from: {data_path}")
    df = pd.read_csv(data_path)
    print(f"Total dataset shape: {df.shape}")

    # 2. Features Definition
    numerical_features = [
        "account_age_days",
        "total_orders",
        "successful_orders",
        "cancelled_orders",
        "previous_returns",
        "previous_refunds",
        "previous_chargebacks",
        "customer_chargeback_rate",
        "customer_return_rate",
        "average_order_value",
        "transaction_amount",
        "transaction_hour",
        "is_international",
        "orders_last_24h",
        "amount_vs_customer_avg",
        "device_age_days",
        "multiple_accounts_same_device",
        "ip_country_match",
        "billing_shipping_match",
        "login_after_purchase",
        "product_shipped",
        "delivery_confirmed",
        "otp_verified",
        "tracking_available"
    ]

    categorical_features = [
        "payment_method"
    ]

    target_col = "chargeback_occurred"

    all_features = numerical_features + categorical_features
    print(f"Features: {len(numerical_features)} numerical, {len(categorical_features)} categorical = {len(all_features)} total")

    X = df[all_features]
    y = df[target_col]

    # 3. Train / Validation / Held-out Test Split (70% / 15% / 15%)
    print("\n[2] Splitting into Train (70%), Validation (15%), and Held-out Test (15%)...")
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )

    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=0.17647, random_state=42, stratify=y_train_val
    ) # 0.17647 * 0.85 approx 0.15 of total

    print(f"Train set: {X_train.shape[0]} samples")
    print(f"Validation set: {X_val.shape[0]} samples")
    print(f"Held-out Test set: {X_test.shape[0]} samples")

    # 4. Preprocessing Pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numerical_features),
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features)
        ]
    )

    # 5. Candidate Models Definition
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1),
        "XGBoost": XGBClassifier(n_estimators=120, max_depth=6, learning_rate=0.08, random_state=42, eval_metric="logloss")
    }

    results = {}
    fitted_pipelines = {}

    print("\n[3] Training and Validating Candidate Models...")
    print("-" * 70)

    for name, clf in models.items():
        print(f"\nTraining {name}...")
        pipeline = Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("classifier", clf)
        ])

        pipeline.fit(X_train, y_train)
        fitted_pipelines[name] = pipeline

        # Validation predictions
        val_probs = pipeline.predict_proba(X_val)[:, 1]
        val_preds = (val_probs >= 0.5).astype(int)

        val_precision = precision_score(y_val, val_preds)
        val_recall = recall_score(y_val, val_preds)
        val_f1 = f1_score(y_val, val_preds)
        val_roc_auc = roc_auc_score(y_val, val_probs)
        val_pr_auc = average_precision_score(y_val, val_probs)

        results[name] = {
            "val_precision": float(val_precision),
            "val_recall": float(val_recall),
            "val_f1": float(val_f1),
            "val_roc_auc": float(val_roc_auc),
            "val_pr_auc": float(val_pr_auc)
        }

        print(f"[{name}] Validation Results:")
        print(f"  Precision : {val_precision:.4f}")
        print(f"  Recall    : {val_recall:.4f}")
        print(f"  F1 Score  : {val_f1:.4f}")
        print(f"  ROC-AUC   : {val_roc_auc:.4f}")
        print(f"  PR-AUC    : {val_pr_auc:.4f}")

    # 6. Best Model Selection (Ranked by PR-AUC & ROC-AUC)
    best_model_name = max(results, key=lambda k: (results[k]["val_roc_auc"] + results[k]["val_pr_auc"]))
    best_pipeline = fitted_pipelines[best_model_name]
    print("\n" + "=" * 70)
    print(f"BEST MODEL SELECTED: {best_model_name}")
    print("=" * 70)

    # 7. Final Evaluation on Real Held-out Test Set
    print("\n[4] Evaluating Best Model on Held-out Test Set...")
    test_probs = best_pipeline.predict_proba(X_test)[:, 1]

    # Select optimal decision threshold (e.g. searching for max F1 on validation or default 0.5)
    best_threshold = 0.50
    test_preds = (test_probs >= best_threshold).astype(int)

    test_precision = precision_score(y_test, test_preds)
    test_recall = recall_score(y_test, test_preds)
    test_f1 = f1_score(y_test, test_preds)
    test_roc_auc = roc_auc_score(y_test, test_probs)
    test_pr_auc = average_precision_score(y_test, test_probs)
    cm = confusion_matrix(y_test, test_preds).tolist()

    print(f"\n--- HELD-OUT TEST METRICS ({best_model_name}) ---")
    print(f"Decision Threshold : {best_threshold}")
    print(f"Precision          : {test_precision:.4f}")
    print(f"Recall             : {test_recall:.4f}")
    print(f"F1 Score           : {test_f1:.4f}")
    print(f"ROC-AUC            : {test_roc_auc:.4f}")
    print(f"PR-AUC             : {test_pr_auc:.4f}")
    print(f"Confusion Matrix   :\n  TN: {cm[0][0]}, FP: {cm[0][1]}\n  FN: {cm[1][0]}, TP: {cm[1][1]}")

    # 8. Save Model and Metadata
    os.makedirs("models", exist_ok=True)
    model_save_path = os.path.join("models", "model_a.pkl")
    metadata_save_path = os.path.join("models", "model_a_metadata.json")

    joblib.dump(best_pipeline, model_save_path)
    print(f"\n[5] Model artifact saved to: {model_save_path}")

    metadata = {
        "model_name": "Model A — Transaction Chargeback Risk Prediction",
        "algorithm": best_model_name,
        "version": "v1.0.0",
        "training_date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "dataset_path": data_path,
        "total_samples": len(df),
        "train_samples": len(X_train),
        "val_samples": len(X_val),
        "test_samples": len(X_test),
        "features": {
            "numerical": numerical_features,
            "categorical": categorical_features,
            "all_features": all_features
        },
        "target": target_col,
        "selected_threshold": best_threshold,
        "comparison_results": results,
        "test_metrics": {
            "precision": float(test_precision),
            "recall": float(test_recall),
            "f1_score": float(test_f1),
            "roc_auc": float(test_roc_auc),
            "pr_auc": float(test_pr_auc),
            "confusion_matrix": cm
        }
    }

    with open(metadata_save_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"Metadata saved to: {metadata_save_path}")

    # 9. Create Evaluation Report Markdown
    report_path = os.path.join("models", "model_a_evaluation_report.md")
    report_content = f"""# Model A: Transaction Chargeback Risk Prediction — Evaluation Report

## 1. Overview
- **Model**: {metadata['model_name']}
- **Algorithm**: {best_model_name}
- **Version**: {metadata['version']}
- **Training Timestamp**: {metadata['training_date']}
- **Dataset**: `{data_path}` ({len(df):,} total transactions)

---

## 2. Train / Validation / Test Splits
- **Training Set**: {len(X_train):,} samples (70%)
- **Validation Set**: {len(X_val):,} samples (15%)
- **Held-out Test Set**: {len(X_test):,} samples (15%)
- **Target Balance**: 50.0% Chargeback / 50.0% Non-Chargeback

---

## 3. Model Comparison on Validation Set

| Model Candidate | Precision | Recall | F1 Score | ROC-AUC | PR-AUC |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Logistic Regression** | {results['Logistic Regression']['val_precision']:.4f} | {results['Logistic Regression']['val_recall']:.4f} | {results['Logistic Regression']['val_f1']:.4f} | {results['Logistic Regression']['val_roc_auc']:.4f} | {results['Logistic Regression']['val_pr_auc']:.4f} |
| **Random Forest** | {results['Random Forest']['val_precision']:.4f} | {results['Random Forest']['val_recall']:.4f} | {results['Random Forest']['val_f1']:.4f} | {results['Random Forest']['val_roc_auc']:.4f} | {results['Random Forest']['val_pr_auc']:.4f} |
| **XGBoost** | {results['XGBoost']['val_precision']:.4f} | {results['XGBoost']['val_recall']:.4f} | {results['XGBoost']['val_f1']:.4f} | {results['XGBoost']['val_roc_auc']:.4f} | {results['XGBoost']['val_pr_auc']:.4f} |

---

## 4. Final Held-Out Test Evaluation ({best_model_name})

- **Decision Threshold**: `{best_threshold}`
- **Precision**: `{test_precision:.4f}`
- **Recall**: `{test_recall:.4f}`
- **F1 Score**: `{test_f1:.4f}`
- **ROC-AUC**: `{test_roc_auc:.4f}`
- **PR-AUC**: `{test_pr_auc:.4f}`

### Confusion Matrix (Test Set: {len(X_test):,} transactions)
- **True Negatives (TN)**: {cm[0][0]:,}
- **False Positives (FP)**: {cm[0][1]:,}
- **False Negatives (FN)**: {cm[1][0]:,}
- **True Positives (TP)**: {cm[1][1]:,}

---

## 5. Input Feature Schema ({len(all_features)} Features)
- **Numerical ({len(numerical_features)})**: `{", ".join(numerical_features)}`
- **Categorical ({len(categorical_features)})**: `{", ".join(categorical_features)}`
"""

    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_content)

    print(f"Evaluation report written to: {report_path}")
    print("\n" + "=" * 70)
    print("MODEL A TRAINING & EVALUATION COMPLETED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    main()
