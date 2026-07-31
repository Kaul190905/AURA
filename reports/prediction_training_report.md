# AURA Overload Prediction Model — Training Report

**Generated**: 2026-07-29 08:11:29 UTC

---

## 1. Dataset

| Property | Value |
|---|---|
| Total samples (after temporal offset engineering) | 958,662 |
| CSV files loaded | 12 |
| Target column | `overload_next_30s` (future risk score 30 seconds ahead) |
| Split ratio | Train 70% / Val 15% / Test 15% |
| Test samples | 143,800 |

### CSV Files Used

- `aura_bus_public_transport_80k_cleaned.csv`
- `aura_concert_80k_cleaned.csv`
- `aura_gym_80k_cleaned.csv`
- `aura_home_80k_cleaned.csv`
- `aura_hospital_80k_cleaned.csv`
- `aura_office_80k_cleaned.csv`
- `aura_park_80k_cleaned.csv`
- `aura_restaurant_80k_cleaned.csv`
- `aura_school_classroom_80k_cleaned.csv`
- `aura_temple_80k_cleaned.csv`
- `aura_traffic_street_80k_cleaned.csv`
- `aura_train_80k_cleaned.csv`

---

## 2. Feature Engineering

**Temporal, rolling, time, and engineered features** added:

| Feature | Description |
|---|---|
| `previous_risk` | Lag 1 value of computed risk score |
| `rolling_mean` | Rolling average of risk score over 30s window |
| `rolling_std` | Rolling standard deviation of risk score over 30s window |
| `slope` | Rate of change of risk score over 30s window |
| `moving_avg_short` | Moving average over 15s window |
| `moving_avg_long` | Moving average over 60s window |
| `hour` | Hour value extracted from timestamp |
| `minute` | Minute value extracted from timestamp |
| `day_of_week_num` | Numerical day of week value |

Total feature count after one-hot encoding: **55**

---

## 3. Preprocessing

- **Numeric columns**: Median imputation -> Standard scaling
- **Categorical columns**: Mode imputation -> One-hot encoding (`handle_unknown="ignore"`)
- Preprocessor bundled **with** the model artifact for inference consistency

---

## 4. Hyperparameter Tuning (Two-Phase)

| Property | Value |
|---|---|
| Search strategy | GridSearchCV |
| Phase 1: CV rows (stratified subsample) | 20,000 |
| Phase 1: n_estimators (search) | 50 |
| Phase 2: Full training rows (total train split) | 671,063 |
| Phase 2: Refitted training rows (refit subset) | 150,000 |
| Phase 2: n_estimators (final model) | 150 |
| CV folds | 3 |
| Scoring metric | `neg_mean_absolute_error` |
| Candidates evaluated | 4 |
| Best CV score (Negative MAE) | -1.6639 |
| Validation MAE | 1.2115 |
| Wall-clock time | 483.9 s |

### Best Hyperparameters (Final Model)

```json
{
  "learning_rate": 0.1,
  "max_depth": 5,
  "min_samples_split": 20,
  "subsample": 0.8,
  "n_estimators": 150
}
```

---

## 5. Test Set Evaluation

| Metric | Value |
|---|---|
| **Mean Absolute Error (MAE)** | **1.2078** |
| **Root Mean Squared Error (RMSE)** | **3.3669** |
| **R² Score** | **0.9765** |

---

## 6. Feature Importance (Top 15)

| Rank | Feature | Importance |
|---|---|---|
| 1 | `rolling_std` | 0.319219 |
| 2 | `slope` | 0.134276 |
| 3 | `location_type_Indoor - Food Court` | 0.129750 |
| 4 | `location_type_Indoor - Religious` | 0.090798 |
| 5 | `rolling_mean` | 0.085115 |
| 6 | `moving_avg_long` | 0.073778 |
| 7 | `moving_avg_short` | 0.062801 |
| 8 | `location_type_Outdoor - Street` | 0.046534 |
| 9 | `noise_db` | 0.017946 |
| 10 | `previous_risk` | 0.008375 |
| 11 | `ambient_temperature` | 0.008051 |
| 12 | `location_type_Indoor - Fitness` | 0.007918 |
| 13 | `location_type_Outdoor - Recreational` | 0.006351 |
| 14 | `location_type_Transit` | 0.002394 |
| 15 | `location_type_Indoor - Medical` | 0.001790 |

---

## 7. Saved Artefacts

| File | Description |
|---|---|
| `models/prediction_model.joblib` | Bundled regressor + preprocessor |
| `models/prediction_metrics.json` | Full evaluation metrics |
| `models/prediction_feature_names.json` | Ordered feature names (for inference) |
| `reports/prediction_training_report.md` | This report |

---

*AURA Prediction Pipeline — Capgemini T4PF*
