import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.api.model_a_routes import router as model_a_router
from app.api.model_b_routes import router as model_b_router

load_dotenv()

app = FastAPI(
    title="AI Risk Manager ML Service",
    description="Microservice hosting Model A (Chargeback Risk) and Model B (Dispute Defense)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "AI Risk Manager ML Service"
    }

# Register Model A & Model B routers
app.include_router(model_a_router)
app.include_router(model_b_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
