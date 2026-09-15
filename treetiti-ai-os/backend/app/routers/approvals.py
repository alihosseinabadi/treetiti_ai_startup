"""TREEtiti AI Marketing OS — approval routes (spec §18, plan §L).

    GET    /api/v1/approvals              list approvals (pending/approved/rejected)
    POST   /api/v1/approvals              request an approval gate
    GET    /api/v1/approvals/{id}         fetch one approval
    POST   /api/v1/approvals/{id}/decide  approve or reject
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user
from app.database import SessionLocal
from app.models import Approval, User

router = APIRouter(prefix="/approvals", tags=["approvals"])

KINDS = {"publish", "spend", "delete", "edit"}


class ApprovalCreate(BaseModel):
    kind: str
    title: str
    summary: str = ""
    payload: dict = {}
    requested_by: str = "agent"


class ApprovalDecide(BaseModel):
    decision: str  # approve | reject
    note: str = ""


@router.get("")
def list_approvals(
    user: Annotated[User, Depends(get_current_user)],
    status: str = "",
) -> list[dict]:
    with SessionLocal() as db:
        q = db.query(Approval)
        if status:
            q = q.filter(Approval.status == status)
        rows = q.order_by(Approval.created_at.desc()).limit(100).all()
        return [_approval_dict(a) for a in rows]


@router.post("")
def request_approval(
    payload: ApprovalCreate,
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    if payload.kind not in KINDS:
        raise HTTPException(status_code=400, detail=f"kind must be one of {sorted(KINDS)}")
    with SessionLocal() as db:
        a = Approval(
            kind=payload.kind,
            title=payload.title,
            summary=payload.summary,
            payload=payload.payload,
            requested_by=payload.requested_by,
        )
        db.add(a)
        db.commit()
        db.refresh(a)
        return _approval_dict(a)


@router.get("/{approval_id}")
def get_approval(
    approval_id: str,
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    with SessionLocal() as db:
        a = db.get(Approval, approval_id)
        if a is None:
            raise HTTPException(status_code=404, detail="approval not found")
        return _approval_dict(a)


@router.post("/{approval_id}/decide")
def decide_approval(
    approval_id: str,
    payload: ApprovalDecide,
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    if payload.decision not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="decision must be 'approve' or 'reject'")
    with SessionLocal() as db:
        a = db.get(Approval, approval_id)
        if a is None:
            raise HTTPException(status_code=404, detail="approval not found")
        if a.status != "pending":
            raise HTTPException(status_code=409, detail=f"approval already {a.status}")
        a.status = "approved" if payload.decision == "approve" else "rejected"
        a.decision_note = payload.note
        a.reviewed_by = user.email if user.email else "human"
        a.reviewed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(a)
        out = _approval_dict(a)
    _emit_decision(out, payload.note)
    # Side-effect: approving a publish/delete/etc. actually runs the action.
    _run_approved_action(out, payload.note)
    return out


def _emit_decision(approval: dict, note: str) -> None:
    from app.core.events import APPROVED, REJECTED, emit

    name = APPROVED if approval["status"] == "approved" else REJECTED
    emit(
        name,
        source="approvals",
        workflow_id=approval["id"],
        payload={"approval_id": approval["id"], "kind": approval["kind"], "note": note},
    )


def _run_approved_action(approval: dict, note: str) -> None:
    """Human approved → run the referenced action on the background queue.

    ``publish`` approvals carry the content item id; approving enqueues the
    Social Manager to publish it. Best-effort: never raises out of the route.
    """
    from app.core.task_queue import get_queue

    if approval["status"] != "approved":
        return
    kind = approval.get("kind", "")
    payload = approval.get("payload") or {}
    try:
        q = get_queue()
        if kind == "publish" and payload.get("content_id"):
            from app.core.task_queue import agent_runner

            q.register("agent", agent_runner)
            q.enqueue(
                "agent",
                label=f"publish after approval: {approval['title'][:50]}",
                payload={
                    "agent": "social_manager",
                    "kwargs": {
                        "brief": f"Publish approved content {payload['content_id']} ({approval['title']}).",
                        "channels": payload.get("channels", []),
                        "extra_context": note,
                    },
                },
            )
        elif kind == "edit" and payload.get("content_id"):
            from app.core.task_queue import agent_runner

            q.register("agent", agent_runner)
            q.enqueue(
                "agent",
                label=f"revise after approval note: {approval['title'][:50]}",
                payload={
                    "agent": "content",
                    "kwargs": {
                        "idea": approval["title"],
                        "extra_context": f"Revise per reviewer note: {note}",
                    },
                },
            )
    except Exception:  # noqa: BLE001  (side-effects are best-effort)
        import logging

        logging.getLogger("treetiti.approvals").exception("approval side-effect failed")


def _approval_dict(a: Approval) -> dict:
    return {
        "id": a.id,
        "kind": a.kind,
        "title": a.title,
        "summary": a.summary,
        "payload": a.payload,
        "status": a.status,
        "requested_by": a.requested_by,
        "reviewed_by": a.reviewed_by,
        "decision_note": a.decision_note,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "reviewed_at": a.reviewed_at.isoformat() if a.reviewed_at else None,
    }