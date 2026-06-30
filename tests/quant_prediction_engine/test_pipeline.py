"""Unit tests for the quantitative political prediction engine."""

from __future__ import annotations

import unittest
from pathlib import Path

from backtest.backtest_engine import evaluate_predictions
from data.historical_snapshot_store import HistoricalSnapshotStore
from data.live_macro_client import parse_fred_csv
from data.live_market_client import parse_polymarket_payload
from data.live_news_client import parse_feed_items
from features.macro_features import extract_macro_features
from features.market_features import extract_market_features
from features.model_input_projection import (
    project_registry_to_bayesian_inputs,
    project_registry_to_hazard_inputs,
)
from features.model_schema import (
    REQUIRED_BAYESIAN_INPUTS,
    REQUIRED_HAZARD_INPUTS,
    explain_model_input_roles,
    validate_model_inputs,
)
from features.news_features import extract_news_features
from features.political_feature_engine import assemble_political_features
from features.variable_registry import get_columns_for_model, load_variable_registry
from models.bayesian_model import DEFAULT_BAYESIAN_MODEL
from models.deadline_hazard_model import fit_deadline_hazard_model
from models.decision_layer import build_trade_decision
from models.ensemble_model import combine_probabilities, random_forest_proxy
from models.hmm_model import infer_regimes
from models.performance_log import build_performance_log, summarize_performance_log
from models.transparency_log import build_bucket_prediction_curve
from models.training_pipeline import load_sample_training_data, train_from_dataset


class QuantPredictionEngineTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.dataset_path = (
            Path(__file__).resolve().parents[2]
            / "data"
            / "training"
            / "sample_training_data.json"
        )
        cls.dataset = load_sample_training_data(cls.dataset_path)

    def test_news_features_are_bounded(self) -> None:
        features = extract_news_features(
            [
                {
                    "headline": "Breaking ceasefire talks resume",
                    "summary": "Diplomatic progress offsets some missile fears.",
                    "timestamp": 1,
                },
                {
                    "headline": "Sanction threat escalates conflict",
                    "summary": "Officials warn of strike risk.",
                    "timestamp": 2,
                },
            ]
        )
        self.assertGreaterEqual(features["rolling_sentiment"], 0.0)
        self.assertLessEqual(features["rolling_sentiment"], 1.0)
        self.assertGreaterEqual(features["shock_intensity"], 0.0)
        self.assertLessEqual(features["shock_intensity"], 1.0)

    def test_market_features_capture_momentum(self) -> None:
        features = extract_market_features(
            [
                {"probability": 0.40, "yes_volume": 100.0, "no_volume": 120.0},
                {"probability": 0.45, "yes_volume": 160.0, "no_volume": 120.0},
            ]
        )
        self.assertAlmostEqual(features["market_prob"], 0.45)
        self.assertGreater(features["momentum"], 0.0)

    def test_bayesian_update_moves_probability(self) -> None:
        posterior = DEFAULT_BAYESIAN_MODEL.predict(
            0.42,
            {
                "rolling_sentiment": 0.8,
                "shock_intensity": 0.1,
                "topic_concentration": 0.7,
                "momentum": 0.03,
                "volatility": 0.01,
                "order_flow_imbalance": 0.2,
                "oil_stress": -0.01,
                "rates_stress": 0.0,
                "usd_strength": 0.0,
                "macro_stress": 0.02,
            },
        )
        self.assertGreater(posterior.posterior, posterior.prior)

    def test_hmm_probabilities_normalize(self) -> None:
        result = infer_regimes(
            {
                "rolling_sentiment": 0.6,
                "shock_intensity": 0.2,
                "momentum": 0.02,
                "oil_stress": 0.01,
            }
        )
        self.assertAlmostEqual(sum(result.regime_probabilities.values()), 1.0, places=6)

    def test_ensemble_returns_probability_and_confidence(self) -> None:
        ensemble = combine_probabilities(
            {
                "bayesian": 0.58,
                "regime": 0.53,
                "ml_proxy": 0.56,
            }
        )
        self.assertGreaterEqual(ensemble.probability, 0.0)
        self.assertLessEqual(ensemble.probability, 1.0)
        self.assertGreaterEqual(ensemble.confidence, 0.0)
        self.assertLessEqual(ensemble.confidence, 1.0)

    def test_backtest_reports_improvement(self) -> None:
        result = evaluate_predictions(
            market_predictions=[0.40, 0.50, 0.55, 0.48],
            model_predictions=[0.35, 0.62, 0.42, 0.39],
            outcomes=[0, 1, 0, 0],
        )
        self.assertIsInstance(result.brier_improvement, float)
        self.assertIsInstance(result.log_loss_improvement, float)

    def test_end_to_end_pipeline(self) -> None:
        news = extract_news_features(
            [
                {
                    "headline": "Ceasefire meeting resumes",
                    "summary": "Officials signal cautious diplomatic progress.",
                    "timestamp": 1,
                }
            ]
        )
        market = extract_market_features(
            [
                {"probability": 0.39, "yes_volume": 120.0, "no_volume": 100.0},
                {"probability": 0.41, "yes_volume": 150.0, "no_volume": 110.0},
            ]
        )
        macro = extract_macro_features(
            [
                {"oil_price": 80.0, "bond_yield": 4.2, "usd_index": 104.0},
                {"oil_price": 81.0, "bond_yield": 4.1, "usd_index": 103.8},
            ]
        )
        numeric_features = {
            key: value
            for key, value in {**news, **market, **macro}.items()
            if isinstance(value, float)
        }
        posterior = DEFAULT_BAYESIAN_MODEL.predict(market["market_prob"], numeric_features)
        regimes = infer_regimes(numeric_features)
        ensemble = combine_probabilities(
            {
                "bayesian": posterior.posterior,
                "regime": 0.5 + 0.5 * regimes.regime_score,
                "ml_proxy": random_forest_proxy(numeric_features),
            }
        )
        self.assertGreaterEqual(ensemble.probability, 0.0)
        self.assertLessEqual(ensemble.probability, 1.0)

    def test_training_pipeline_returns_fitted_artifacts(self) -> None:
        artifacts = train_from_dataset(self.dataset_path)
        self.assertTrue(artifacts.feature_names)
        self.assertLess(artifacts.training_loss, 1.0)
        self.assertIn("rolling_sentiment", artifacts.bayesian_model.weights)

    def test_deadline_model_produces_probability_by_deadline(self) -> None:
        hazard_model = fit_deadline_hazard_model(self.dataset["hazard_samples"])
        probability = hazard_model.probability_by_deadline(
            base_probability=0.42,
            horizon_days=7,
            features={
                "rolling_sentiment": 0.55,
                "shock_intensity": 0.18,
                "momentum": 0.01,
                "oil_stress": 0.0,
            },
        )
        self.assertGreaterEqual(probability, 0.0)
        self.assertLessEqual(probability, 1.0)

    def test_trade_decision_has_positive_size_when_edge_is_positive(self) -> None:
        decision = build_trade_decision(
            model_probability=0.61,
            market_probability=0.47,
            confidence=0.74,
            liquidity_quality=0.85,
        )
        self.assertGreater(decision.adjusted_edge, 0.0)
        self.assertNotEqual(decision.suggested_size, "none")

    def test_snapshot_store_is_append_only(self) -> None:
        path = Path(__file__).resolve().parents[2] / "data" / "training" / "test_snapshots.jsonl"
        if path.exists():
            path.unlink()
        store = HistoricalSnapshotStore(path)
        store.append({"id": 1, "value": 0.4})
        store.append({"id": 2, "value": 0.5})
        loaded = store.load_all()
        self.assertEqual(len(loaded), 2)
        self.assertEqual(loaded[0]["id"], 1)
        path.unlink()

    def test_variable_registry_loads(self) -> None:
        registry = load_variable_registry()
        self.assertGreaterEqual(len(registry["constructs"]), 7)

    def test_variable_registry_filters_by_model(self) -> None:
        hazard_columns = get_columns_for_model("hazard")
        self.assertIn("days_to_deadline", hazard_columns)
        self.assertIn("market_prob", hazard_columns)

    def test_political_feature_engine_emits_registry_backed_columns(self) -> None:
        features = assemble_political_features(
            news_events=[
                {
                    "headline": "Officials resume talks on ceasefire as mediator shuttles messages",
                    "summary": "Meeting follows missile threats and readiness warnings.",
                }
            ],
            market_series=[
                {"probability": 0.40, "yes_volume": 100.0, "no_volume": 90.0},
                {"probability": 0.43, "yes_volume": 120.0, "no_volume": 95.0},
            ],
            macro_series=[
                {"oil_price": 80.0, "bond_yield": 4.2, "usd_index": 104.0},
                {"oil_price": 82.0, "bond_yield": 4.3, "usd_index": 104.6},
            ],
            contract_context={"days_to_deadline": 6, "scheduled_meeting_within_7d": 1},
        )
        self.assertIn("days_to_deadline", features)
        self.assertIn("official_meeting_count_7d", features)
        self.assertIn("market_prob", features)
        self.assertGreaterEqual(features["market_prob"], 0.0)

    def test_model_input_projection_stays_bounded(self) -> None:
        registry_features = assemble_political_features(
            news_events=[
                {
                    "headline": "Talks and ceasefire meeting follow missile threat",
                    "summary": "Mediator involved while market reprices risk.",
                }
            ],
            market_series=[
                {"probability": 0.41, "yes_volume": 140.0, "no_volume": 100.0},
                {"probability": 0.46, "yes_volume": 180.0, "no_volume": 110.0},
            ],
            macro_series=[
                {"oil_price": 80.0, "bond_yield": 4.1, "usd_index": 103.8},
                {"oil_price": 81.2, "bond_yield": 4.2, "usd_index": 104.1},
            ],
            contract_context={"days_to_deadline": 5},
        )
        bayesian_inputs = project_registry_to_bayesian_inputs(registry_features)
        hazard_inputs = project_registry_to_hazard_inputs(registry_features)
        self.assertGreaterEqual(bayesian_inputs["rolling_sentiment"], 0.0)
        self.assertLessEqual(bayesian_inputs["rolling_sentiment"], 1.0)
        self.assertGreaterEqual(bayesian_inputs["shock_intensity"], 0.0)
        self.assertLessEqual(bayesian_inputs["shock_intensity"], 1.0)
        self.assertIn("momentum", hazard_inputs)

    def test_model_input_schema_validation_passes(self) -> None:
        registry_features = assemble_political_features(
            news_events=[{"headline": "Talks continue", "summary": "Ceasefire draft discussed."}],
            market_series=[
                {"probability": 0.40, "yes_volume": 100.0, "no_volume": 90.0},
                {"probability": 0.42, "yes_volume": 120.0, "no_volume": 100.0},
            ],
            macro_series=[
                {"oil_price": 80.0, "bond_yield": 4.2, "usd_index": 104.0},
                {"oil_price": 80.5, "bond_yield": 4.25, "usd_index": 104.1},
            ],
        )
        bayesian_inputs = project_registry_to_bayesian_inputs(registry_features)
        hazard_inputs = project_registry_to_hazard_inputs(registry_features)
        self.assertTrue(validate_model_inputs(bayesian_inputs, REQUIRED_BAYESIAN_INPUTS).valid)
        self.assertTrue(validate_model_inputs(hazard_inputs, REQUIRED_HAZARD_INPUTS).valid)
        self.assertIn("rolling_sentiment", explain_model_input_roles())

    def test_parse_polymarket_payload_prefers_yes_outcome(self) -> None:
        snapshot = parse_polymarket_payload(
            "apr-21",
            "test-slug",
            {
                "slug": "test-slug",
                "outcomes": ["Yes", "No"],
                "outcomePrices": ["0.61", "0.39"],
                "volume": 1200,
                "liquidity": 5000,
            },
        )
        self.assertAlmostEqual(snapshot.yes_price, 0.61)
        self.assertEqual(snapshot.market_id, "apr-21")

    def test_parse_feed_items_filters_keywords(self) -> None:
        xml = """
        <rss><channel>
          <item><title>Iran talks resume</title><description>Diplomatic meeting and ceasefire language.</description><pubDate>Sat, 12 Apr 2026 12:00:00 GMT</pubDate><link>https://example.com/a</link></item>
          <item><title>Sports roundup</title><description>Nothing relevant.</description></item>
        </channel></rss>
        """
        items = parse_feed_items(xml, "bbc-world", "BBC World", "2026-04-12T12:05:00+00:00")
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].source_id, "bbc-world")

    def test_parse_fred_csv_skips_missing_values(self) -> None:
        csv_text = "DATE,DGS10\n2026-04-07,4.33\n2026-04-08,\n2026-04-09,4.29\n"
        rows = parse_fred_csv(csv_text)
        self.assertEqual(rows, [("2026-04-07", 4.33), ("2026-04-09", 4.29)])

    def test_performance_log_marks_model_and_market_wins(self) -> None:
        entries = build_performance_log(
            market_predictions=[0.40, 0.80, 0.55],
            model_predictions=[0.20, 0.60, 0.52],
            outcomes=[0, 1, 1],
        )
        summary = summarize_performance_log(entries)
        self.assertEqual(len(entries), 3)
        self.assertIn("model_wins", summary)
        self.assertGreaterEqual(summary["model_wins"], 1)

    def test_bucket_prediction_curve_covers_all_deadlines(self) -> None:
        hazard_model = fit_deadline_hazard_model(self.dataset["hazard_samples"])
        curve = build_bucket_prediction_curve(
            now=__import__("datetime").datetime(2026, 4, 13, 12, 0, 0, tzinfo=__import__("datetime").timezone.utc),
            bucket_market_prices={
                "apr-15": 0.33,
                "apr-21": 0.36,
                "apr-30": 0.41,
                "may-31": 0.47,
                "jun-30": 0.52,
            },
            base_probability=0.44,
            hazard_model=hazard_model,
            hazard_features={
                "rolling_sentiment": 0.6,
                "shock_intensity": 0.2,
                "momentum": 0.03,
                "oil_stress": 0.01,
            },
        )
        self.assertEqual(len(curve), 5)
        self.assertEqual(curve[0].market_id, "apr-15")


if __name__ == "__main__":
    unittest.main()
