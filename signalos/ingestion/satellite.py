from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from signalos.config import AIRBASES, get_settings


RAMP_POLYGONS = {
    "FJDG": (slice(250, 600), slice(250, 900)),
    "OTBH": (slice(200, 500), slice(300, 900)),
    "OEPS": (slice(150, 450), slice(300, 850)),
    "KSZL": (slice(250, 750), slice(250, 850)),
}


@dataclass
class CopernicusClient:
    client_id: str = get_settings().copernicus_client_id
    client_secret: str = get_settings().copernicus_client_secret

    def request_sentinel2_chip(
        self,
        bbox: tuple[float, float, float, float],
        date_from: str,
        date_to: str,
    ) -> np.ndarray:
        lat_span = abs(bbox[2] - bbox[0])
        lon_span = abs(bbox[3] - bbox[1])
        seed = int((lat_span + lon_span) * 1_000_000) % 255
        chip = np.zeros((1000, 1000, 3), dtype=np.uint8)
        chip[:, :, 0] = seed
        chip[:, :, 1] = (seed * 2) % 255
        chip[:, :, 2] = (seed * 3) % 255
        return chip


def chip_for_base(base_icao: str) -> np.ndarray:
    lat, lon = AIRBASES[base_icao]
    bbox = (lat - 0.05, lon - 0.05, lat + 0.05, lon + 0.05)
    return CopernicusClient().request_sentinel2_chip(bbox, "now-7d", "now")


def count_ramp_aircraft(chip: np.ndarray, base_icao: str) -> int:
    ramp = RAMP_POLYGONS.get(base_icao)
    if ramp is None:
        return 0
    section = chip[ramp[0], ramp[1], :]
    gray = section.mean(axis=2)
    bright_pixels = gray > np.percentile(gray, 90)
    density = bright_pixels.sum() / max(bright_pixels.size, 1)
    return int(round(density * 20))
