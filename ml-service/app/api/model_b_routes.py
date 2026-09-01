from fastapi import APIRouter, HTTPException, status
from app.schemas.model_b import ModelBPredictionInput, ModelBPredictionResponse
from app.services.model_b_service import ModelBService

router = APIRouter(tags=["Model B — Chargeback Defense"])

@router.post(
    "/predict/defense-success",
    response_model=ModelBPredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict Chargeback Defense Recovery Probability"
)
def predict_defense_success(payload: ModelBPredictionInput):
    try:
        service = ModelBService.get_instance()
        data_dict = payload.model_dump()
        
        prob, defense_score, recommendation, version = service.predict_defense_success(data_dict)

        return ModelBPredictionResponse(
            probability=round(prob, 4),
            defense_score=defense_score,
            recommendation=recommendation,
            model_version=version
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Defense prediction error: {str(e)}"
        )

@router.get(
    "/model/model-b/metrics",
    status_code=status.HTTP_200_OK,
    summary="Retrieve Model B Evaluation Metrics"
)
def get_model_b_metrics():
    try:
        service = ModelBService.get_instance()
        return {
            "status": "ok",
            "data": service.get_metrics()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load Model B metrics: {str(e)}"
        )
