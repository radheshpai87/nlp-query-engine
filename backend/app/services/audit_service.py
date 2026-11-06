import csv
import io
import json
from typing import Any

from fastapi import Depends

from app.core.logging import setup_logging
from app.core.security import redact_connection_string
from app.models.audit import AuditEvent
from app.repositories.audit_repository import AuditRepository, get_audit_repository

logger = setup_logging()


class AuditService:
    def __init__(self, audit_repo: AuditRepository | None = None) -> None:
        self.audit_repo = audit_repo or AuditRepository()

    def log_event(
        self,
        workspace_id: str,
        action: str,
        resource_type: str,
        user_id: str | None = None,
        resource_id: str | None = None,
        details: dict[str, Any] | None = None,
        ip_address: str | None = None,
        status: str = "SUCCESS",
    ) -> AuditEvent:
        """Record an immutable, cryptographically chained auditable event."""
        # 1. Sanitize sensitive credentials and connection strings from details
        clean_details: dict[str, Any] = {}
        if details:
            for k, v in details.items():
                if isinstance(v, str):
                    clean_details[k] = redact_connection_string(v)
                elif isinstance(v, dict):
                    clean_details[k] = {
                        sub_k: redact_connection_string(sub_v) if isinstance(sub_v, str) else sub_v
                        for sub_k, sub_v in v.items()
                    }
                else:
                    clean_details[k] = v

        # 2. Get previous event in workspace to maintain cryptographic chain
        last_event = self.audit_repo.get_last_event(workspace_id)
        next_sequence = (
            (last_event.sequence + 1)
            if (last_event and getattr(last_event, "sequence", None))
            else 1
        )
        prev_hash = (
            str(last_event.event_hash)
            if (last_event and getattr(last_event, "event_hash", None) and isinstance(last_event.event_hash, str))
            else "GENESIS"
        )

        event = AuditEvent(
            workspace_id=workspace_id,
            sequence=next_sequence,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=clean_details,
            ip_address=ip_address,
            status=status,
            previous_hash=prev_hash,
        )
        # Compute tamper-evident hash
        event.event_hash = event.compute_hash(prev_hash)

        saved = self.audit_repo.create(event)
        logger.info(
            "AUDIT [%s] action=%s resource=%s/%s user=%s status=%s hash=%s",
            workspace_id,
            action,
            resource_type,
            resource_id or "-",
            user_id or "system",
            status,
            (event.event_hash[:8] + "...") if event.event_hash else "-",
        )
        return saved

    def get_events(self, workspace_id: str, limit: int = 100) -> list[AuditEvent]:
        return self.audit_repo.get_by_workspace(workspace_id, limit=limit)

    def query_events(
        self,
        workspace_id: str,
        action: str | None = None,
        resource_type: str | None = None,
        user_id: str | None = None,
        status: str | None = None,
        search: str | None = None,
        limit: int = 50,
        skip: int = 0,
    ) -> tuple[list[AuditEvent], int]:
        """Search and paginate audit trail records."""
        return self.audit_repo.query_events(
            workspace_id=workspace_id,
            action=action,
            resource_type=resource_type,
            user_id=user_id,
            status=status,
            search=search,
            limit=limit,
            skip=skip,
        )

    def verify_integrity(self, workspace_id: str) -> dict[str, Any]:
        """Validate cryptographic tamper-evidence and chain linkage across all workspace events."""
        events = self.audit_repo.get_chronological_events(workspace_id)
        if not events:
            return {
                "is_valid": True,
                "total_events_checked": 0,
                "tampered_event_ids": [],
                "message": "Audit log is empty; chain integrity intact.",
            }

        tampered_ids: list[str] = []
        expected_prev_hash = "GENESIS"

        for _idx, evt in enumerate(events):
            # Check 1: Chain continuity
            if evt.previous_hash and evt.previous_hash != expected_prev_hash:
                tampered_ids.append(evt.id)

            # Check 2: Event hash recalculation matches stored hash
            computed = evt.compute_hash(evt.previous_hash)
            if evt.event_hash and evt.event_hash != computed:
                if evt.id not in tampered_ids:
                    tampered_ids.append(evt.id)

            expected_prev_hash = evt.event_hash or computed

        return {
            "is_valid": len(tampered_ids) == 0,
            "total_events_checked": len(events),
            "tampered_event_ids": tampered_ids,
            "message": (
                "All audit events verified against cryptographic hash chain."
                if len(tampered_ids) == 0
                else f"Integrity check failed: {len(tampered_ids)} tampered event(s) found."
            ),
        }

    def export_events(self, workspace_id: str, export_format: str = "json") -> str:
        """Export workspace audit events as JSON or CSV formatted string."""
        events = self.audit_repo.get_by_workspace(workspace_id, limit=5000)

        if export_format.lower() == "csv":
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow([
                "ID",
                "Timestamp",
                "Action",
                "Actor User ID",
                "Resource Type",
                "Resource ID",
                "Status",
                "IP Address",
                "Event Hash",
                "Details",
            ])
            for e in events:
                writer.writerow([
                    e.id,
                    e.created_at.isoformat(),
                    e.action,
                    e.user_id or "",
                    e.resource_type,
                    e.resource_id or "",
                    e.status,
                    e.ip_address or "",
                    e.event_hash or "",
                    json.dumps(e.details),
                ])
            return output.getvalue()

        # Default JSON
        return json.dumps([e.model_dump(mode="json") for e in events], indent=2)


def get_audit_service(audit_repo: AuditRepository = Depends(get_audit_repository)) -> AuditService:
    return AuditService(audit_repo=audit_repo)
