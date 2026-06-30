from signalos.features.composites import compute_p3_trigger, compute_p4_trigger


def test_p3_and_p4_triggers() -> None:
    row = {
        "csg_centcom_count": 2,
        "b2_dg_ramp_count": 4,
        "ordered_departure_iraq": 1,
        "tanker_sortie_z": 2.5,
        "msc_mpsron_sortie": 0,
        "israeli_activity_spike": 1,
        "senate_options_language": 0,
        "trump_two_weeks_pattern": 0,
        "b2_dg_ramp_count_delta_48h": -1,
        "tanker_bridge_active": 1,
    }
    assert compute_p3_trigger(row) == 1
    assert compute_p4_trigger(row) == 1
