import os
import zipfile
import shutil

aar_path = None
for root, dirs, files in os.walk(r'C:\Users\santh\.gradle\caches\modules-2\files-2.1\com.facebook.react\react-android\0.86.0'):
    for file in files:
        if file.endswith('.aar'):
            aar_path = os.path.join(root, file)
            break

if not aar_path:
    print("AAR not found")
    exit(1)

jniLibs = os.path.join('android', 'app', 'src', 'main', 'jniLibs')
os.makedirs(jniLibs, exist_ok=True)

with zipfile.ZipFile(aar_path, 'r') as z:
    for abi in ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64']:
        out_dir = os.path.join(jniLibs, abi)
        os.makedirs(out_dir, exist_ok=True)
        source_path = f'jni/{abi}/libjsi.so'
        if source_path in z.namelist():
            with z.open(source_path) as source, open(os.path.join(out_dir, 'libreact_featureflagsjni.so'), 'wb') as target:
                shutil.copyfileobj(source, target)
            print(f"Created dummy libreact_featureflagsjni.so for {abi}")
