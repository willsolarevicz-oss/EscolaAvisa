import httpx
import pytest

from src.services import discord_service


def _assinar(signing_key, timestamp: str, body: bytes) -> str:
    return signing_key.sign(timestamp.encode() + body).signature.hex()


def test_verificar_assinatura_valida_retorna_true(signing_key):
    body = b'{"type":1}'
    timestamp = "1786622400"
    assinatura = _assinar(signing_key, timestamp, body)

    assert discord_service.verificar_assinatura(
        discord_service.settings.discord_public_key, assinatura, timestamp, body
    )


def test_verificar_assinatura_com_corpo_diferente_retorna_false(signing_key):
    timestamp = "1786622400"
    assinatura = _assinar(signing_key, timestamp, b'{"type":1}')

    assert not discord_service.verificar_assinatura(
        discord_service.settings.discord_public_key, assinatura, timestamp, b'{"type":2}'
    )


def test_verificar_assinatura_com_timestamp_diferente_retorna_false(signing_key):
    body = b'{"type":1}'
    assinatura = _assinar(signing_key, "1786622400", body)

    assert not discord_service.verificar_assinatura(
        discord_service.settings.discord_public_key, assinatura, "1786622401", body
    )


def test_verificar_assinatura_sem_headers_retorna_false(signing_key):
    assert not discord_service.verificar_assinatura(
        discord_service.settings.discord_public_key, "", "", b"{}"
    )


def test_verificar_assinatura_com_hex_invalido_retorna_false(signing_key):
    assert not discord_service.verificar_assinatura(
        discord_service.settings.discord_public_key, "nao-e-hex", "1786622400", b"{}"
    )


def test_enviar_no_canal_retorna_id_da_mensagem(monkeypatch):
    def fake_post(url, headers, json, timeout):
        assert url.endswith("/channels/123/messages")
        assert json == {"content": "ola"}
        return httpx.Response(200, json={"id": "999"}, request=httpx.Request("POST", url))

    monkeypatch.setattr(discord_service.httpx, "post", fake_post)

    assert discord_service.enviar_no_canal("123", "ola") == "999"


def test_enviar_no_canal_com_erro_da_api_levanta_excecao(monkeypatch):
    def fake_post(url, headers, json, timeout):
        return httpx.Response(403, json={"message": "Missing Access"}, request=httpx.Request("POST", url))

    monkeypatch.setattr(discord_service.httpx, "post", fake_post)

    with pytest.raises(RuntimeError, match="403"):
        discord_service.enviar_no_canal("123", "ola")


def test_enviar_no_canal_com_rate_limit_levanta_excecao_especifica(monkeypatch):
    def fake_post(url, headers, json, timeout):
        return httpx.Response(429, json={"retry_after": 1.5}, request=httpx.Request("POST", url))

    monkeypatch.setattr(discord_service.httpx, "post", fake_post)

    with pytest.raises(RuntimeError, match="rate limit"):
        discord_service.enviar_no_canal("123", "ola")


def test_enviar_dm_abre_canal_e_envia(monkeypatch):
    chamadas = []

    def fake_post(url, headers, json, timeout):
        chamadas.append(url)
        if url.endswith("/users/@me/channels"):
            assert json == {"recipient_id": "555"}
            return httpx.Response(200, json={"id": "canal-dm-1"}, request=httpx.Request("POST", url))
        assert url.endswith("/channels/canal-dm-1/messages")
        return httpx.Response(200, json={"id": "msg-1"}, request=httpx.Request("POST", url))

    monkeypatch.setattr(discord_service.httpx, "post", fake_post)

    assert discord_service.enviar_dm("555", "oi") == "msg-1"
    assert len(chamadas) == 2
