export const PROJECT_SOURCE_LIMIT = 2_621_440;
export const PROJECT_SOURCE_JSON_LIMIT = 4 * Math.ceil(PROJECT_SOURCE_LIMIT / 3) + 4_096;
export const PROJECT_SOURCE_VERSION_LIMIT = 6;

const id = value => typeof value === 'string' && /^[a-zA-Z0-9-]{1,64}$/.test(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
const label = (value, max) => typeof value === 'string' && value.length <= max && value.trim() !== '' && !/[\u0000-\u001f\u007f]/.test(value);
const object = value => value && typeof value === 'object' && !Array.isArray(value);

export const SOURCE_TYPES = Object.freeze({
  specification: ['text/plain', 'text/markdown', 'application/pdf'],
  floor_plan: ['application/pdf', 'image/png', 'image/jpeg'],
  design_image: ['image/png', 'image/jpeg'],
});
const extensions = {txt:'text/plain',md:'text/markdown',pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg'};
export const SOURCE_KIND_LABELS = Object.freeze({specification:'Specification',floor_plan:'Floor-plan sheet',design_image:'Design image'});
export const acceptSource = kind => Object.entries(extensions).filter(([,type]) => SOURCE_TYPES[kind]?.includes(type)).map(([ext]) => '.' + ext).join(',');
const typeMatches = (kind, type) => Object.hasOwn(SOURCE_TYPES,kind) && SOURCE_TYPES[kind].includes(type);

export function validUpload(file, kind) {
  if (!file || !label(file.name, 160) || file.name.includes('/') || file.name.includes('\\')) return 'Choose a file with a filename of at most 160 characters.';
  const ext = file.name.includes('.') ? file.name.split('.').at(-1)?.toLowerCase() : undefined;
  if (!Object.hasOwn(extensions,ext) || !typeMatches(kind,extensions[ext])) return 'Choose one of the supported file types for this category.';
  if (!positive(file.size) || file.size > PROJECT_SOURCE_LIMIT) return 'Choose a non-empty file up to 2.5 MiB.';
  return '';
}

export function sourcePath(projectId, sourceId, version, sha256) {
  if (!id(projectId) || (sourceId !== undefined && !id(sourceId)) ||
      (version !== undefined && (!sourceId || (!positive(version) || version > PROJECT_SOURCE_VERSION_LIMIT))) ||
      (sha256 !== undefined && (!version || !hash(sha256)))) return null;
  const project = 'projects/' + projectId + '/sources';
  if (sourceId === undefined) return project;
  const versions = project + '/' + sourceId + '/versions';
  return version === undefined ? versions : versions + '/' + version;
}

export function sourceExactPath(ref, content = false) {
  if (!ref || !hash(ref.sha256) || !positive(ref.version)) return null;
  const path = sourcePath(ref.projectId, ref.sourceId, ref.version, ref.sha256);
  return path ? path + (content ? '/content' : '') + '?sha256=' + ref.sha256 : null;
}

function sourceReference(value, projectId) {
  if (!object(value) || !id(projectId) || value.projectId !== projectId || !id(value.sourceId) ||
      !positive(value.version) || value.version > PROJECT_SOURCE_VERSION_LIMIT || !hash(value.sha256) || !typeMatches(value.kind,value.mediaType) ||
      !label(value.filename,160)) return null;
  const {sourceId, version, sha256, filename, kind, mediaType} = value;
  return {projectId, sourceId, version, sha256, filename, kind, mediaType};
}

export function parseProjectSource(value, projectId, exact) {
  const ref = sourceReference(value,projectId);
  if (!ref || !positive(value.sizeBytes) || value.sizeBytes > PROJECT_SOURCE_LIMIT || !label(value.createdAt,40) ||
     (exact && (ref.sourceId !== exact.sourceId || ref.version !== exact.version || ref.sha256 !== exact.sha256 ||
        ref.kind !== exact.kind || ref.mediaType !== exact.mediaType || ref.filename !== exact.filename))) return null;
  return {...ref,sizeBytes:value.sizeBytes,createdAt:value.createdAt};
}

export function parseProjectSources(value, projectId, sourceId) {
  if (!Array.isArray(value) || value.length > (sourceId ? PROJECT_SOURCE_VERSION_LIMIT : 24)) return null;
  const sources = value.map(row => parseProjectSource(row,projectId));
  if (sources.some(row => !row || (sourceId && row.sourceId !== sourceId))) return null;
  return sources;
}

export function parseProjectCitations(value, {taskId, turnId, executionId, answerHash, projectId}) {
  if (!object(value) || value.schemaVersion !== 1 || !id(taskId) || !id(turnId) || !id(executionId) ||
      value.taskId !== taskId || value.turnId !== turnId || value.executionId !== executionId ||
      !hash(answerHash) || value.answerHash !== answerHash || !Array.isArray(value.sources) ||
      value.sources.length < 1 || value.sources.length > 12) return null;
  const sources = value.sources.map(row => {
    const ref = sourceReference(row,projectId), locator = row?.locator;
    if (!ref || !object(locator)) return null;
    if (locator.kind === 'file') return {...ref, locator:{kind:'file'}};
    if (locator.kind === 'page' && positive(locator.page) &&
        (ref.mediaType === 'application/pdf' || (ref.kind === 'floor_plan' && locator.page === 1))) {
      return {...ref, locator:{kind:'page',page:locator.page}};
    }
    if (locator.kind === 'text' && ref.mediaType.startsWith('text/') && positive(locator.line)) return {...ref, locator:{kind:'text',line:locator.line}};
    return null;
  });
  return sources.some(row => !row) ? null : sources;
}
