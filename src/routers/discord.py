import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.core.config import settings
from src.db.session import get_db
from src.models.discord_link import DiscordLink
from src.models.mensagem import Mensagem
from src.models.responsavel import Responsavel
from src.services.discord_service import enviar_no_canal, verificar_assinatura

router = APIRouter()

PING = 1
APPLICATION_COMMAND = 2
MESSAGE_COMPONENT = 3

PONG = 1
CHANNEL_MESSAGE_WITH_SOURCE = 4


class ResponsavelCreate(BaseModel):
    nome: str
    email: str | None = None
    telefone: str | None = None


class MensagemTeste(BaseModel):
    texto: str


def _gerar_codigo() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


@router.post("/responsaveis")
def criar_responsavel(payload: ResponsavelCreate, db: Session = Depends(get_db)) -> dict:
    responsavel = Responsavel(nome=payload.nome, email=payload.email, telefone=payload.telefone)
    db.add(responsavel)
    db.commit()
    db.refresh(responsavel)
    return {"id": responsavel.id, "nome": responsavel.nome}


@router.post("/responsaveis/{responsavel_id}/discord-link")
def gerar_vinculo_discord(responsavel_id: int, db: Session = Depends(get_db)) -> dict:
    codigo = _gerar_codigo()
    link = DiscordLink(responsavel_id=responsavel_id, codigo=codigo, status="pendente")
    db.add(link)
    db.commit()
    return {
        "codigo": codigo,
        "instrucoes": (
            f"Entre no servidor do Discord e rode o comando /vincular codigo:{codigo}"
        ),
    }


@router.post("/discord/enviar-teste")
def enviar_mensagem_teste(payload: MensagemTeste, db: Session = Depends(get_db)) -> dict:
    mensagem = Mensagem(
        origem_tipo="teste",
        direcao="saida",
        conteudo=payload.texto,
        status="enfileirada",
    )
    db.add(mensagem)
    db.commit()

    try:
        id_externo = enviar_no_canal(settings.discord_canal_id, payload.texto)
        mensagem.status = "enviada"
        mensagem.id_externo = id_externo
    except RuntimeError as exc:
        mensagem.status = "falha"
        mensagem.conteudo = f"{payload.texto} | erro: {exc}"
    db.commit()
    return {"mensagem_id": mensagem.id, "status": mensagem.status, "id_externo": mensagem.id_externo}


def _registrar_interacao(db: Session, payload: dict, status: str) -> None:
    db.add(
        Mensagem(
            origem_tipo="interacao_recebida",
            direcao="entrada",
            payload_bruto=payload,
            status=status,
        )
    )
    db.commit()


def _tratar_vincular(db: Session, interaction: dict) -> dict:
    options = interaction["data"].get("options", [])
    codigo = next((o["value"] for o in options if o["name"] == "codigo"), None)
    discord_user_id = interaction["member"]["user"]["id"]

    link = db.query(DiscordLink).filter(DiscordLink.codigo == codigo).one_or_none()
    if link is None or link.status == "confirmado":
        conteudo = "Codigo invalido ou ja utilizado."
    else:
        link.discord_user_id = discord_user_id
        link.status = "confirmado"
        link.linked_at = datetime.now(timezone.utc)
        db.commit()
        conteudo = "Vinculo confirmado! Voce passara a receber avisos por aqui."

    return {"type": CHANNEL_MESSAGE_WITH_SOURCE, "data": {"content": conteudo}}


@router.post("/webhook/discord")
async def webhook_discord(request: Request, db: Session = Depends(get_db)) -> Response:
    body = await request.body()
    signature = request.headers.get("X-Signature-Ed25519", "")
    timestamp = request.headers.get("X-Signature-Timestamp", "")

    if not verificar_assinatura(settings.discord_public_key, signature, timestamp, body):
        return Response(status_code=401, content="assinatura invalida")

    interaction = await request.json()

    if interaction["type"] == PING:
        return _json_response({"type": PONG})

    if interaction["type"] == APPLICATION_COMMAND:
        if interaction["data"]["name"] == "vincular":
            resultado = _tratar_vincular(db, interaction)
            _registrar_interacao(db, interaction, "respondida")
            return _json_response(resultado)
        _registrar_interacao(db, interaction, "respondida")
        return _json_response({"type": CHANNEL_MESSAGE_WITH_SOURCE, "data": {"content": "Comando nao reconhecido."}})

    if interaction["type"] == MESSAGE_COMPONENT:
        _registrar_interacao(db, interaction, "respondida")
        return _json_response({"type": CHANNEL_MESSAGE_WITH_SOURCE, "data": {"content": "Confirmado!"}})

    return Response(status_code=400)


def _json_response(payload: dict) -> Response:
    import json

    return Response(content=json.dumps(payload), media_type="application/json")
