from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from src.db.base import Base


class Mensagem(Base):
    __tablename__ = "mensagens"

    id: Mapped[int] = mapped_column(primary_key=True)
    responsavel_id: Mapped[int | None] = mapped_column(ForeignKey("responsaveis.id"), nullable=True)
    discord_user_id: Mapped[str | None] = mapped_column(String(30), nullable=True)
    origem_tipo: Mapped[str] = mapped_column(String(30))
    origem_id: Mapped[int | None] = mapped_column(nullable=True)
    direcao: Mapped[str] = mapped_column(String(10))
    conteudo: Mapped[str | None] = mapped_column(String, nullable=True)
    id_externo: Mapped[str | None] = mapped_column(String(30), nullable=True)
    payload_bruto: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="enfileirada")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
