"""FastAPI AI/ML Gateway application for Samsung Guided Troubleshooting."""
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .models import ContextDeeplinkResponse, TroubleshootRequest
from .pipeline import generate_troubleshooting

app = FastAPI(
    title="Samsung Guided Troubleshooting - AI Gateway",
    description="Python AI Gateway providing grounded generation & deeplink retrieval.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", status_code=status.HTTP_200_OK)
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "ai-gateway"}


@app.post("/internal/troubleshoot", response_model=ContextDeeplinkResponse)
async def internal_troubleshoot(request: TroubleshootRequest) -> ContextDeeplinkResponse:
    try:
        response = await generate_troubleshooting(request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Troubleshooting pipeline execution error: {str(e)}",
        )


@app.post("/v1/troubleshoot", response_model=ContextDeeplinkResponse)
async def troubleshoot_v1(request: TroubleshootRequest) -> ContextDeeplinkResponse:
    return await internal_troubleshoot(request)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
