from fastapi.testclient import TestClient

from src.main import app
from src.models.mensagem import Mensagem
from src.routers import discord as discord_router

client = TestClient(app)


def test_enviar_mensagem_teste_com_sucesso_marca_enviada(monkeypatch, db_session):
    monkeypatch.setattr(discord_router, "enviar_no_canal", lambda canal_id, texto: "id-externo-123")

    resp = client.post("/discord/enviar-teste", json={"texto": "ola mundo"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "enviada"
    assert body["id_externo"] == "id-externo-123"

    mensagem = db_session.get(Mensagem, body["mensagem_id"])
    assert mensagem.status == "enviada"
    assert mensagem.id_externo == "id-externo-123"


def test_enviar_mensagem_teste_com_falha_marca_falha(monkeypatch, db_session):
    def falha(canal_id, texto):
        raise RuntimeError("Discord 403: Missing Access")

    monkeypatch.setattr(discord_router, "enviar_no_canal", falha)

    resp = client.post("/discord/enviar-teste", json={"texto": "ola mundo"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "falha"

    mensagem = db_session.get(Mensagem, body["mensagem_id"])
    assert mensagem.status == "falha"
    assert "erro" in mensagem.conteudo
