export const settingsSections = [
  { id: 'account', title: 'Profile & account', group: 'Personal', description: 'Your profile, work and sign-in details.', keywords: 'name domain interests sign in security' },
  { id: 'general', title: 'Preferences', group: 'Personal', description: 'Make the workspace fit the way you work.', keywords: 'general send messages shortcut units drafts' },
  { id: 'appearance', title: 'Appearance', group: 'Personal', description: 'Choose your theme, density and reading size.', keywords: 'theme color colour dark light accessibility contrast' },
  { id: 'permissions', title: 'Permissions', group: 'Personal', description: 'Choose when DATUMM asks before it acts.', keywords: 'approval ask safe full auto allow tools' },
  { id: 'models', title: 'Models', group: 'Workspace', description: 'Models reported by your connected workspace.', keywords: 'provider catalog reasoning' },
  { id: 'revit', title: 'Revit connection', group: 'Workspace', description: 'Bring model context into the conversation.', keywords: 'connector device computer' },
  { id: 'usage', title: 'Usage', group: 'Workspace', description: 'Understand the resources used by the current task.', keywords: 'tokens context cost' },
  { id: 'billing', title: 'Billing', group: 'Workspace', description: 'Subscription and payment availability.', keywords: 'pricing free pro max plans' },
  { id: 'capabilities', title: 'Capabilities', group: 'Workspace', description: 'What you can do on the web and in Revit.', keywords: 'desktop exports attachments calendar' },
];

export function filterSettingsSections(query) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return settingsSections.filter(section => {
    const text = `${section.title} ${section.group} ${section.keywords}`.toLowerCase();
    return terms.every(term => text.includes(term));
  });
}

export function modelIdentity(id) {
  const slash = id.indexOf('/');
  return slash > 0 && slash < id.length - 1
    ? { provider: id.slice(0, slash), name: id.slice(slash + 1) }
    : { provider: null, name: id };
}
