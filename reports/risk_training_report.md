# AURA Risk Prediction Model — Training Report

**Generated**: 2026-07-29 06:39:00 UTC

---

## 1. Dataset

| Property | Value |
|---|---|
| Total samples (merged & shuffled) | 960,000 |
| CSV files loaded | 12 |
| Target column | `risk_label` (derived from `spd_level`) |
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

### Risk Label Mapping

| `spd_level` | `risk_label` (integer) | Class Name |
|---|---|---|
| Mild | 0 | LOW |
| Moderate | 1 | MEDIUM |
| Severe | 2 | HIGH |

---

## 2. Feature Engineering

**Engineered features** added before preprocessing:

| Feature | Description |
|---|---|
| `noise_heart_interaction` | `noise_db x heart_rate / 10 000` — compound sensory load |
| `thermal_stress` | `|body_temp - ambient_temp|` — thermoregulation effort |
| `spo2_deficit` | `max(0, 100 - blood_oxygen)` — SpO2 deviation from ideal |
| `hr_age_ratio` | `heart_rate / (age + 1)` — age-normalised heart rate |
| `humidity_comfort_delta` | `|humidity - 50|` — deviation from WHO comfort midpoint |

Total feature count after one-hot encoding: **51**

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
| Scoring metric | `f1_weighted` |
| Candidates evaluated | 4 |
| Best CV score | 0.8936 |
| Validation F1 (weighted) | 0.9831 |
| Wall-clock time | 527.8 s |

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
| **Accuracy** | **0.9836** |
| Precision (macro) | 0.9839 |
| Precision (weighted) | 0.9836 |
| Recall (macro) | 0.9809 |
| Recall (weighted) | 0.9836 |
| F1 Score (macro) | 0.9824 |
| **F1 Score (weighted)** | **0.9835** |
| ROC AUC (weighted OvR) | 0.9992 |

### Confusion Matrix

| True \ Predicted | LOW | MEDIUM | HIGH |
|---|---|---|---|
| **LOW** | 55848 | 296 | 190 |
| **MEDIUM** | 456 | 54217 | 269 |
| **HIGH** | 618 | 539 | 31567 |

### Per-Class Classification Report

```
              precision    recall  f1-score   support

         LOW       0.98      0.99      0.99     56334
      MEDIUM       0.98      0.99      0.99     54942
        HIGH       0.99      0.96      0.98     32724

    accuracy                           0.98    144000
   macro avg       0.98      0.98      0.98    144000
weighted avg       0.98      0.98      0.98    144000

```

---

## 6. Feature Importance (Top 15)

| Rank | Feature | Importance |
|---|---|---|
| 1 | `age` | 0.304229 |
| 2 | `stress_feedback` | 0.165378 |
| 3 | `noise_db` | 0.075125 |
| 4 | `body_temperature` | 0.052977 |
| 5 | `gender_Female` | 0.034685 |
| 6 | `hr_age_ratio` | 0.026320 |
| 7 | `time_of_day_Morning` | 0.026302 |
| 8 | `time_of_day_Afternoon` | 0.025452 |
| 9 | `day_of_week_Saturday` | 0.023165 |
| 10 | `blood_oxygen` | 0.022709 |
| 11 | `day_of_week_Thursday` | 0.021438 |
| 12 | `gender_Male` | 0.021245 |
| 13 | `day_of_week_Sunday` | 0.020094 |
| 14 | `day_of_week_Monday` | 0.019843 |
| 15 | `day_of_week_Tuesday` | 0.018539 |

---

## 7. Saved Artefacts

| File | Description |
|---|---|
| `models/risk_model.joblib` | Bundled model + preprocessor |
| `models/risk_metrics.json` | Full metrics payload |
| `models/risk_feature_names.json` | Ordered feature names (for inference) |
| `reports/risk_training_report.md` | This report |

---

*AURA Risk Prediction Pipeline — Capgemini T4PF*
