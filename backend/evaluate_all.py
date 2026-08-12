import os
import joblib
import numpy as np

def run_evaluation():
    models_dir = r"e:\AURA\AURA\models"
    backend_artifacts_dir = r"e:\AURA\AURA\backend\app\ai\ml\artifacts"
    
    print("=" * 60)
    print("               AURA AI MODELS RUN & EVALUATION              ")
    print("=" * 60)
    
    # 1. RISK MODEL
    print("\n[1] Running Risk Model...")
    try:
        risk_path = os.path.join(backend_artifacts_dir, "risk_model.joblib")
        if not os.path.exists(risk_path):
            risk_path = os.path.join(models_dir, "risk_model.joblib")
        
        payload = joblib.load(risk_path)
        
        if isinstance(payload, dict):
            model = payload.get("model")
            scaler = payload.get("scaler")
        else:
            model = payload
            scaler = None
        
        print(f"  - Loaded model type: {type(model).__name__}")
        
        # Risk model expects 6 features
        dummy_input = np.random.randn(1, 6)
        if scaler:
            dummy_input_scaled = scaler.transform(dummy_input)
            pred = model.predict(dummy_input_scaled)
        else:
            pred = model.predict(dummy_input)
        print(f"  - Test inference output (raw prediction): {pred[0]}")
        print("  - Risk model runs successfully!")
    except Exception as e:
        print(f"  - Error running Risk Model: {e}")

    # 2. WELLNESS MODEL
    print("\n[2] Running Wellness Model...")
    try:
        wellness_path = os.path.join(backend_artifacts_dir, "wellness_model.joblib")
        if not os.path.exists(wellness_path):
            wellness_path = os.path.join(models_dir, "wellness_model.joblib")
            
        payload = joblib.load(wellness_path)
        if isinstance(payload, dict):
            model = payload.get("model")
            scaler = payload.get("scaler")
        else:
            model = payload
            scaler = None
            
        print(f"  - Loaded model type: {type(model).__name__}")
        
        # Wellness model expects 3 features
        dummy_input = np.random.randn(1, 3)
        if scaler:
            dummy_input_scaled = scaler.transform(dummy_input)
            pred = model.predict(dummy_input_scaled)
        else:
            pred = model.predict(dummy_input)
        print(f"  - Test inference output (raw prediction): {pred[0]}")
        print("  - Wellness model runs successfully!")
    except Exception as e:
        print(f"  - Error running Wellness Model: {e}")

    # 3. PREDICTION MODEL
    print("\n[3] Running Prediction Model...")
    try:
        pred_path = os.path.join(backend_artifacts_dir, "prediction_model.joblib")
        if not os.path.exists(pred_path):
            pred_path = os.path.join(models_dir, "prediction_model.joblib")
            
        payload = joblib.load(pred_path)
        if isinstance(payload, dict):
            model = payload.get("model")
            scaler = payload.get("scaler")
        else:
            model = payload
            scaler = None
            
        print(f"  - Loaded model type: {type(model).__name__}")
        
        # Prediction model expects 5 features
        dummy_input = np.random.randn(1, 5)
        if scaler:
            dummy_input_scaled = scaler.transform(dummy_input)
            pred = model.predict(dummy_input_scaled)
        else:
            pred = model.predict(dummy_input)
        print(f"  - Test inference output (raw prediction): {pred[0]}")
        print("  - Prediction model runs successfully!")
    except Exception as e:
        print(f"  - Error running Prediction Model: {e}")

    # 4. PATTERN MODEL
    print("\n[4] Running Pattern Model...")
    try:
        pattern_path = os.path.join(models_dir, "pattern_model.joblib")
        if os.path.exists(pattern_path):
            payload = joblib.load(pattern_path)
            if isinstance(payload, dict):
                model = payload.get("model")
                scaler = payload.get("scaler")
            else:
                model = payload
                scaler = None
                
            print(f"  - Loaded model type: {type(model).__name__}")
            
            # Pattern model expects 36 features
            dummy_input = np.random.randn(1, 36)
            if scaler:
                dummy_input_scaled = scaler.transform(dummy_input)
                pred = model.predict(dummy_input_scaled)
            else:
                pred = model.predict(dummy_input)
            print(f"  - Test inference output (cluster label): {pred[0]}")
            print("  - Pattern model runs successfully!")
        else:
            print("  - Pattern model file not found in models/ directory.")
    except Exception as e:
        print(f"  - Error running Pattern Model: {e}")
        
    print("\n" + "=" * 60)
    print("                   METRICS SUMMARY REPORT                   ")
    print("=" * 60)
    
    for metric_name in ["risk_metrics.json", "wellness_metrics.json", "prediction_metrics.json"]:
        p = os.path.join(models_dir, metric_name)
        if os.path.exists(p):
            import json
            with open(p, "r") as f:
                data = json.load(f)
            eval_data = data.get("evaluation", {})
            print(f"\nModel: {metric_name.replace('_metrics.json', '').upper()}")
            print(f"  - Saved At: {data.get('saved_at', 'N/A')}")
            for k, v in eval_data.items():
                if k != "feature_importance" and k != "confusion_matrix":
                    print(f"  - {k}: {v}")

if __name__ == "__main__":
    run_evaluation()
