"""customer_treetiti/main.py – minimal onboard scaffold (FastAPI router).
Mount in treetiti-ai-os backend: app.include_router(router, prefix="/api/v1/directory")
"""
from fastapi import APIRouter
from pydantic import BaseModel, HttpUrl
from uuid import uuid4

router = APIRouter(tags=["directory"])

class OnboardIn(BaseModel):
    link: HttpUrl
    business_one_liner: str = ""
    dream_customer: str = ""
    goal: str = "leads"
    competitors: str = ""
    tone: str = "premium minimal confident"

@router.post("/onboard")
def onboard(body: OnboardIn):
    client_id = str(uuid4())
    # TODO: persist ClientProfile to DB, enqueue pipeline in app/services/directory.py
    return {"client_id": client_id, "status": "queued", "next": f"/api/v1/directory/{client_id}"}

@router.get("/directory/{client_id}")
def dossier(client_id: str):
    # TODO: return assembled dossier index from /dossier/<id>/99_qa_report.md
    return {"client_id": client_id, "dossier": [], "status": "collecting_research"}
