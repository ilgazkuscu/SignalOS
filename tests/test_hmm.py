import numpy as np

from signalos.models.hmm import PhaseHMM


def test_hmm_predict_shape() -> None:
    seq = np.array([[0, 0, 0], [1, 1, 1], [2, 1, 0], [3, 2, 1], [4, 3, 1], [5, 4, 2]], dtype=float)
    model = PhaseHMM(n_iter=10)
    model.fit([seq], [len(seq)])
    proba = model.predict_proba(seq)
    assert proba.shape == (len(seq), 6)
