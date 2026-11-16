# Backend candidate patches

The backend lives in a separate repository (`datumm-opencode-revit-agent`). Two
uncommitted local candidates sit in ignored `artifacts/`, where web Git cannot
save them. These patches are a backup of their diffs, taken 16 November 2026.
Neither candidate is deployed.

| Patch | Candidate folder | Base commit |
| --- | --- | --- |
| `agui-chat-presentation-20261116.patch` | `artifacts/ux/agui-presentation/candidate` | `188ebc0bc0599ff84f3760aaef24711e522972ae` |
| `agui-plan-intent-20261116.patch` | `artifacts/ux/checklist-completion/candidate` (frozen) | `188ebc0bc0599ff84f3760aaef24711e522972ae` |

Restore: check out the base commit in a backend clone, then `git apply <patch>`.
Regenerate a patch after changing a candidate; the folders stay the working copies.
