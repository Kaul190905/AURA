# AURA — IoT Healthcare Backend

AURA is a FastAPI backend that ingests real-time IoT/wearable telemetry (heart rate, blood oxygen, temperature, ambient noise, GPS), evaluates the wearer's sensory/physiological **risk** against their personal preferences, and returns actionable **recommendations** and **alerts** — aimed at sensory-overload monitoring (e.g. for neurodivergent users, patients, or field workers). It also runs three ML-backed AI engines (risk scoring, anomaly/pattern detection, wellness aggregation) alongside the original rule-based logic.

This document is written for a developer joining the project cold. It covers architecture, schema, endpoints, the core runtime flows (sensor ingestion and AI scoring), the ML layer, and how to get a local environment running.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Architecture](#project-architecture)
3. [Folder Structure](#folder-structure)
4. [Database Schema](#database-schema)
5. [Authentication Flow](#authentication-flow)
6. [Sensor Data Flow](#sensor-data-flow)
7. [AI Engine Flow](#ai-engine-flow)
8. [Machine Learning Layer](#machine-learning-layer)
9. [API Endpoints](#api-endpoints)
10. [Environment Setup](#environment-setup)
11. [Running Database Migrations](#running-database-migrations)
12. [Training the ML Models](#training-the-ml-models)
13. [Running the Simulator](#running-the-esp32-simulator)
14. [Testing](#testing)
15. [Swagger / OpenAPI Usage](#swagger--openapi-usage)
16. [Deployment](#deployment)
17. [Known Gaps & TODOs](#known-gaps--todos)

---

## Tech Stack

| Concern | Technology |
|---|---|
| API framework | FastAPI (async) |
| ORM | SQLAlchemy 2.0 (async engine, `Mapped`/`mapped_column` style) |
| Database | PostgreSQL, hosted via Supabase |
| Migrations | Alembic (async) |
| Auth | Supabase Auth (JWT), verified via `supabase-py` |
| Validation | Pydantic v2 (`pydantic-settings` for config) |
| ML | scikit-learn (`GradientBoostingRegressor`, `IsolationForest`, `KMeans`) + joblib for artifact persistence |
| LLM | Anthropic API (`anthropic` SDK) — used only for hybrid recommendation phrasing, never for numeric prediction |
| Server | Uvicorn (ASGI) |
| Testing | pytest + pytest-asyncio + httpx `ASGITransport` |
| Dependency mgmt | Poetry (`pyproject.toml`) or plain `pip` (`requirements.txt`) |

---

## Project Architecture

AURA follows a **layered / clean architecture** so that HTTP concerns, business rules, persistence, and AI logic never bleed into each other:

```
Route (FastAPI)  →  Service (business logic)  →  Repository (SQLAlchemy queries)  →  DB
                        │
                        └──→  AI Engines (risk / recommendation / pattern / prediction / wellness)
                                  │
                                  └──→  ML implementations (app/ai/ml/), trained offline, loaded via DI
```

- **Routes** (`app/api/v1/routes/`) only parse/validate HTTP input (via Pydantic schemas) and delegate to a service. They never touch SQLAlchemy directly.
- **Services** (`app/services/`) contain business rules (e.g. "email must be unique", "raise 404 if user missing", "create an alert when risk is HIGH"). They orchestrate one or more repositories and AI engines.
- **Repositories** (`app/repositories/`) are the only layer that runs SQLAlchemy queries. Each wraps one domain model.
- **Domain models** (`app/domain/models/`) are the SQLAlchemy ORM table definitions.
- **Schemas** (`app/schemas/`) are the Pydantic request/response contracts — kept separate from ORM models so the API surface can evolve independently of the DB schema.
- **AI engines** (`app/ai/`) are plain Python classes with no FastAPI/SQLAlchemy dependency in their pure methods, defined against `ABC` interfaces so implementations can be swapped (rules-based vs. ML-based) without touching services. Some methods that need historical data (e.g. `extract_behavioral_patterns`, `get_wellness_breakdown`) accept an optional repository at construction time — this is the one place engines are allowed to touch persistence, since repositories are framework-agnostic (no FastAPI import), unlike routes.
- **ML implementations** (`app/ai/ml/`) are concrete `I*Engine` classes backed by trained scikit-learn models loaded from joblib artifacts, plus the offline training scripts that produce those artifacts (`app/ai/ml/training/`).
- **Dependency injection** (`app/api/dependencies/`) wires everything together per-request using FastAPI's `Depends()` graph — this is the composition root. It also picks rule-based vs. ML implementations based on feature flags, with automatic fallback to rules if a model artifact is missing.

This means: to add a new feature you typically touch a **domain model → schema → repository → service → route**, in that order, wiring it up last in `app/api/dependencies/services.py`.

---

## Folder Structure

```
AURA/
├── app/
│   ├── ai/                         # AI/decision engines (framework-independent)
│   │   ├── risk_engine.py          # IRiskEngine + RiskEngine (rule-based, implemented)
│   │   ├── recommendation_engine.py# IRecommendationEngine + RecommendationEngine (implemented)
│   │   ├── pattern_engine.py       # IPatternEngine interface (ML implementation lives in ai/ml/)
│   │   ├── wellness_engine.py      # IWellnessEngine + RuleWellnessEngine (implemented)
│   │   ├── prediction_engine.py    # interface only — no implementation yet
│   │   ├── rules.json              # recommendation rule definitions
│   │   │
│   │   ├── ml/                      # ML-backed engine implementations (scikit-learn)
│   │   │   ├── features.py                 # shared feature-matrix builder (pattern engine)
│   │   │   ├── risk_features.py             # feature extraction for the risk model
│   │   │   ├── wellness_features.py         # feature extraction for the wellness model
│   │   │   ├── pattern_engine_ml.py         # MLPatternEngine — IsolationForest + KMeans
│   │   │   ├── risk_engine_ml.py            # MLRiskEngine — GradientBoostingRegressor
│   │   │   ├── wellness_engine_ml.py        # MLWellnessEngine — GradientBoostingRegressor
│   │   │   ├── prediction_features.py       # feature extraction for the prediction model
│   │   │   ├── prediction_engine_ml.py      # MLPredictionEngine — GradientBoostingRegressor
│   │   │   ├── artifacts/                   # trained model files (gitignored, regenerated)
│   │   │   └── training/
│   │   │       ├── train_risk_model.py      # offline trainer (distill / live modes)
│   │   │       ├── train_wellness_model.py  # offline trainer (distill / live modes)
│   │   │       └── train_prediction_model.py# offline trainer (distill / live modes)
│   │   │
│   │   └── llm/                     # LLM-backed engine implementations (Anthropic API)
│   │       └── recommendation_engine_ai.py  # AIRecommendationEngine — hybrid rule+LLM phrasing
│   │
│   ├── api/
│   │   ├── v1/routes/              # HTTP route handlers, grouped by resource
│   │   │   ├── users.py
│   │   │   ├── sensor_data.py
│   │   │   ├── alerts.py
│   │   │   ├── patterns.py         # anomaly detection + behavioral patterns
│   │   │   ├── risk.py             # historical risk trend (ML-only)
│   │   │   ├── wellness.py         # check-ins + aggregate wellness score
│   │   │   ├── recommendations.py  # on-demand, optionally AI-phrased recommendations
│   │   │   ├── prediction.py       # overload forecast + metric trend
│   │   │   ├── overload_events.py  # log/list confirmed overload events
│   │   │   └── __init__.py         # aggregates into `api_router`
│   │   ├── dependencies/
│   │   │   ├── db.py               # `get_db` — async session provider
│   │   │   └── services.py         # composition root: builds repos/services/engines per-request
│   │   └── middleware/
│   │       └── auth_middleware.py  # optional global auth middleware (not currently mounted)
│   │
│   ├── core/
│   │   ├── settings.py             # Pydantic Settings, reads `.env` — includes ML feature flags
│   │   ├── security.py             # `get_current_user` Supabase JWT dependency
│   │   ├── exceptions.py           # `AURAException` hierarchy + handler
│   │   ├── logging.py              # logging setup (used by main.py)
│   │   └── logging_config.py       # duplicate logging setup (currently unused — see Known Gaps)
│   │
│   ├── db/
│   │   └── database.py             # async engine, session factory, declarative `Base`
│   │
│   ├── domain/models/              # SQLAlchemy ORM models (one file per table)
│   │   ├── user.py
│   │   ├── user_preference.py
│   │   ├── sensor_data.py
│   │   ├── alert.py                # includes user_confirmed/confirmed_at feedback fields
│   │   ├── recommendation.py
│   │   ├── overload_event.py       # now written to via POST /overload-events/
│   │   └── wellness_checkin.py     # self-reported wellness — the WellnessEngine's ground truth
│   │
│   ├── repositories/               # DB access layer, one per model
│   ├── schemas/                    # Pydantic request/response models
│   ├── services/                   # Business logic layer (pattern_service, wellness_service, recommendation_service)
│   └── main.py                     # FastAPI app factory, middleware, router mounting
│
├── alembic/                        # DB migrations (async)
│   ├── env.py
│   └── versions/
│
├── simulator/
│   └── esp32_simulator.py          # Fake ESP32 device — posts random telemetry in a loop
│
├── tests/
│   ├── conftest.py                 # shared `client` fixture + auth-override fixtures
│   ├── test_security.py
│   ├── test_users_api.py
│   ├── test_sensor_data_api.py
│   ├── test_alerts_api.py
│   ├── test_risk_engine.py
│   ├── test_recommendation_engine.py
│   ├── test_pattern_engine.py / test_patterns_api.py
│   ├── test_risk_engine_ml.py / test_risk_engine_di.py / test_risk_api.py
│   ├── test_wellness_engine.py / test_wellness_engine_ml.py / test_wellness_api.py
│   ├── test_recommendation_engine_ai.py / test_recommendation_engine_di.py / test_recommendations_api.py / test_recommendation_service.py
│   └── test_prediction_engine.py / test_prediction_engine_ml.py / test_prediction_engine_di.py / test_prediction_service.py / test_prediction_api.py / test_overload_events_api.py
│
├── get_valid_user.py                # one-off script: fetch a real user ID for manual testing
├── alembic.ini
├── pyproject.toml                  # Poetry deps + pytest config
├── requirements.txt                # pip-installable equivalent
├── .env.example
├── .gitignore
└── README.md
```

---

## Database Schema

All tables use **UUID primary keys** and `created_at`/`updated_at` timestamptz columns. Everything cascades from `users` — deleting a user deletes all their sensor data, alerts, recommendations, overload events, preferences, and wellness check-ins (`ondelete="CASCADE"` at the FK level).

### Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o| USER_PREFERENCES : has
    USERS ||--o{ SENSOR_DATA : generates
    USERS ||--o{ ALERTS : receives
    USERS ||--o{ RECOMMENDATIONS : receives
    USERS ||--o{ OVERLOAD_EVENTS : triggers
    USERS ||--o{ WELLNESS_CHECKINS : reports

    USERS {
        uuid id PK
        string email UK
        bool is_active
        datetime created_at
        datetime updated_at
    }
    USER_PREFERENCES {
        uuid id PK
        uuid user_id FK "unique"
        float preferred_noise
        float preferred_temperature
        jsonb preferred_places
        jsonb trigger_foods
        jsonb notification_settings
        jsonb ai_settings
    }
    SENSOR_DATA {
        uuid id PK
        uuid user_id FK
        datetime timestamp
        float heart_rate
        float blood_oxygen
        float temperature
        float noise
        float latitude
        float longitude
    }
    ALERTS {
        uuid id PK
        uuid user_id FK
        string type
        string severity
        string message
        bool is_resolved
        bool user_confirmed
        datetime confirmed_at
    }
    RECOMMENDATIONS {
        uuid id PK
        uuid user_id FK
        string title
        text description
    }
    OVERLOAD_EVENTS {
        uuid id PK
        uuid user_id FK
        string trigger_metric
        float trigger_value
        int duration_seconds
    }
    WELLNESS_CHECKINS {
        uuid id PK
        uuid user_id FK
        float mood_score
        string notes
    }
```

### Table Notes

- **`users`** — mirrors a Supabase-authenticated identity by `id`/`email`. `email` is unique and indexed.
- **`user_preferences`** — 1:1 with `users` (`user_id` is unique). Scalar comfort baselines (`preferred_noise` in dB, `preferred_temperature` in °C) plus JSONB columns for flexible/future data.
- **`sensor_data`** — one row per telemetry submission. All metrics are nullable since a device may not report every sensor every time.
- **`alerts`** — created automatically by `SensorDataService` when risk is `HIGH`, or manually via the alerts API. `user_confirmed` / `confirmed_at` record whether the user later confirmed the alert as accurate or dismissed it as a false positive — this is the labeled signal `train_risk_model.py --mode live` consumes (see [Machine Learning Layer](#machine-learning-layer)).
- **`recommendations`** — currently a persistence target only; `RecommendationEngine.generate_recommendations` returns plain strings today rather than writing rows here.
- **`overload_events`** — schema exists and is migrated, but nothing currently writes to it; the intended landing table for a future `PredictionEngine` implementation.
- **`wellness_checkins`** — self-reported wellness (0-100 `mood_score` + optional notes). This is the subjective ground truth the ML `WellnessEngine` needs and that the schema had no source for until Phase 3 — submitted via `POST /wellness/{user_id}/checkins`.

### Migrations

Three Alembic migrations, applied in order:
1. `b5c8018b1b42_initial_schema.py` — creates `users`, `sensor_data`, `alerts`, `recommendations`, `overload_events`, `user_preferences`.
2. `c47f2a9d1b6e_add_alert_confirmation_feedback.py` — adds `user_confirmed` / `confirmed_at` to `alerts`.
3. `d81e3f6a2c9b_add_wellness_checkins.py` — creates `wellness_checkins`.

See [Running Database Migrations](#running-database-migrations).

---

## Authentication Flow

AURA delegates identity entirely to **Supabase Auth** — it does not issue or store its own passwords/tokens.

```mermaid
sequenceDiagram
    participant Client
    participant Supabase as Supabase Auth
    participant AURA as AURA API

    Client->>Supabase: sign in (email/password, OAuth, etc.)
    Supabase-->>Client: JWT access token
    Client->>AURA: request with Authorization: Bearer <token>
    AURA->>AURA: HTTPBearer extracts credentials
    AURA->>Supabase: supabase.auth.get_user(token)
    Supabase-->>AURA: user object (or error)
    alt token valid
        AURA-->>Client: 200 + resource
    else token missing / malformed
        AURA-->>Client: 401 Not authenticated
    else token expired
        AURA-->>Client: 401 Token has expired
    else token invalid / verification failed
        AURA-->>Client: 401 Could not validate credentials
    end
```

**Implementation details:**

- The core dependency is `get_current_user` in `app/core/security.py`. It's a FastAPI `Depends()` that:
  1. Extracts the bearer token via `HTTPBearer()`.
  2. Calls `supabase.auth.get_user(token)`, which verifies the JWT against Supabase's backend.
  3. Raises `HTTPException(401)` for a missing user, an expired token (detected by string-matching `"expired"` in the error), or any other verification failure.
- Route-level enforcement: any route that needs an authenticated user declares `current_user = Depends(get_current_user)`. This is the pattern used by all of `app/api/v1/routes/users.py`.
- There is also a global `SupabaseAuthMiddleware` (`app/api/middleware/auth_middleware.py`) that does the same check for *every* request except an exclude-list (`/docs`, `/redoc`, `/health`, the OpenAPI schema, `/api/v1/public`). **It is currently defined but not mounted in `app/main.py`** — route-level `Depends(get_current_user)` is the actual enforcement mechanism today.
- **Sensor ingestion is an explicit exception**: `POST /api/v1/sensor-data/` has auth commented out for development, accepting a `dev_user_id` query parameter instead of a verified identity (see the `TODO` in `app/api/v1/routes/sensor_data.py`). **This must be restored before production deployment.** The alerts, patterns, risk, and wellness routes similarly have no auth dependency at all today.

---

## Sensor Data Flow

This is the core write path of the system: a device posts telemetry, and the backend synchronously scores risk, generates recommendations, and raises an alert if needed — all in one request/response cycle.

```mermaid
sequenceDiagram
    participant Device as ESP32 / Client
    participant Route as POST /sensor-data/
    participant Service as SensorDataService
    participant Repo as SensorDataRepository
    participant PrefsRepo as UserPreferenceRepository
    participant Risk as RiskEngine (rule or ML)
    participant Rec as RecommendationEngine
    participant AlertSvc as AlertService
    participant DB

    Device->>Route: telemetry JSON (hr, temp, noise, gps...)
    Route->>Service: create_sensor_data(user_id, data)
    Service->>Repo: create(user_id, data)
    Repo->>DB: INSERT sensor_data
    Service->>PrefsRepo: get_by_user_id(user_id)
    PrefsRepo->>DB: SELECT user_preferences
    Service->>Risk: evaluate_current_risk(telemetry, prefs)
    Risk-->>Service: {risk_score, risk_level, reasons}
    Service->>Rec: generate_recommendations(user_id, context)
    Rec-->>Service: [recommendation strings]
    alt risk_level == HIGH
        Service->>AlertSvc: create_alert(...)
        AlertSvc->>DB: INSERT alerts
    end
    Service-->>Route: SensorDataAnalysisResponse
    Route-->>Device: 201 {sensor_data, risk_score, risk_level, reasons, recommendations}
```

**Step-by-step (`SensorDataService.create_sensor_data`, `app/services/sensor_data_service.py`):**

1. Persist the raw telemetry row via `SensorDataRepository.create`.
2. Fetch the user's `UserPreference` row (comfort baselines).
3. Run the active `IRiskEngine.evaluate_current_risk(telemetry, preferences)` — rule-based by default, or the ML model when `USE_ML_RISK_ENGINE=true` (see [Machine Learning Layer](#machine-learning-layer)).
4. Run `RecommendationEngine.generate_recommendations(user_id, context)`, where `context = {risk_score, sensor_data, preferences}`.
5. If `risk_level == "HIGH"`, automatically create an `Alert` row via `AlertService.create_alert`, with the message built from the risk engine's `reasons`.
6. Return a single aggregated `SensorDataAnalysisResponse` containing the stored record, score, level, reasons, and recommendations.

Reading historical data (`GET /sensor-data/history`) is a simple filtered/paginated/sorted read from `SensorDataRepository.get_history` — no AI logic runs on reads.

---

## AI Engine Flow

`app/ai/` defines five engines behind `ABC` interfaces so business logic never depends on a concrete implementation.

| Engine | Status | Responsibility |
|---|---|---|
| `RiskEngine` | ✅ Rule-based, **+ ML alternative** | Real-time risk scoring from current telemetry vs. preferences |
| `RecommendationEngine` | ✅ Rule-based | Actionable suggestions from `rules.json` |
| `PatternEngine` | ✅ **ML only** (`MLPatternEngine`) | Anomaly detection + behavioral pattern clustering |
| `WellnessEngine` | ✅ Rule-based, **+ ML alternative** | Aggregate holistic wellness score + category breakdown |
| `PredictionEngine` | ✅ Rule-based, **+ ML alternative** | Overload-event probability/ETA forecasting + metric trend extrapolation |

### RiskEngine (`app/ai/risk_engine.py`)

The **rule-based** `evaluate_current_risk(telemetry, preferences)` computes a **0–100 score** from three independent, additive, capped penalties:

| Signal | Trigger | Max contribution |
|---|---|---|
| Heart rate | `hr > 100 bpm` (configurable) | 40 pts — `(hr - 100) * 2.0` |
| Temperature | `|temp - preferred_temp| > 2°C` | 30 pts — `(deviation - tolerance) * 10.0` |
| Noise | `noise - preferred_noise > 10 dB` (only penalized if *louder* than preferred) | 30 pts — `(deviation - tolerance) * 1.5` |

Score maps to a level: `< 34` → `LOW`, `34–66` → `MEDIUM`, `≥ 67` → `HIGH`. Its `analyze_historical_risk` is **not implemented** — returns `{"status": "not_implemented"}`. The **ML alternative** (`MLRiskEngine`) replaces the scoring formula with a trained model and *does* implement historical trend analysis — see [Machine Learning Layer](#machine-learning-layer).

### RecommendationEngine (`app/ai/recommendation_engine.py`)

Loads a rule list from `app/ai/rules.json` at construction and evaluates every rule against the current context on each call — no ML, fully deterministic and auditable. Supported `condition` types: `absolute_greater_than`, `greater_than_preference`, `less_than_preference`. To add a recommendation, **edit `rules.json`** — no code change required. This deterministic engine is also the safety layer underneath the optional AI-phrased engine — see [Machine Learning Layer](#machine-learning-layer).

### PatternEngine (`app/ai/pattern_engine.py` interface, `app/ai/ml/pattern_engine_ml.py` implementation)

No rule-based implementation exists for this one — only `MLPatternEngine`. See [Machine Learning Layer](#machine-learning-layer).

### WellnessEngine (`app/ai/wellness_engine.py`)

`RuleWellnessEngine` combines three signals into a weighted composite: **physical** (inverse of current risk score), **mental** (recent self-reported mood, defaulting to a neutral 70 with no check-ins), **stability** (inverse of recent anomaly rate from the pattern engine). `MLWellnessEngine` inherits its signal-gathering but replaces the fixed-weight overall score with a trained regressor — see [Machine Learning Layer](#machine-learning-layer).

### PredictionEngine (`app/ai/prediction_engine.py`)

`RulePredictionEngine` (deterministic, the first implementation this interface ever had) handles two forecasts:
- `forecast_overload_event(user_id, current_trajectory)`: given an explicit list of recent risk scores, fits a linear slope and combines it with the most recent value into a 0-1 overload probability, plus an ETA in minutes if trending toward the `HIGH` threshold (67) and ETA is otherwise `null`.
- `predict_metric_trend(user_id, metric_name, horizon_hours)`: fetches the user's own recent sensor history for the requested metric and linearly extrapolates it forward — this needs its own DB access (it isn't handed data explicitly, unlike the method above), so it takes an optional `sensor_data_repo` at construction, same pattern as `extract_behavioral_patterns`/`get_wellness_breakdown`.

`MLPredictionEngine` inherits `predict_metric_trend` unchanged (simple linear extrapolation doesn't benefit from a trained model) but replaces `forecast_overload_event`'s heuristic with a `GradientBoostingRegressor` over trajectory summary features (last value, mean, std, slope, point count) — see [Machine Learning Layer](#machine-learning-layer) for training details.

This is an ML model, deliberately not an LLM — forecasting from rolling sensor windows is a numeric time-series problem, not a language one.

`OverloadEvent` — migrated since the initial schema but unused until now — finally has a writer: `POST /overload-events/` logs a confirmed event, which is the real ground truth `train_prediction_model.py --mode live` needs.

---

## Machine Learning Layer

Three engines have real trained models backing them (`app/ai/ml/`), each with an offline training script and automatic fallback to the deterministic rule-based engine if no model artifact exists.

### Design pattern used by all three

1. **Feature extraction** (`app/ai/ml/*_features.py`) — pure functions turning raw telemetry/snapshots into numeric feature vectors, shared between training and inference so they can never drift apart.
2. **Model implementation** (`app/ai/ml/*_engine_ml.py`) — a class implementing the same `ABC` interface as its rule-based counterpart, loading a joblib artifact (`{model, scaler}` dict) at construction, or accepting `model=`/`scaler=` directly for testing.
3. **Offline trainer** (`app/ai/ml/training/train_*.py`) — run manually, produces the artifact. Never runs as part of a request.
4. **DI fallback** (`app/api/dependencies/services.py`) — a feature flag (`USE_ML_RISK_ENGINE`, `USE_ML_WELLNESS_ENGINE`, `USE_AI_RECOMMENDATION_ENGINE`) picks the AI-backed implementation vs. rules; if the flag is on but the model/client is unavailable, it logs a warning and falls back to the rule-based engine rather than failing the request.

### MLPatternEngine (`app/ai/ml/pattern_engine_ml.py`)

No training script — fits fresh on each request (no persisted artifact):
- `detect_anomalies`: fits an `IsolationForest` on the given telemetry window and flags in-sample outliers. Below 20 samples, falls back to a per-feature z-score check instead of training an unreliable model.
- `extract_behavioral_patterns`: fetches up to 200 recent readings, clusters them with `KMeans` on metric values + hour-of-day, and heuristically labels each cluster (`rest-period`, `elevated-activity`, `high-noise-environment`, `baseline`).

### MLRiskEngine (`app/ai/ml/risk_engine_ml.py`)

A `GradientBoostingRegressor` predicting the 0-100 risk score from `[heart_rate, temperature, noise, blood_oxygen, temp_deviation, noise_deviation]`. "Reasons" are approximated from the model's global `feature_importances_` weighted by each feature's deviation from a calm baseline (not true SHAP — kept lightweight, no `shap` dependency). Also implements a real `analyze_historical_risk`: fetches a user's sensor history over a window, scores each reading, and reports a linear trend (`increasing`/`decreasing`/`stable`).

**Training** (`train_risk_model.py`):
- `--mode distill` (default): generates ~6000 synthetic telemetry/preference samples and labels them using the existing rule-based `RiskEngine`. Validates the pipeline end-to-end with **zero real data** — this is a bootstrap, not ground truth.
- `--mode live`: trains on real, user-confirmed alert outcomes (`Alert.user_confirmed`). Confirmed-accurate `HIGH` alerts anchor near a label of 85; dismissed false positives anchor near 40. Falls back to `distill` automatically if fewer than 200 confirmed samples exist.

### MLWellnessEngine (`app/ai/ml/wellness_engine_ml.py`)

Inherits `RuleWellnessEngine`'s signal-gathering (so the physical/mental/stability *breakdown* stays deterministic and interpretable) but replaces the fixed-weight *overall* score with a `GradientBoostingRegressor` over `[risk_score, anomaly_rate, recent_mood_avg]`.

**Training** (`train_wellness_model.py`):
- `--mode distill` (default): bootstraps from `RuleWellnessEngine`'s own formula across synthetic signal combinations.
- `--mode live`: trains on real `WellnessCheckin.mood_score` values, paired with that day's risk score and anomaly rate computed from the user's preceding sensor history, plus their own prior check-in average as a lag feature (never the current check-in — no label leakage). Falls back to `distill` if fewer than 100 real check-ins exist.

### MLPredictionEngine (`app/ai/ml/prediction_engine_ml.py`)

Inherits `RulePredictionEngine`'s `predict_metric_trend` unchanged but replaces `forecast_overload_event`'s heuristic with a `GradientBoostingRegressor` over trajectory summary features: `[last_value, mean, std, slope, n_points]` (see `app/ai/ml/prediction_features.py`), predicting the same 0-1 overload probability the rule engine computes directly.

**Training** (`train_prediction_model.py`):
- `--mode distill` (default): generates ~6000 synthetic risk-score trajectories (varying length, slope, noise) and labels them with `RulePredictionEngine`'s heuristic.
- `--mode live`: trains on real `OverloadEvent` rows. For each logged event, the risk-score trajectory in the window immediately preceding it is a positive example; a trajectory from ≥2 hours earlier in the same user's history is a negative example. Falls back to `distill` if fewer than 100 usable samples exist.

### AIRecommendationEngine (`app/ai/llm/recommendation_engine_ai.py`) — LLM, not scikit-learn

The odd one out: this is language generation, not numeric prediction, so it uses the Anthropic API instead of a trained model. It's a **hybrid, not a full generative handoff**:

1. The deterministic `RecommendationEngine` (rules.json) runs first and decides which recommendation categories are safe/eligible for the current context — that boundary is unchanged from before this feature existed.
2. If `USE_AI_RECOMMENDATION_ENGINE=true` and `ANTHROPIC_API_KEY` is set, the eligible list is sent to an LLM with a system prompt that only permits it to *rephrase* each item into a warmer, more personalized sentence — explicitly forbidden from adding, removing, or inventing recommendations, or giving medical advice.
3. The response is validated: must be a JSON array of the same length as the eligible list, all non-empty strings. Any mismatch, parse failure, or API exception falls back silently to the plain rule-based text — a formatting hiccup from the model can never break the response, and it can never introduce an unapproved suggestion.
4. If there are zero eligible recommendations (calm reading, nothing to say), **the LLM is never called at all** — pure cost/latency optimization for the common case.

**Deliberately kept out of the sensor-ingestion hot path.** `SensorDataService` (real-time telemetry submission, potentially every few seconds from a device) always uses the plain `RecommendationEngine` directly — never this class — regardless of the feature flag. The AI-phrased version is only reachable via the separate, user-triggered `GET /recommendations/{user_id}` endpoint, so LLM cost/latency is paid only when someone actually asks for guidance, not on every telemetry tick.

No training script — there's no model to train, just a prompt and a validation contract.

### The honest state of "AI" here

`distill` mode (Risk/Wellness/Prediction) means **the model currently predicts what its own rule engine would say**, not independent ground truth — it's there to prove the feature → model → serving pipeline works, not to claim the model knows something the rules didn't already encode. Real signal requires:
- **Risk**: volume through `PATCH /alerts/{id}/feedback` (confirm/dismiss real alerts).
- **Wellness**: volume through `POST /wellness/{user_id}/checkins` (real self-reports).
- **Prediction**: volume through `POST /overload-events/` (log real, confirmed overload events).

Once any of these has enough data, rerun the corresponding trainer with `--mode live`. The recommendation engine has no equivalent "distill vs. live" concern — it isn't learning from data, it's constrained generation with a hard-coded safety boundary.

---

## API Endpoints

Base path: `{API_V1_STR}` = `/api/v1` (configurable via env). Full interactive reference is always at `/docs` (see [Swagger Usage](#swagger--openapi-usage)) — this table is a quick-reference, not a substitute.

### Users — `/api/v1/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/me` | ✅ required | Raw Supabase identity — quick token-validity check |
| GET | `/profile` | ✅ required | Full AURA profile (DB row + preferences) |
| PUT | `/profile` | ✅ required | Update core fields (email, is_active) |
| PUT | `/preferences` | ✅ required | Upsert IoT/comfort preferences |
| POST | `/` | ❌ none | Create a new user (enforces unique email) |
| GET / PUT / DELETE | `/{user_id}` | ❌ none | Fetch / update / delete a user by ID |

### Sensor Data — `/api/v1/sensor-data`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | ⚠️ **disabled for dev** (`dev_user_id` query param) | Submit telemetry → stored record + risk score/level/reasons + recommendations; may create an alert |
| GET | `/history` | ❌ none | Paginated/filtered/sorted telemetry history |

### Alerts — `/api/v1/alerts`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | ❌ none | Manually create an alert |
| GET | `/` | ❌ none | Paginated/filtered/sorted alerts |
| DELETE | `/{alert_id}` | ❌ none | Delete an alert |
| PATCH | `/{alert_id}/feedback` | ❌ none | Confirm (`{"confirmed": true}`) or dismiss an alert — the label `train_risk_model.py --mode live` consumes |

### Patterns — `/api/v1/patterns` *(new — Phase 1)*

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/anomalies?user_id=&limit=` | ❌ none | Anomaly detection over a user's recent telemetry window (`IsolationForest` or z-score fallback) |
| GET | `/behavioral?user_id=` | ❌ none | Cluster recent history into behavioral states |

### Risk — `/api/v1/risk` *(new — Phase 2)*

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/trend?user_id=&days=` | ❌ none | Historical risk trend — only meaningful with `USE_ML_RISK_ENGINE=true`; rule engine returns `not_implemented` |

### Wellness — `/api/v1/wellness` *(new — Phase 3)*

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/{user_id}/checkins` | ❌ none | Submit a self-reported wellness check-in (0-100 `mood_score` + optional notes) |
| GET | `/{user_id}/score` | ❌ none | Aggregate wellness score + physical/mental/stability breakdown |

### Recommendations — `/api/v1/recommendations` *(new)*

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/{user_id}` | ❌ none | On-demand recommendations from the user's latest telemetry. AI-phrased when `USE_AI_RECOMMENDATION_ENGINE=true` and `ANTHROPIC_API_KEY` is set, otherwise plain rule text. **Not** the same engine instance used during sensor ingestion — see [Machine Learning Layer](#machine-learning-layer). |

### Prediction — `/api/v1/prediction` *(new)*

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/overload-forecast?user_id=&window=` | ❌ none | Overload probability (0-1) + ETA from the user's last `window` (default 10) sensor readings |
| GET | `/trend?user_id=&metric_name=&horizon_hours=` | ❌ none | Linear extrapolation of a specific metric (e.g. `heart_rate`, `noise`) forward by `horizon_hours` |

### Overload Events — `/api/v1/overload-events` *(new)*

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | ❌ none | Log a confirmed overload event — the label `train_prediction_model.py --mode live` consumes. This table existed since the initial schema but had no writer until now. |
| GET | `/` | ❌ none | Paginated/filtered/sorted overload events |

### Misc

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check, returns `{"status": "ok"}` — excluded from auth |
| GET | `/api/v1/openapi.json` | Raw OpenAPI schema |

---

## Environment Setup

### Prerequisites

- Python 3.12+ (tests have also been run against 3.11)
- A Supabase project (for Postgres + Auth) — or any Postgres instance if you bypass Supabase Auth features
- Poetry (recommended) or `pip`

### 1. Clone & install dependencies

```bash
git clone <repo-url>
cd AURA

# Option A — Poetry
poetry install

# Option B — pip
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PROJECT_NAME` | Display name, defaults to `"AURA"` |
| `API_V1_STR` | API version prefix, defaults to `/api/v1` |
| `DATABASE_URL` | Async Postgres connection string, e.g. `postgresql+asyncpg://user:pass@host:5432/dbname` |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Supabase service/anon key (used server-side to verify tokens) |
| `BACKEND_CORS_ORIGINS` | Optional list of allowed origins; defaults to `["*"]` |
| `USE_ML_RISK_ENGINE` | `true` to serve risk scoring from the trained model instead of the rule formula; defaults to `false`. Falls back to rules automatically if no artifact is trained. |
| `USE_ML_WELLNESS_ENGINE` | Same, for wellness scoring; defaults to `false`. |
| `USE_ML_PREDICTION_ENGINE` | Same, for overload-event forecasting; defaults to `false`. `predict_metric_trend` is unaffected either way (always the linear-extrapolation heuristic). |
| `USE_AI_RECOMMENDATION_ENGINE` | `true` to enable LLM-phrased recommendations on the on-demand `/recommendations/{user_id}` endpoint; defaults to `false`. Requires `ANTHROPIC_API_KEY`. Falls back to plain rule text if unset or the API call fails. Never affects sensor-ingestion recommendations (always rule-based, by design). |
| `ANTHROPIC_API_KEY` | Anthropic API key, required only if `USE_AI_RECOMMENDATION_ENGINE=true`. |
| `ANTHROPIC_MODEL` | Model used for recommendation phrasing; defaults to `claude-haiku-4-5-20251001` (fast/cheap — this is short text rewriting, not reasoning). |

Settings are loaded via `app/core/settings.py` (Pydantic `BaseSettings`, case-sensitive, reads `.env` automatically). Missing required vars (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY`) will fail fast at startup.

### 3. Apply database migrations

See [Running Database Migrations](#running-database-migrations) below.

### 4. Train the ML models (optional, only if enabling the flags above)

See [Training the ML Models](#training-the-ml-models) below. Without this step, `USE_ML_RISK_ENGINE`/`USE_ML_WELLNESS_ENGINE` simply fall back to the rule-based engines.

### 5. Run the dev server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Visit `http://localhost:8000/docs` for interactive API docs and `http://localhost:8000/health` to confirm it's alive.

---

## Running Database Migrations

Alembic is pre-configured to read `DATABASE_URL` from the same Pydantic `settings` object (see `alembic/env.py`), so you don't need to duplicate the connection string in `alembic.ini`.

```bash
# Apply all migrations
alembic upgrade head

# After changing a model in app/domain/models/, autogenerate a new migration
alembic revision --autogenerate -m "describe your change"

# Review the generated file in alembic/versions/ before applying — autogenerate is a starting point, not gospel
alembic upgrade head

# Roll back one revision
alembic downgrade -1
```

---

## Training the ML Models

All three trainers write a joblib artifact + JSON metadata file to `app/ai/ml/artifacts/` (gitignored — regenerate locally, don't commit binaries).

```bash
# Risk model — bootstraps from the rule engine with zero real data
python -m app.ai.ml.training.train_risk_model --mode distill

# Wellness model — same idea, bootstraps from RuleWellnessEngine's formula
python -m app.ai.ml.training.train_wellness_model --mode distill

# Prediction model — bootstraps from RulePredictionEngine's slope heuristic
python -m app.ai.ml.training.train_prediction_model --mode distill

# Once you have enough real labeled data (>=200 confirmed alerts / >=100 check-ins / >=100 overload events),
# retrain against real outcomes instead:
python -m app.ai.ml.training.train_risk_model --mode live
python -m app.ai.ml.training.train_wellness_model --mode live
python -m app.ai.ml.training.train_prediction_model --mode live
```

Each run logs a test-set MAE against a held-out split and writes `*_model_metadata.json` alongside the artifact (training mode, sample count, MAE, feature keys) — check that file to see what a deployed model was actually trained on before trusting `USE_ML_*_ENGINE=true` in an environment.

---

## Running the ESP32 Simulator

`simulator/esp32_simulator.py` fakes a wearable device posting random telemetry on a timer — useful for exercising the sensor flow end-to-end without real hardware.

```bash
python simulator/esp32_simulator.py
```

It targets `http://localhost:8000/api/v1/sensor-data/` and posts every 5 seconds using `dev_user_id` (matching sensor ingestion's current dev-mode auth bypass). Edit `TEST_USER_ID` at the bottom of the file to a real user ID from your database — you can fetch one quickly with:

```bash
python get_valid_user.py
```

---

## Testing

Tests live in `tests/` and use `pytest` + `pytest-asyncio` (configured in `pyproject.toml` with `asyncio_mode = "auto"`). All tests mock the database and Supabase auth — none require a live DB or network access. ML-engine tests train small **real** scikit-learn models in-fixture (distilled from the rule engines) rather than stubbing predictions, so they exercise the actual pipeline.

```bash
# Run the full suite
pytest

# Verbose
pytest -v

# A single file
pytest tests/test_risk_engine_ml.py -v
```

**How mocking works here:**

- `tests/conftest.py` provides a `client` fixture (an `httpx.AsyncClient` wrapping the real `app` via `ASGITransport`) and an `override_auth` fixture that swaps `get_current_user` for a fake identity using FastAPI's `app.dependency_overrides`.
- Route-level tests override the relevant `get_*_service`/`get_*_engine` dependency from `app/api/dependencies/services.py` with an `AsyncMock`, so no repository or DB session is ever constructed.
- Pure engine tests (`test_risk_engine.py`, `test_pattern_engine.py`, `test_risk_engine_ml.py`, `test_wellness_engine_ml.py`, etc.) test the AI engines directly, don't touch FastAPI, and for ML engines train a genuine small model in a fixture.
- `test_risk_engine_di.py` covers the DI fallback logic itself: ML flag off → rules, flag on + artifact present → ML, flag on + artifact missing → falls back to rules with a warning.

---

## Swagger / OpenAPI Usage

FastAPI generates interactive docs automatically from the route type hints and Pydantic schemas.

- **Swagger UI**: `http://localhost:8000/docs` — try requests directly in the browser.
- **ReDoc**: `http://localhost:8000/redoc` — cleaner read-only reference, better for sharing.
- **Raw schema**: `http://localhost:8000/api/v1/openapi.json` — import into Postman/Insomnia or generate a client SDK.

**Authenticating in Swagger UI:**

1. Obtain a JWT from Supabase (sign in via your frontend, or use Supabase's REST auth endpoint directly).
2. Click **Authorize** (top right of `/docs`).
3. Paste the raw token — Swagger UI adds the `Bearer ` prefix automatically for `HTTPBearer`-secured routes.
4. Protected routes (anything using `Depends(get_current_user)`, e.g. all of `/users/me`, `/users/profile`, `/users/preferences`) will now send the header automatically.

Routes without an auth dependency (sensor-data, alerts, patterns, risk, wellness, and the ID-based user routes) don't need this step — but see [Authentication Flow](#authentication-flow) for why that's a temporary state, not a permanent design choice.

---

## Deployment

The repo does not currently include a `Dockerfile`, CI pipeline, or hosting-specific config — the guidance below is generic ASGI deployment practice, not a documented existing pipeline.

### Minimum steps for any environment

1. Provision Postgres (Supabase or otherwise) and set `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY` as real environment variables (not a checked-in `.env`).
2. Run `alembic upgrade head` against the target database as part of your release step, before traffic is routed to the new version.
3. If `USE_ML_RISK_ENGINE`/`USE_ML_WELLNESS_ENGINE` will be `true`, train and ship the model artifacts as part of your build/release (they're gitignored, not baked into the repo) — see [Training the ML Models](#training-the-ml-models).
4. Serve with a production ASGI setup rather than `--reload`:

   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

   or behind Gunicorn with the Uvicorn worker class:

   ```bash
   gunicorn app.main:app -k uvicorn.workers.UvicornWorker --workers 4 --bind 0.0.0.0:8000
   ```

5. Put a reverse proxy (nginx, Caddy, or your cloud provider's load balancer) in front for TLS termination.
6. Set `BACKEND_CORS_ORIGINS` to your actual frontend origin(s) — the default `["*"]` is a dev convenience, not production-safe.
7. **Before going live, resolve the sensor-data auth TODO** — shipping with `dev_user_id` reachable publicly means anyone can write telemetry as any user. The same applies to alerts/patterns/risk/wellness routes, which have no auth at all today.
8. Point logging at your platform's log collector — `setup_logging()` logs structured lines to stdout, which most container platforms capture natively.

### Containerizing (if you add a Dockerfile)

A minimal image would: install from `requirements.txt`, copy `app/` and `alembic/`, run migrations and model training as separate release-phase steps (not at container startup), then `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`. Not included in the repo today.

---

## Known Gaps & TODOs

Documented here so they aren't rediscovered by surprise:

- **Sensor ingestion has no authentication.** `POST /sensor-data/` accepts a raw `dev_user_id` query param instead of verifying identity. The ESP32 simulator relies on this dev bypass.
- **Alerts, patterns, risk, wellness, recommendations, prediction, and overload-events routes have no auth dependency at all** — anyone can act on any user's data through them. Likely an oversight rather than intentional, given every user-scoped route requires auth.
- **`SupabaseAuthMiddleware` exists but isn't mounted** in `app/main.py`. Route-level `Depends(get_current_user)` is the only active enforcement.
- **`AIRecommendationEngine` has no automated tests against the real Anthropic API** — the test suite mocks the client entirely (no network calls, no API key needed to run `pytest`). Before relying on `USE_AI_RECOMMENDATION_ENGINE=true` in a real environment, manually verify a live call once with a real key.
- **ML models are currently trained via `--mode distill` only** — they reproduce their own rule engine's logic, not independent ground truth. Real signal requires volume through `PATCH /alerts/{id}/feedback`, `POST /wellness/{user_id}/checkins`, and `POST /overload-events/`, then retraining with `--mode live`.
- **`MLPatternEngine` fits a fresh model on every request** — no persisted artifact, no training script. Fine at current data volumes; revisit if per-request fitting becomes a latency problem.
- **`Recommendation` table is migrated but unused** — no repository/service writes to it yet. `RecommendationEngine` currently returns plain strings rather than persisting rows. (`OverloadEvent` now has a writer — `POST /overload-events/` — as of the PredictionEngine work.)
- **All five `app/ai/` interfaces now have a concrete implementation** — `PredictionEngine` (built last) was the final one with nothing behind it.
- **`app/core/logging.py` and `app/core/logging_config.py` are near-duplicate implementations** of `setup_logging()`; only `logging.py` is actually imported by `main.py`.
- **No `Dockerfile` or CI config** exists in the repo yet — see [Deployment](#deployment).
