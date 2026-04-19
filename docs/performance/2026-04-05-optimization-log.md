# 2026-04-05 Performance Optimization Log

## Baseline

- `initial-channel-scan`: 150.60 ms average over 20 iterations
- `incremental-mutation-scan`: 80.37 ms average over 25 iterations
- `unrelated-mutation-cost`: 136.56 ms average over 25 iterations
- `card-filtering-micro`: 185.72 ms average over 40 iterations

## Iterations

1. Discarded. Hypothesis: consolidate card badge/link extraction into a single inspection pass. Result: worse in every benchmark (`initial-channel-scan` 213.91 ms, `incremental-mutation-scan` 168.74 ms, `unrelated-mutation-cost` 222.14 ms, `card-filtering-micro` 374.50 ms). Likely caused by extra object allocation and loss of early returns.
2. Discarded. Hypothesis: cache observer route/config state and mutation selectors. Result: improved mutation-heavy cases (`incremental-mutation-scan` 77.29 ms, `unrelated-mutation-cost` 117.40 ms) but regressed initial scan (`215.01 ms`) and card microbenchmark (`201.93 ms`). Too unbalanced to keep.
3. Discarded. Hypothesis: replace `URL` parsing with direct `href` parsing and lighter loops for link extraction. Result: better in `incremental-mutation-scan` (`77.88 ms`), `unrelated-mutation-cost` (`112.25 ms`) and `card-filtering-micro` (`154.54 ms`), but the initial channel scan regressed to `187.25 ms`, so it was not preserved.
4. Discarded. Hypothesis: cache joined selector strings for stable selector arrays. Result: small mutation wins (`76.84 ms`) but initial scan still regressed (`190.61 ms`) and did not justify keeping the change.
5. Kept. Hypothesis: skip channel-link extraction entirely when the whitelist is empty. Verified by test coverage (`does not scan channel links when whitelist is empty`) and by better mutation-heavy numbers in repeated runs. Initial full-page scan remained noisy, but the common-case DOM work is strictly lower.
6. Discarded. Hypothesis: replace shelf `filter(...)` with a single loop and early return. Result: regressed the benchmark set (`initial-channel-scan` 220.31 ms, `incremental-mutation-scan` 90.36 ms).
7. Kept. Hypothesis: schedule historical persistence only once per pending batch instead of repeatedly clearing/resetting the timeout. Result: lower timer churn and better mutation/card metrics in combination with iteration 5 (`incremental-mutation-scan` ~79.93 ms, `card-filtering-micro` ~163.95 ms).
8. Kept. Hypothesis: stop converting badge `NodeList` objects into arrays for `.some()`. Result: reduced allocation pressure and produced the best repeatable micro/mutation profile found in this session (`incremental-mutation-scan` ~79.09 ms, `unrelated-mutation-cost` ~106.76 ms, `card-filtering-micro` ~154.91 ms).
9. Discarded. Hypothesis: remove array creation from link extraction while keeping URL parsing. Result: benchmark set regressed heavily (`initial-channel-scan` 222.68 ms, `unrelated-mutation-cost` 130.80 ms).
10. Discarded. Hypothesis: add a global fast-path before unhide scans. Result: worse aggregate performance than the state after iteration 8 (`initial-channel-scan` 203.23 ms, `card-filtering-micro` 160.02 ms), so it was reverted.

## Remaining Hypotheses

- Rework hidden-id accounting so common single-video cards avoid array allocation in `updateTrackedElement`.
- Benchmark a cheaper `extractVideoIdFromCard` path that preserves current URL semantics but caches per-card results only within one scan cycle.
- Investigate whether `querySelectorAll` for shelf cards can be narrowed per-surface without losing compatibility with YouTube DOM variants.
- Add a separate inactive-route mutation benchmark to validate observer overhead on pages where no surface detector is active.
- Explore batching hidden historical ids with `requestIdleCallback` fallback in real browser profiling, but only if it does not change persistence semantics.
