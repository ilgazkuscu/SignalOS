# Benchmark Methodology

Run:

```bash
npm run benchmark
```

The benchmark currently measures:

- `clusterSourceEvents x1000`
- `decisionPipeline x1000`

This is not a production load test. It is a reproducible smoke benchmark for the transforms most likely to grow with live source volume.
