from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from src.db.base import Base


class DiscordLink(Base):
    __tablename__ = "discord_links"

    id: Mapped[int] = mapped_column(primary_key=True)
    responsavel_id: Mapped[int] = mapped_column(ForeignKey("responsaveis.id"), unique=True)
    codigo: Mapped[str] = mapped_column(String(12), unique=True)
    discord_user_id: Mapped[str | None] = mapped_column(String(30), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pendente")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    linked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
