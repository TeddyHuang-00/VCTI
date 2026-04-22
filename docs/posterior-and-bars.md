# Posterior Estimation And Result Bars

This note records the two easiest-to-break parts of VCTI: Bayesian posterior estimation and result-bar rendering.

## 1. Posterior Estimation

For each dimension, let:

- `N = 5` be the number of scored questions
- `mu_0 = 0` be the prior mean
- `sig_0 = PRIOR_VARIANCE`
- `mu` be the sample mean of the 5 per-question contributions
- `sig` be the sample variance of those contributions

Use the posterior mean:

```text
mu' = sig / (N * sig_0 + sig) * mu_0
    + N * sig_0 / (N * sig_0 + sig) * mu
```

Since `mu_0 = 0`, this reduces to:

```text
mu' = N * sig_0 / (N * sig_0 + sig) * mu
```

Use the posterior variance:

```text
1 / sig' = 1 / sig_0 + N / sig
```

which can be simplified to:

```text
sig' = sig_0 * sig / (sig + N * sig_0)
```

Do not clamp sample variance away from `0`. When `sig = 0`, the limiting behavior is correct:

- `mu' = mu`
- `sig' = 0`

## 2. Display Scale

The display scale uses the per-question mean scale, because `mu` is the sample mean of per-question contributions:

```text
max reachable posterior = SCALE_MAX / N = 15 / 5 = 3
display purity = abs(mu) / max reachable posterior
```

If the project ever switches to rendering total score `raw` directly, then the display denominator should change to `SCALE_MAX = 15`. As long as rendering is based on `mu` or reconstructed `normalized`, the correct denominator is `3`.

## 3. Result-Bar Rendering Rules

Both the solid mean bar and the uncertainty bar must:

- preserve the correct proportion after conversion by `max reachable posterior`
- never render outside the visible container
- end exactly at the container edge when full scale is reached
- keep rounded caps even at the boundary
- support ranges that cross the center, e.g. `mu = 0`

Implementation rule:

- the outer container keeps the full pill shape
- each bar gets an inner positioning box with equal inset on all four sides
- the inset is determined by bar thickness, so bar-end circles remain concentric with the container ends
- the colored segment is positioned inside that box by center + width, with `min-width = height` and `border-radius = 9999px`
- rendering clamps only the final visible segment bounds, not the mathematical uncertainty range itself

This avoids special-case “draw a dot instead” logic while preserving accurate geometry.
