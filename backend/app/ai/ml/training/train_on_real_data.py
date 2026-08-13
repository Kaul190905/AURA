import os
import sys
import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, f1_score, classification_report
from sklearn.ensemble import GradientBoostingClassifier

# Setup paths
_HERE = os.path.dirname(os.path.abspath(__file__))
_BACKEND = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(_HERE))))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from app.ai.ml.training.risk import load_and_merge, add_features, RiskPreprocessor, three_way_split

def train_risk_with_real_data():
    print("=" * 60)
    print("      TRAINING RISK MODEL WITH REAL DATA INTEGRATION       ")
    print("=" * 60)

    # 1. Load Synthetic Data
    print("\nLoading synthetic datasets...")
    df_synth = load_and_merge()
    df_synth = add_features(df_synth)
    
    # 2. Load Real Dataset
    print("\nLoading real dataset (aura_format_real_data_only.csv)...")
    real_path = r"e:\AURA\AURA\Data\Cleaned Data\aura_format_real_data_only.csv"
    df_real_raw = pd.read_csv(real_path, low_memory=False)
    
    # Filter real dataset to rows with target label
    df_real = df_real_raw[df_real_raw["spd_level"].notnull()].copy()
    print(f"Found {len(df_real)} clean rows in real dataset.")
    
    # Map spd_level
    target_map = {
        "Typical": 0,
        "Under-sensitive": 1,
        "Over-sensitive": 2,
        "Mild": 0,
        "Moderate": 1,
        "Severe": 2
    }
    df_real["risk_label"] = df_real["spd_level"].map(target_map)
    
    # Convert numeric columns to float/numeric
    for col in ["age", "heart_rate", "body_temperature", "blood_oxygen", "ambient_temperature", "humidity", "noise_db"]:
        if col in df_real.columns:
            df_real[col] = pd.to_numeric(df_real[col], errors="coerce")
            
    # Add features using the same feature engineering logic
    df_real = add_features(df_real)
    
    # Fill other columns that exist in synthetic schema but not real data with median/mode or let the preprocessor handle it
    preprocessor = RiskPreprocessor()
    
    # We fit the preprocessor on the synthetic data first
    print("\nFitting preprocessor on synthetic data...")
    X_synth, y_synth = preprocessor.fit_transform(df_synth)
    
    # Preprocess real dataset (using the fitted preprocessor)
    # We align the columns
    for col in df_synth.columns:
        if col not in df_real.columns:
            df_real[col] = np.nan
            
    df_real = df_real[df_synth.columns]
    
    # Transform real data using the same preprocessor
    X_real = preprocessor.transform(df_real)
    y_real = df_real["risk_label"].values
    
    # Split synthetic data into train/val/test
    X_train_s, y_train_s, X_val_s, y_val_s, X_test_s, y_test_s = three_way_split(X_synth, y_synth)
    
    # Split real data: use 50% for fine-tuning/training, and 50% for real test evaluation
    np.random.seed(42)
    indices = np.arange(len(X_real))
    np.random.shuffle(indices)
    split_idx = len(X_real) // 2
    train_idx, test_idx = indices[:split_idx], indices[split_idx:]
    
    X_train_r, y_train_r = X_real[train_idx], y_real[train_idx]
    X_test_r, y_test_r = X_real[test_idx], y_real[test_idx]
    
    print(f"Training subset of real data: {len(X_train_r)} samples.")
    print(f"Testing subset of real data: {len(X_test_r)} samples.")
    
    # Pre-train the model on Synthetic Data
    print("\nPre-training GradientBoostingClassifier on synthetic dataset...")
    # Best params from GridSearchCV
    model = GradientBoostingClassifier(
        learning_rate=0.1,
        max_depth=5,
        min_samples_split=20,
        subsample=0.8,
        n_estimators=100, # Initial trees
        warm_start=True, # Freeze base estimators for transfer learning
        random_state=42
    )
    
    train_size_s = min(len(X_train_s), 150000)
    model.fit(X_train_s[:train_size_s], y_train_s[:train_size_s])
    print("Pre-training completed.")

    # Fine-tune the model on Real Data
    print("\nFine-tuning on real dataset...")
    model.n_estimators += 50 # Add 50 new trees specifically fitted to real data
    
    X_train_r_oversampled = np.repeat(X_train_r, 500, axis=0)
    y_train_r_oversampled = np.repeat(y_train_r, 500)
    
    # Shuffle oversampled real data
    shuffle_idx = np.random.permutation(len(X_train_r_oversampled))
    X_train_r_oversampled = X_train_r_oversampled[shuffle_idx]
    y_train_r_oversampled = y_train_r_oversampled[shuffle_idx]

    model.fit(X_train_r_oversampled, y_train_r_oversampled)
    print("Fine-tuning completed.")
    
    # 3. Evaluate
    print("\nEvaluating model on Synthetic Test Set...")
    preds_s = model.predict(X_test_s)
    acc_s = accuracy_score(y_test_s, preds_s)
    f1_s = f1_score(y_test_s, preds_s, average="weighted")
    print(f"  - Synthetic Test Accuracy: {acc_s:.4f}")
    print(f"  - Synthetic Test F1 (weighted): {f1_s:.4f}")
    
    print("\nEvaluating model on Real Test Set...")
    preds_r = model.predict(X_test_r)
    acc_r = accuracy_score(y_test_r, preds_r)
    f1_r = f1_score(y_test_r, preds_r, average="weighted")
    print(f"  - Real Test Accuracy: {acc_r:.4f}")
    print(f"  - Real Test F1 (weighted): {f1_r:.4f}")
    
    # Print classification report for real data
    print("\nClassification Report (Real Data):")
    print(classification_report(y_test_r, preds_r, target_names=["LOW", "MEDIUM", "HIGH"]))
    
    # Save the new improved model
    print("\nSaving new model to models/risk_model_real_optimized.joblib...")
    payload = {
        "model": model,
        "preprocessor": preprocessor,
        "metrics": {
            "synthetic_accuracy": acc_s,
            "real_accuracy": acc_r,
            "real_f1_weighted": f1_r
        }
    }
    os.makedirs("models", exist_ok=True)
    joblib.dump(payload, "models/risk_model_real_optimized.joblib")
    print("Artifact successfully saved.")

if __name__ == "__main__":
    train_risk_with_real_data()
