"""TREEtiti AI Marketing OS — per-agent custom instructions (Phase 6).

The owner can teach an agent a persistent rule from chat ("update the content
agent: always write in a friendly tone") or from the Agents page. Each
instruction is stored against the agent key and injected into the agent's
system prompt at run time (see ``BaseAgent._system``), so the whole team — chat
runs, missions, schedules and CEO delegations — obeys it until changed.

Everything degrades gracefully: with no DB rows, agents behave exactly as
before, and a broken store never breaks an agent run.
"""

from __future__ import annotations

import logging

logger = logging.getLogger("treetiti.agent_instructions")


def set_instruction(agent: str, instruction: str, db) -> str:
    """Create or update the instruction for one agent key. Returns agent key."""
    from app.models import AgentInstruction

    row = db.query(AgentInstruction).filter(AgentInstruction.agent == agent).first()
    if row is None:
        row = AgentInstruction(agent=agent, instruction=instruction)
        db.add(row)
    else:
        row.instruction = instruction
    db.commit()
    return agent


def get_instruction(agent: str, db) -> str:
    from app.models import AgentInstruction

    row = db.query(AgentInstruction).filter(AgentInstruction.agent == agent).first()
    return (row.instruction if row is not None else "").strip()


def clear_instruction(agent: str, db) -> bool:
    """Remove an agent's custom instruction. Returns True when one was removed."""
    from app.models import AgentInstruction

    row = db.query(AgentInstruction).filter(AgentInstruction.agent == agent).first()
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


def list_instructions(db) -> list[dict]:
    from app.models import AgentInstruction

    rows = db.query(AgentInstruction).order_by(AgentInstruction.agent).all()
    return [
        {
            "agent": r.agent,
            "instruction": r.instruction,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]


def instructions_for(agent: str) -> str:
    """The custom instruction for an agent, fetched with a short-lived session.

    Used by ``BaseAgent._system`` where no DB session is in scope. Best-effort:
    any failure returns "" so agents never crash over an instruction lookup.
    """
    try:
        from app.database import SessionLocal  # noqa: PLC0415

        with SessionLocal() as db:
            return get_instruction(agent, db)
    except Exception as exc:  # noqa: BLE001
        logger.warning("could not load instructions for %s: %s", agent, exc)
        return ""
