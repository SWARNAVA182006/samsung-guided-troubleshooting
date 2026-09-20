from fastapi import FastAPI
from app.api.routes import router as api_router
from app.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Samsung PRISM Gen AI Hackathon 3.0 - Theme 2: Guided Troubleshooting Scaffolding",
    version="0.1.0",
)

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
