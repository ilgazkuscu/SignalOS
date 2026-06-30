from __future__ import annotations


def kelly_size(edge: float, market_mid: float, bankroll: float, cap_liquidity: float) -> float:
    if edge <= 0 or market_mid <= 0 or market_mid >= 1:
        return 0.0
    b = (1 - market_mid) / market_mid
    q = 1 - (market_mid + edge)
    kelly_f = ((market_mid + edge) * b - q) / b
    quarter_kelly = max(0.0, kelly_f * 0.25)
    return min(bankroll * quarter_kelly, cap_liquidity * 0.01)
