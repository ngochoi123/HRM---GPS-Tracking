import os
import sys

# Define target directories
TARGET_DIRS = ["1_Source_Code"]
EXCLUDE_DIRS = ["node_modules", ".git", ".firebase", "backups", "build", "dist"]

# Define license notices
LICENSE_TEXT = "Copyright (c) 2026 ngochoi123 / HRM - GPS Tracking.\nAll rights reserved."
COPYRIGHT_KEYWORD = "Copyright (c) 2026 ngochoi123"

JS_HEADER = f"""/*
 * {LICENSE_TEXT.replace(chr(10), chr(10) + " * ")}
 */

"""

PY_HEADER = f"""# {LICENSE_TEXT.replace(chr(10), chr(10) + "# ")}

"""

def should_process(dir_path):
    parts = os.path.normpath(dir_path).split(os.sep)
    for exclude in EXCLUDE_DIRS:
        if exclude in parts:
            return False
    return True

def inject_header(file_path, ext):
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return False

    if COPYRIGHT_KEYWORD in content:
        return None # Already has copyright

    # Determine headers based on extension
    if ext in [".js", ".jsx", ".ts", ".tsx", ".css"]:
        new_content = JS_HEADER + content
    elif ext == ".py":
        # Handle shebang/coding lines
        lines = content.splitlines(keepends=True)
        insert_idx = 0
        if lines:
            if lines[0].startswith("#!"):
                insert_idx = 1
                if len(lines) > 1 and (lines[1].startswith("# -*-") or lines[1].startswith("# coding")):
                    insert_idx = 2
            elif lines[0].startswith("# -*-") or lines[0].startswith("# coding"):
                insert_idx = 1
        
        lines.insert(insert_idx, PY_HEADER)
        new_content = "".join(lines)
    else:
        return False

    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        return True
    except Exception as e:
        print(f"Error writing {file_path}: {e}")
        return False

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
    print(f"Root Workspace Directory: {root_dir}")
    
    updated_count = 0
    skipped_count = 0
    error_count = 0
    already_had_count = 0

    for target in TARGET_DIRS:
        target_path = os.path.join(root_dir, target)
        if not os.path.exists(target_path):
            print(f"Warning: Target directory {target_path} does not exist.")
            continue

        for root, dirs, files in os.walk(target_path):
            # Exclude directories in-place
            dirs[:] = [d for d in dirs if should_process(os.path.join(root, d))]
            
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext not in [".js", ".jsx", ".ts", ".tsx", ".py", ".css"]:
                    continue

                file_path = os.path.join(root, file)
                res = inject_header(file_path, ext)
                if res is True:
                    print(f"Added header to: {os.path.relpath(file_path, root_dir)}")
                    updated_count += 1
                elif res is None:
                    already_had_count += 1
                else:
                    error_count += 1

    print("\n--- Summary ---")
    print(f"Successfully updated: {updated_count} files")
    print(f"Already had header:  {already_had_count} files")
    print(f"Errors/Skipped:      {error_count} files")

if __name__ == "__main__":
    main()
