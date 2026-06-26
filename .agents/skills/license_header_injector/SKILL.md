---
name: license-header-injector
description: Automatically adds copyright and license headers to source files in the project workspace (supporting JS, JSX, TS, TSX, PY, CSS, etc.). Triggered when requested to add copyright notices or inject license headers.
---

# License Header Injector Skill

## Description
This skill automates the process of prepending a copyright and license notice header to all source files in the codebase (supporting `.js`, `.jsx`, `.ts`, `.tsx`, `.py`, and `.css` files).

## Trigger
- Explicit user requests like "inject license headers", "add copyright to source files", or "apply copyright notice".
- Pre-release tasks requiring legal headers on all files.

## Workflow
1. The agent will run the python script `scripts/inject_license.py` to insert the copyright headers.
2. Run the script using the following command:
   ```bash
   python .agents/skills/license_header_injector/scripts/inject_license.py
   ```
3. Verify the changes using `git diff` to ensure that headers were added correctly and no file structures were broken.
