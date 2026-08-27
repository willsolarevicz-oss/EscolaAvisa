import re

from fastapi.testclient import TestClient

from src.main import app
from src.models.discord_link import DiscordLink
from src.models.responsavel import Responsavel

client = TestClient(app)


def test_criar_responsavel_persiste_no_banco(db_session):
    resp = client.post(
        "/responsaveis", json={"nome": "Joao Pedro", "email": "joao@example.com", "telefone": "42999990000"}
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["nome"] == "Joao Pedro"

    responsavel = db_session.get(Responsavel, body["id"])
    assert responsavel is not None
    assert responsavel.email == "joao@example.com"


def test_criar_responsavel_sem_email_nem_telefone_e_opcional(db_session):
    resp = client.post("/responsaveis", json={"nome": "Maria"})

    assert resp.status_code == 200


def test_gerar_vinculo_discord_cria_codigo_pendente(db_session):
    responsavel = Responsavel(nome="Carla")
    db_session.add(responsavel)
    db_session.commit()

    resp = client.post(f"/responsaveis/{responsavel.id}/discord-link")

    assert resp.status_code == 200
    body = resp.json()
    assert re.fullmatch(r"\d{6}", body["codigo"])
    assert body["codigo"] in body["instrucoes"]

    link = db_session.query(DiscordLink).filter(DiscordLink.responsavel_id == responsavel.id).one()
    assert link.status == "pendente"
    assert link.codigo == body["codigo"]
