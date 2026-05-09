from app.models import ModerationStatus


class ModerationService:
    def moderate(self, *values: str | None) -> ModerationStatus:
        haystack = " ".join(value or "" for value in values).lower()
        if "blocked" in haystack:
            return ModerationStatus.blocked
        return ModerationStatus.approved
