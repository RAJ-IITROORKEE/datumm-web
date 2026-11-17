export type ProjectsStatus = 'unknown' | 'supported' | 'unsupported';
export function projectsStatus(
  previous: ProjectsStatus,
  failure: { status?: number } | null,
): ProjectsStatus;
