import httpx
from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

from src.core.config import settings

BASE_URL = "https://discord.com/api/v10"


def verificar_assinatura(public_key_hex: str, signature_hex: str, timestamp: str, body: bytes) -> bool:
    if not signature_hex or not timestamp:
        return False
    try:
        verify_key = VerifyKey(bytes.fromhex(public_key_hex))
        verify_key.verify(timestamp.encode() + body, bytes.fromhex(signature_hex))
        return True
    except (BadSignatureError, ValueError):
        return False


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bot {settings.discord_token}",
        "Content-Type": "application/json",
    }


def enviar_no_canal(canal_id: str, texto: str) -> str:
    resp = httpx.post(
        f"{BASE_URL}/channels/{canal_id}/messages",
        headers=_headers(),
        json={"content": texto},
        timeout=10,
    )
    if resp.status_code == 429:
        raise RuntimeError(f"rate limit: {resp.json().get('retry_after')}s")
    if not resp.is_success:
        raise RuntimeError(f"Discord {resp.status_code}: {resp.text}")
    return resp.json()["id"]


def abrir_dm(discord_user_id: str) -> str:
    resp = httpx.post(
        f"{BASE_URL}/users/@me/channels",
        headers=_headers(),
        json={"recipient_id": discord_user_id},
        timeout=10,
    )
    if not resp.is_success:
        raise RuntimeError(f"Discord {resp.status_code}: {resp.text}")
    return resp.json()["id"]


def enviar_dm(discord_user_id: str, texto: str) -> str:
    canal_id = abrir_dm(discord_user_id)
    return enviar_no_canal(canal_id, texto)
