from fastapi import APIRouter, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.pipeline import generate_troubleshooting
from app.schemas.models import ContextDeeplinkResponse, TroubleshootRequest

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK)
def health_check() -> dict[str, str]:
    """Health check endpoint to verify AI gateway status."""
    return {"status": "ok", "service": "ai-gateway"}


@router.post("/internal/troubleshoot", response_model=ContextDeeplinkResponse)
async def internal_troubleshoot(request: TroubleshootRequest) -> ContextDeeplinkResponse:
    """Internal AI Gateway troubleshooting endpoint."""
    try:
        response = await generate_troubleshooting(request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Troubleshooting execution error: {str(e)}",
        )


@router.post("/v1/troubleshoot", response_model=ContextDeeplinkResponse)
async def troubleshoot_v1(request: TroubleshootRequest) -> ContextDeeplinkResponse:
    """v1 troubleshooting endpoint."""
    return await internal_troubleshoot(request)
