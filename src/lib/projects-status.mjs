/**
 * Whether the hosted service has projects. `failure` is null on success, else the thrown error.
 * Only a 404/405 proves the route is missing; any other failure keeps the previous state.
 */
export function projectsStatus(previous, failure) {
  if (!failure) return 'supported';
  return [404, 405].includes(failure.status ?? 0) ? 'unsupported' : previous;
}
