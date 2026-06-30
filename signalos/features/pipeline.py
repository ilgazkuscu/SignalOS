from __future__ import annotations

from datetime import UTC, datetime

import pandas as pd

from signalos.config import FEATURE_DIR
from signalos.features.base_rates import rolling_zscore
from signalos.features.composites import compute_p3_trigger, compute_p4_trigger
from signalos.features.signal_quality import score_row
from signalos.ingestion.satellite import chip_for_base, count_ramp_aircraft


def _read_latest(source: str) -> pd.DataFrame:
    folder = FEATURE_DIR.parent / "raw" / source
    files = sorted(folder.glob("*.parquet"))
    if not files:
        return pd.DataFrame()
    return pd.read_parquet(files[-1])


def build_features(date: datetime | None = None) -> pd.Series:
    date = date or datetime.now(UTC)
    adsb = _read_latest("adsb_fi")
    state = _read_latest("state_dept")
    dod = _read_latest("dod_rss")
    news = _read_latest("news_rss")
    iran_media = _read_latest("iran_media")
    polymarket = _read_latest("polymarket_markets")
    satellite_chip = chip_for_base("FJDG")

    tanker_sortie_count = int(adsb["callsign"].fillna("").str.contains("GOLD|QUID|SHELL|ESSO", regex=True).sum()) if not adsb.empty else 0
    reach_count = int(adsb["callsign"].fillna("").str.contains("REACH|RCH", regex=True).sum()) if not adsb.empty else 0
    csg_count = int(dod["csg_mentions"].sum()) if not dod.empty else 0
    ordered_iraq = int(
        not state.empty
        and bool(
            state[
                (state["middle_east"] == True) & (state["ordered_departure"] == True)  # noqa: E712
            ].shape[0]
        )
    )
    b2_count = count_ramp_aircraft(satellite_chip, "FJDG")
    israeli_activity_spike = int(
        not news.empty and news["text"].fillna("").str.contains("israel|idf|rising lion", case=False).sum() >= 3
    )
    trump_two_weeks = int(
        not news.empty and news["text"].fillna("").str.contains("two weeks", case=False).any()
    )
    senate_options = int(
        not news.empty and news["text"].fillna("").str.contains("options", case=False).sum() >= 2
    )
    retaliation = float(iran_media["keyword_hits"].mean()) if not iran_media.empty else 0.0
    price = 0.0 if polymarket.empty else 0.5

    row = pd.Series(
        {
            "date": pd.Timestamp(date).tz_convert("UTC") if pd.Timestamp(date).tzinfo else pd.Timestamp(date).tz_localize("UTC"),
            "tanker_sortie_count_centcom": tanker_sortie_count,
            "b2_dg_ramp_count": b2_count,
            "kc_positioning_count": tanker_sortie_count,
            "csg_centcom_count": csg_count,
            "csg_centcom_delta": csg_count,
            "msc_oiler_count_arabia": 0,
            "reach_eastbound_count_conus": reach_count,
            "ordered_departure_iraq": ordered_iraq,
            "ordered_departure_gulf_states": ordered_iraq,
            "diego_garcia_notam_active": 0,
            "whiteman_notam_active": 0,
            "israeli_activity_spike": israeli_activity_spike,
            "trump_two_weeks_pattern": trump_two_weeks,
            "senate_options_language": senate_options,
            "iran_media_retaliation_z": retaliation,
            "congressional_aumf_mentions_z": float(csg_count > 0),
            "eia_spr_release_week": 0,
            "polymarket_us_strikes_by_month_price": price,
            "msc_mpsron_sortie": 0,
            "b2_dg_ramp_count_delta_48h": -1 if trump_two_weeks and tanker_sortie_count else 0,
            "tanker_bridge_active": int(tanker_sortie_count >= 3),
        }
    )
    row["tanker_sortie_z"] = float(tanker_sortie_count / 3.0)
    row["b2_dg_z"] = float(b2_count / 4.0)
    row["kc_positioning_z"] = float(tanker_sortie_count / 3.0)
    row["reach_z"] = float(reach_count / 2.0)
    row["p3_trigger"] = compute_p3_trigger(row)
    row["p4_trigger"] = compute_p4_trigger(row)
    row["signal_quality_score_composite"] = score_row(row)
    return row


def build_all() -> pd.DataFrame:
    daily = FEATURE_DIR / "daily.parquet"
    row = build_features()
    frame = pd.DataFrame([row])
    if daily.exists():
        existing = pd.read_parquet(daily)
        frame = pd.concat([existing, frame], ignore_index=True).drop_duplicates(subset=["date"], keep="last")
    numeric_cols = [col for col in frame.columns if col != "date"]
    for col in numeric_cols:
        try:
            frame[col] = pd.to_numeric(frame[col])
        except (TypeError, ValueError):
            continue
    for col in ["tanker_sortie_count_centcom", "b2_dg_ramp_count", "reach_eastbound_count_conus"]:
        if col in frame:
            frame[f"{col}_z30"] = rolling_zscore(frame[col].astype(float), 30)
    frame = frame.sort_values("date").reset_index(drop=True)
    frame.to_parquet(daily, index=False)
    return frame
