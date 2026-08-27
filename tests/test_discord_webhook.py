import json

from fastapi.testclient import TestClient

from src.main import app
from src.models.discord_link import DiscordLink
from src.models.responsavel import Responsavel

client = TestClient(app)


def _assinar(signing_key, timestamp: str, body: bytes) -> str:
    return signing_key.sign(timestamp.encode() + body).signature.hex()


def test_ping_com_assinatura_valida_responde_pong(signing_key, db_session):
    body = json.dumps({"type": 1, "id": "1", "application_id": "1"}).encode()
    timestamp = "1786622400"
    assinatura = _assinar(signing_key, timestamp, body)

    resp = client.post(
        "/webhook/discord",
        content=body,
        headers={
            "X-Signature-Ed25519": assinatura,
            "X-Signature-Timestamp": timestamp,
            "Content-Type": "application/json",
        },
    )

    assert resp.status_code == 200
    assert resp.json() == {"type": 1}


def test_assinatura_adulterada_retorna_401(signing_key, db_session):
    body = json.dumps({"type": 1, "id": "1", "application_id": "1"}).encode()
    timestamp = "1786622400"
    assinatura_valida = _assinar(signing_key, timestamp, body)
    assinatura_adulterada = "ff" + assinatura_valida[2:]

    resp = client.post(
        "/webhook/discord",
        content=body,
        headers={
            "X-Signature-Ed25519": assinatura_adulterada,
            "X-Signature-Timestamp": timestamp,
            "Content-Type": "application/json",
        },
    )

    assert resp.status_code == 401


def test_comando_vincular_com_codigo_valido_confirma_link(signing_key, db_session):
    responsavel = Responsavel(nome="Ana Souza", email="ana@example.com")
    db_session.add(responsavel)
    db_session.commit()

    link = DiscordLink(responsavel_id=responsavel.id, codigo="482913", status="pendente")
    db_session.add(link)
    db_session.commit()

    interaction = {
        "type": 2,
        "id": "1310000000000000002",
        "guild_id": "1",
        "channel_id": "1",
        "member": {"user": {"id": "5566778899", "username": "ana"}},
        "data": {"name": "vincular", "options": [{"name": "codigo", "type": 3, "value": "482913"}]},
    }
    body = json.dumps(interaction).encode()
    timestamp = "1786622400"
    assinatura = _assinar(signing_key, timestamp, body)

    resp = client.post(
        "/webhook/discord",
        content=body,
        headers={
            "X-Signature-Ed25519": assinatura,
            "X-Signature-Timestamp": timestamp,
            "Content-Type": "application/json",
        },
    )

    assert resp.status_code == 200
    assert "confirmado" in resp.json()["data"]["content"].lower()

    db_session.refresh(link)
    assert link.status == "confirmado"
    assert link.discord_user_id == "5566778899"


def test_comando_vincular_com_codigo_invalido_nao_confirma(signing_key, db_session):
    interaction = {
        "type": 2,
        "id": "2",
        "guild_id": "1",
        "channel_id": "1",
        "member": {"user": {"id": "111", "username": "bob"}},
        "data": {"name": "vincular", "options": [{"name": "codigo", "type": 3, "value": "000000"}]},
    }
    body = json.dumps(interaction).encode()
    timestamp = "1786622400"
    assinatura = _assinar(signing_key, timestamp, body)

    resp = client.post(
        "/webhook/discord",
        content=body,
        headers={
            "X-Signature-Ed25519": assinatura,
            "X-Signature-Timestamp": timestamp,
            "Content-Type": "application/json",
        },
    )

    assert resp.status_code == 200
    assert "invalido" in resp.json()["data"]["content"].lower()
