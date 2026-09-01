from fastapi import APIRouter, HTTPException, status
from app.schemas.model_a import ModelAPredictionInput, ModelAPredictionResponse
from app.services.model_a_service import ModelAService

router = APIRouter(tags=["Model A — Chargeback Risk"])

@router.post(
    "/predict/chargeback-risk",
    response_model=ModelAPredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict Transaction Chargeback Risk"
)
def predict_chargeback_risk(payload: ModelAPredictionInput):
    try:
        service = ModelAService.get_instance()
        data_dict = payload.model_dump()
        amount = data_dict["transaction_amount"]
        
        prob, risk_score, risk_level, expected_loss, version = service.predict_risk(data_dict, amount)

        return ModelAPredictionResponse(
            probability=round(prob, 4),
            risk_score=risk_score,
            risk_level=risk_level,
            expected_loss=expected_loss,
            model_version=version
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {str(e)}"
        )

@router.get(
    "/model/model-a/metrics",
    status_code=status.HTTP_200_OK,
    summary="Retrieve Model A Evaluation Telemetry"
)
def get_model_a_metrics():
    try:
        service = ModelAService.get_instance()
        return {
            "status": "ok",
            "data": service.get_metrics()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load metrics: {str(e)}"
        )
