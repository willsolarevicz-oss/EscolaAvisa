from fastapi import FastAPI

from src.routers.discord import router as discord_router

app = FastAPI(title="EscolaAvisa API")
app.include_router(discord_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
