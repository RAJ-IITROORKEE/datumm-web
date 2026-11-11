# Repository design toolkit

Skills are installed in `.agents/skills/` for this repository. Source commits,
licenses and SHA-256 file digests are recorded in `skills-lock.json`. They are
available for discovery on the next Codex turn. They add instructions and bundled
resources, not application dependencies or live DATUMM agent capabilities.

| Skill directory | Purpose |
| --- | --- |
| ui-ux-pro-max | Searchable interaction, accessibility, responsive, typography and design-system guidance |
| impeccable | UX shaping, critique, onboarding, empty/error states, UX copy and visual refinement |
| web-design-guidelines | Interface/accessibility review using Vercel's guidance |
| react-best-practices | React rendering/data-fetching performance review during implementation |
| writing-guidelines | Clear product documentation and prose review |
| ai-elements | Chat, reasoning, tool and conversation component guidance; legacy source, verify current APIs |
| screenshot | Screenshot capture guidance; use Codex browser capture for this project's browser work |
| pdf | PDF/print output inspection and document rendering guidance |
| reverse-engineer-anything | morluto/REA evidence-based analysis where source inspection alone is insufficient |

## Workflow

1. Start with `PROJECT.md` and the user's current instructions.
2. Use UI/UX Pro Max for targeted guidance; Impeccable for the selected UX task.
   Neither supplies the user's final reference choice or product decisions.
3. Use built-in browser tools for reference walkthroughs and screenshots. Do not
   install a competing browser runtime merely because a skill mentions one.
4. Inspect the current Next.js documentation and installed component APIs before
   implementation. Existing repo components and backend contracts are authoritative.
5. Use accessibility, React and writing checks when the corresponding artifact exists.
6. REA instructions are installed, but its MCP server/analysis engines are not
   configured by this task. A visible reference website can be mapped with the
   built-in browser. Confirm that “Modulo” means morluto before deeper REA work.

## Scope and provenance

The toolkit was selected from official OpenAI and Vercel sources and established
design/REA repositories after checking upstream metadata and the skills directory.
UI/UX Pro Max is the upstream package with its scripts and data, not the different
small guide previously installed globally. Impeccable covers UX copy; the PDF skill
covers the likely print/export meaning of “printing skills,” pending clarification.

AI Elements is copied from the already installed, provenance-recorded snapshot;
its own `PROVENANCE.md` notes that it is legacy guidance. No component installer,
model gateway setup or frontend framework upgrade is part of this installation.

Keep upstream licenses. No skill scripts that download/run design helper binaries
or configure external servers have been run as part of installation. Skill use
must remain within the user's current task and available tool instructions.

Discovery: <https://skills.sh/>. Exact source repositories/paths are in the lock
file. Source popularity informed discovery; it is not a guarantee of correctness.
