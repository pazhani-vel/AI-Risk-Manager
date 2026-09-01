import os
import json
import joblib
import pandas as pd
from typing import Dict, Any, Tuple

class ModelBService:
    _instance = None
    _pipeline = None
    _metadata = None

    def __init__(self):
        self.load_model()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_model(self):
        possible_model_paths = [
            os.path.join("..", "models", "model_b.pkl"),
            os.path.join("models", "model_b.pkl"),
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "models", "model_b.pkl")
        ]

        model_path = None
        for p in possible_model_paths:
            if os.path.exists(p):
                model_path = p
                break

        if model_path is None:
            raise FileNotFoundError("Model B artifact (model_b.pkl) not found. Run training first.")

        metadata_path = model_path.replace(".pkl", "_metadata.json")
        if not os.path.exists(metadata_path):
            raise FileNotFoundError(f"Model B metadata ({metadata_path}) not found.")

        self._pipeline = joblib.load(model_path)
        with open(metadata_path, "r", encoding="utf-8") as f:
            self._metadata = json.load(f)

    def get_metrics(self) -> Dict[str, Any]:
        if self._metadata is None:
            self.load_model()
        return {
            "model_name": self._metadata.get("model_name"),
            "algorithm": self._metadata.get("algorithm"),
            "version": self._metadata.get("version"),
            "training_date": self._metadata.get("training_date"),
            "selected_threshold": self._metadata.get("selected_threshold"),
            "test_metrics": self._metadata.get("test_metrics")
        }

    def predict_defense_success(self, feature_dict: Dict[str, Any]) -> Tuple[float, float, str, str]:
        if self._pipeline is None:
            self.load_model()

        ordered_features = self._metadata.get("features", {}).get("all_features")
        if not ordered_features:
            ordered_features = list(feature_dict.keys())

        df_input = pd.DataFrame([feature_dict])[ordered_features]

        # Single inference pass without re-training
        probabilities = self._pipeline.predict_proba(df_input)
        defense_prob = float(probabilities[0, 1])

        defense_score = round(defense_prob * 100.0, 2)

        # Calibrated recommendations
        # Thresholds: >= 65% Strong, 40-64.9% Review Required, < 40% Weak
        if defense_prob >= 0.65:
            recommendation = "STRONG_DEFENSE"
        elif defense_prob >= 0.40:
            recommendation = "REVIEW_REQUIRED"
        else:
            recommendation = "WEAK_DEFENSE"

        version = self._metadata.get("version", "v1.0.0")

        return defense_prob, defense_score, recommendation, version
