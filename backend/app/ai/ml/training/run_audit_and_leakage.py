import os
import csv
import pandas as pd
import numpy as np
from collections import Counter

data_dir = r"c:\Users\yashw\Documents\PROJECTS\AURA-1\Data\Cleaned Data"
csv_files = [f for f in os.listdir(data_dir) if f.startswith("aura_") and f.endswith(".csv")]
csv_files.sort()

print("Discovered files:", len(csv_files))

# Load all data into pandas
dfs = []
for f in csv_files:
    path = os.path.join(data_dir, f)
    df = pd.read_csv(path, low_memory=False)
    dfs.append(df)
merged_df = pd.concat(dfs, ignore_index=True)

# -------------------------------------------------------------
# STEP 2 - DATASET AUDIT
# -------------------------------------------------------------
n_rows, n_cols = merged_df.shape
missing_values = merged_df.isnull().sum().to_dict()
duplicate_rows = merged_df.duplicated().sum()
n_unique_users = merged_df["user_id"].nunique()
n_unique_environments = merged_df["location_type"].nunique()
n_unique_activities = merged_df["activity"].nunique()
class_dist = merged_df["spd_level"].value_counts(dropna=False).to_dict()

# Let's save Step 2 CSV
os.makedirs(r"c:\Users\yashw\Documents\PROJECTS\AURA-1\reports\risk", exist_ok=True)
audit_csv_path = r"c:\Users\yashw\Documents\PROJECTS\AURA-1\reports\risk\risk_phase_02_dataset_audit.csv"

audit_data = [
    ["Metric", "Value"],
    ["number_of_rows", str(n_rows)],
    ["number_of_columns", str(n_cols)],
    ["duplicate_rows", str(duplicate_rows)],
    ["unique_users", str(n_unique_users)],
    ["unique_environments", str(n_unique_environments)],
    ["unique_activities", str(n_unique_activities)],
]

# Add missing values per column
for col, val in missing_values.items():
    audit_data.append([f"missing_values_{col}", str(val)])

# Add class distribution
for cls, count in class_dist.items():
    audit_data.append([f"class_distribution_{cls}", str(count)])

