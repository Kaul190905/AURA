import sys
import os

def fix_app_tsx():
    filepath = r'c:\project2\AuraMobile\Frontend\App.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    out = []
    state = "NORMAL"
    for line in lines:
        if line.startswith('<<<<<<< HEAD'):
            state = "IN_HEAD"
            continue
        elif line.startswith('======='):
            if state == "IN_HEAD":
                state = "IN_REMOTE"
                continue
        elif line.startswith('>>>>>>>'):
            if state == "IN_REMOTE":
                state = "NORMAL"
                continue
        
        if state == "NORMAL" or state == "IN_HEAD":
            out.append(line)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(out)
    print("Fixed App.tsx")

def fix_api_ts():
    filepath = r'c:\project2\AuraMobile\Frontend\src\services\api.ts'
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    out = []
    found_duplicate = False
    for i, line in enumerate(lines):
        if i > 0 and line.strip() == '// ── AURA API Service Layer ─────────────────────────────────────────────────────':
            found_duplicate = True
            break
        out.append(line)
        
    if found_duplicate:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(out)
        print("Fixed api.ts (removed duplicates)")
    else:
        print("No duplicates found in api.ts")

if __name__ == '__main__':
    fix_app_tsx()
    fix_api_ts()
