# AURA Wellness Model — Training Report

**Generated**: 2026-07-29 08:46:34 UTC

---

## 1. Dataset

| Property | Value |
|---|---|
| Total samples (merged & shuffled) | 960,000 |
| CSV files loaded | 12 |
| Target column | `wellness_score` (computed composite wellness metric, scale 0-100) |
| Split ratio | Train 70% / Val 15% / Test 15% |
| Test samples | 144,000 |

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

**Engineered, rolling, daily averages, and composite features** added:

| Feature | Description |
|---|---|
| `avg_heart_rate` | Rolling average of heart rate over 1-minute window |
| `avg_noise` | Rolling average of ambient noise level over 1-minute window |
| `avg_temperature` | Rolling average of ambient temperature comfort over 1-minute window |
| `stress_index` | Normalized composite index of heart rate and stress feedback |
| `recent_overload_frequency` | Rolling window proportion of sensory overload events |
| `daily_avg_hr` | Daily average heart rate baseline per user |
| `daily_avg_noise` | Daily average ambient noise baseline per user |
| `daily_avg_temp` | Daily average ambient temperature baseline per user |

Total feature count after one-hot encoding: **54**

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
| Phase 2: Full training rows (total train split) | 672,000 |
| Phase 2: Refitted training rows (refit subset) | 150,000 |
| Phase 2: n_estimators (final model) | 150 |
| CV folds | 3 |
| Scoring metric | `neg_mean_absolute_error` |
| Candidates evaluated | 4 |
| Best CV score (Negative MAE) | -0.4044 |
| Validation MAE | 0.1679 |
| Wall-clock time | 549.0 s |

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
| **Mean Absolute Error (MAE)** | **0.1679** |
| **Root Mean Squared Error (RMSE)** | **0.2861** |
| **R² Score** | **0.9998** |

---

## 6. Feature Importance (Top 15)

| Rank | Feature | Importance |
|---|---|---|
| 1 | `stress_index` | 0.771633 |
| 2 | `heart_rate` | 0.138010 |
| 3 | `noise_db` | 0.055408 |
| 4 | `blood_oxygen` | 0.027308 |
| 5 | `stress_feedback` | 0.007375 |
| 6 | `location_type_Indoor - Fitness` | 0.000187 |
| 7 | `avg_heart_rate` | 0.000026 |
| 8 | `ambient_temperature` | 0.000012 |
| 9 | `location_type_Indoor - Food Court` | 0.000010 |
| 10 | `activity_Dancing` | 0.000008 |
| 11 | `location_type_Outdoor - Street` | 0.000005 |
| 12 | `avg_noise` | 0.000005 |
| 13 | `location_type_Transit` | 0.000004 |
| 14 | `location_type_Indoor/Outdoor - Event Venue` | 0.000002 |
| 15 | `daily_avg_hr` | 0.000001 |

---

## 7. Saved Artefacts

| File | Description |
|---|---|
| `models/wellness_model.joblib` | Bundled regressor + preprocessor |
| `models/wellness_metrics.json` | Full evaluation metrics |
| `models/wellness_feature_names.json` | Ordered feature names (for inference) |
| `reports/wellness_training_report.md` | This report |

---

*AURA Wellness Pipeline — Capgemini T4PF*