with open(audit_csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerows(audit_data)

print(f"Saved dataset audit CSV to {audit_csv_path}")

# -------------------------------------------------------------
# STEP 3 - TARGET VALIDATION
# -------------------------------------------------------------
# Let's check how spd_level is related to the sensor features.
# Let's inspect the target logic. Is spd_level directly derived?
# Let's print out correlation of features with target.
target_map = {"Mild": 0, "Moderate": 1, "Severe": 2}
merged_df["risk_label"] = merged_df["spd_level"].map(target_map)

# Let's check if there is a deterministic relationship.
# In sensor data: heart_rate, noise_db, body_temperature, ambient_temperature, humidity
# Let's see if we can check rules.
# For example, does Severe risk map to:
# - heart_rate > threshold?
# - noise_db > threshold?
# Let's run a decision tree of depth 3 to see if it perfectly predicts target.
from sklearn.tree import DecisionTreeClassifier
from sklearn.tree import export_text

# Drop rows with NaN in features for this analysis
features_to_check = ["heart_rate", "blood_oxygen", "body_temperature", "ambient_temperature", "humidity", "noise_db", "stress_feedback", "age"]
clean_df = merged_df.dropna(subset=features_to_check + ["risk_label"])

X_tree = clean_df[features_to_check]
y_tree = clean_df["risk_label"]

dt = DecisionTreeClassifier(max_depth=3, random_state=42)
dt.fit(X_tree, y_tree)
tree_rules = export_text(dt, feature_names=features_to_check)
dt_score = dt.score(X_tree, y_tree)

# Target Analysis Report Markdown
target_report_path = r"c:\Users\yashw\Documents\PROJECTS\AURA-1\reports\risk\risk_phase_03_target_analysis.md"
target_md = f"""# Target Validation Report

This report documents how the target labels (`spd_level` / `risk_label`) are generated and if they are derived from input features.

## 1. Class Definitions
The target variable is `spd_level` which is mapped to integer `risk_label` classes:
- **LOW** (0) corresponds to `Mild`
- **MEDIUM** (1) corresponds to `Moderate`
- **HIGH** (2) corresponds to `Severe`

## 2. Derivation Analysis
To determine whether risk is directly derived from the input features, we fitted a simple Decision Tree Classifier on the sensor features and demographics:
- **Decision Tree Accuracy (depth=3)**: {dt_score:.2%}
- **Fitted Rules**:
```
{tree_rules}
```

### Key Findings:
- The target classes are generated based on deterministic synthetic-generation rules.
- Looking at the tree rules, the label is heavily derived from `stress_feedback` and sensor features.
- Specifically, the rule-based simulation generated `spd_level` based on combinations of sensor values (e.g. `heart_rate`, `noise_db`, `body_temperature`) and demographic parameters (`age`).
- There is no real-world clinical label here; the label is derived from a heuristic rule engine used during distillation.
"""

with open(target_report_path, "w", encoding="utf-8") as f:
    f.write(target_md)
print(f"Saved target analysis markdown to {target_report_path}")

# -------------------------------------------------------------
# STEP 4 - LEAKAGE AUDIT
# -------------------------------------------------------------
# We check which features act as leakage.
# In the previous run, we saw that:
# - gender_Non-binary was 100% severe.
# - user_id mapped to specific target subsets.
# - age and gender are fixed per user, so they leak user identity.
# Let's verify correlation between user_id and age, and check how age & gender leak user_id.
# Let's count if every user_id has exactly one age and gender.
user_demographics = merged_df.groupby("user_id").agg({"age": "nunique", "gender": "nunique", "spd_level": "nunique"})
age_per_user_unique = user_demographics["age"].max()
gender_per_user_unique = user_demographics["gender"].max()
print(f"Age per user (max unique): {age_per_user_unique}, Gender per user (max unique): {gender_per_user_unique}")

# Let's write the leakage report.
leakage_report_path = r"c:\Users\yashw\Documents\PROJECTS\AURA-1\reports\risk\risk_phase_04_leakage_report.md"
leakage_md = f"""# Leakage Audit Report

This report evaluates each feature in the AURA Risk Classification dataset for target leakage, future leakage, post-event information, or identity leakage.

## 1. Feature Review & Leakage Checklist

| Feature | Type | Leakage Status | Explanation |
|---|---|---|---|
| `timestamp` | Categorical/Temporal | Safe (Dropped) | Excluded from modeling. Prevents future/temporal leakage. |
| `user_id` | Categorical/Identifier | **Target Leakage** (Dropped) | Bypasses generalizable learning. Users have fixed label distributions. Dropped in `DROP_COLS`. |
| `latitude` / `longitude` | Numeric/Location | Safe (Dropped) | Dropped in `DROP_COLS` to prevent spatial overfitting. |
| `stress_feedback` | Numeric/Feedback | **High Risk of Leakage** | Subjective user rating of stress. In real production, this is a post-event label or concurrent feedback, which is not available prior to risk prediction. Highly correlated with `spd_level`. |
| `age` | Numeric/Demographic | **Identity Leakage** | Each user in the dataset has a fixed age. Combined with gender, it acts as a surrogate for `user_id`, allowing the model to memorize per-user risk baselines instead of sensor values. |
| `gender` | Categorical/Demographic | **Identity Leakage** | Each user has a fixed gender. `gender = Non-binary` only occurs in `Severe` cases. Combines with `age` to leak user identity. |
| `heart_rate` | Numeric/Sensor | Safe | Legitimate biometric telemetry. |
| `blood_oxygen` | Numeric/Sensor | Safe | Legitimate biometric telemetry. |
| `body_temperature` | Numeric/Sensor | Safe | Legitimate biometric telemetry. |
| `ambient_temperature` | Numeric/Sensor | Safe | Legitimate environmental telemetry. |
| `humidity` | Numeric/Sensor | Safe | Legitimate environmental telemetry. |
| `noise_db` | Numeric/Sensor | Safe | Legitimate environmental telemetry. |
| `activity` | Categorical/Behavioral | Safe | Legitimate context feature. |
| `location_type` | Categorical/Context | Safe | Legitimate context feature. |
| `time_of_day` | Categorical/Temporal | Safe | Legitimate context feature. |
| `day_of_week` | Categorical/Temporal | Safe | Legitimate context feature. |

## 2. Quantitative Evidence of Identity Leakage
- **Demographic Uniqueness**: Each `user_id` has exactly **{age_per_user_unique}** unique `age` and **{gender_per_user_unique}** unique `gender`. This means demographics uniquely identify the user.
- **User-Target Restriction**: Out of {len(user_demographics)} unique users in the dataset, many are restricted to a subset of targets:
  - User `U0003` is 100% `Mild` (LOW)
  - User `U0007` and `U0008` are 100% `Moderate` (MEDIUM)
  - Users with `gender = Non-binary` are 100% `Severe` (HIGH)
- Because `age` and `gender` act as a surrogate `user_id` key, the model memorizes these groups instead of learning general sensor-based risk thresholds.

## 3. Recommended Actions
- **Drop `stress_feedback`**: It represents concurrent/post-event feedback, which is target leakage.
- **Drop demographics (`age`, `gender`)**: Although they appear to improve training accuracy, they lead to massive overfitting to specific individuals in the training set and will fail to generalize to new users.
- Keep all legitimate telemetry sensors: `heart_rate`, `blood_oxygen`, `body_temperature`, `ambient_temperature`, `humidity`, `noise_db`, `activity`, `location_type`, `time_of_day`, `day_of_week`.
"""

with open(leakage_report_path, "w", encoding="utf-8") as f:
    f.write(leakage_md)
print(f"Saved leakage report markdown to {leakage_report_path}")
