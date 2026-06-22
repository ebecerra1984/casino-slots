import logging
import httpx

log = logging.getLogger(__name__)


async def fire_spin_webhook(
    callback_url: str,
    *,
    session_token: str,
    player_id: str,
    currency: str,
    bet: float,
    lines: int,
    total_bet: float,
    total_prize: float,
    is_win: bool,
    balance_before: float,
    balance_after: float,
) -> None:
    payload = {
        "event": "spin_completed",
        "session_token": session_token,
        "player_id": player_id,
        "spin": {
            "bet": bet,
            "lines": lines,
            "total_bet": total_bet,
            "total_prize": total_prize,
            "is_win": is_win,
        },
        "balance": {
            "before": balance_before,
            "after": balance_after,
            "currency": currency,
        },
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.post(callback_url, json=payload)
            r.raise_for_status()
    except Exception as exc:
        log.warning("Webhook a %s falló: %s", callback_url, exc)
