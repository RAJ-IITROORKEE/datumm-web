// Synthetic starter-skill catalog in the backend's shape (GET admin/config `builtinSkillCatalog`).
// The wording is fixture text, not the shipped skills.
const starter = (id: string, name: string, description: string, toolHints: string[]) => ({
  id, name, description, toolHints,
  instructions: `Synthetic starter skill, fixture data only.\n\nGive advice, never claim compliance, and never approve or change anything in Revit. Say "advice" for values that are not verified.`,
});
export const STARTER_CATALOG = [
  starter('datumm-brief-writing', 'Brief writing', 'Use when a request is rough and needs a clear design brief with assumptions.', ['knowledge_search']),
  starter('datumm-room-sizing', 'Room sizing', 'Use when someone asks how large a room should be. Advice only.', ['search_regulations', 'knowledge_search']),
  starter('datumm-markup-reading', 'Markup reading', 'Use when a redline or mark-up is unclear.', []),
  starter('datumm-revit-hygiene', 'Revit hygiene', 'Use when checking room names, numbers, levels or unplaced rooms.', ['inspect_rooms', 'query_elements']),
  starter('datumm-client-summary', 'Client summary', 'Use when a client-ready summary of a version is needed.', []),
  starter('datumm-revision-workflow', 'Revision workflow', 'Use when closing a revision: modify, verify, review once, package.', ['propose_changes']),
];
