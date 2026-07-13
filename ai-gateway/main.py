import os
from fastapi import FastAPI

# Health (unversioned)
from routes.health import router as health_router

# v1 routes
from routes.v1.chat import router as chat_v1_router
from routes.v1.generate import router as generate_v1_router
from routes.v1.proposals import router as proposals_v1_router
from routes.models import router as models_router
from routes.prompts import router as prompts_router

# v2 stubs (identical contract for now, demonstrates versioning architecture)
from routes.v2.chat import router as chat_v2_router
from routes.v2.generate import router as generate_v2_router

app = FastAPI(title="AI Gateway", version="2.0.0")

app.include_router(health_router)

# v1
app.include_router(chat_v1_router)
app.include_router(generate_v1_router)
app.include_router(proposals_v1_router)
app.include_router(models_router)
app.include_router(prompts_router)

# v2 (versioned endpoints)
app.include_router(chat_v2_router)
app.include_router(generate_v2_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8100"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
