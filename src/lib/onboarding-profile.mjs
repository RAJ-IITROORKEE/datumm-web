export const PROFILE_VERSION = 1;
export const DOMAINS = [
  ['architecture','Architecture'], ['bim','BIM coordination / management'],
  ['structural','Structural engineering'], ['mep','MEP engineering'],
  ['interiors','Interior design'], ['construction','Construction / site engineering'],
  ['quantity-surveying','Quantity surveying / cost management'],
  ['computational','Computational design / automation'], ['education','Student / educator'], ['other','Other'],
];
export const USE_CASE_GROUPS = [
  {label:'Learn and ask', options:[['revit-questions','Ask Revit questions'],['understand-model','Understand a model'],['learn-workflows','Learn workflows']]},
  {label:'Plan and design', options:[['building-briefs','Building briefs'],['floor-plans','Floor-plan options'],['space-planning','Space planning'],['room-layout','Room layouts'],['design-comparisons','Design comparisons']]},
  {label:'Review', options:[['drawing-review','2D / 3D review'],['measurements','Measurements'],['annotations','Pinned annotations'],['quality-checks','Model quality checks'],['coordination','Coordination review']]},
  {label:'Document', options:[['room-schedules','Room / area schedules'],['door-schedules','Door / window schedules'],['documentation','Drawing documentation'],['reports','Reports'],['exports','Exports']]},
  {label:'Quantify', options:[['quantities','Element quantities'],['takeoffs','Material takeoffs'],['boq','BOQ review'],['quantity-revisions','Compare quantity revisions']]},
  {label:'Automate', options:[['repetitive-tasks','Repetitive Revit tasks'],['parameters','Parameter updates'],['model-changes','Agent model changes']]},
  {label:'Explore', options:[['research','Research / references'],['custom','Custom workflow'],['other','Other']]},
];
const domainIds = new Set(DOMAINS.map(([id])=>id));
const useCaseIds = new Set(USE_CASE_GROUPS.flatMap(group=>group.options.map(([id])=>id)));
const steps = new Set(['profile','use-cases','connector','complete']);
const fields = new Set(['name','domain','useCases','step']);

/** Only a small, explicit interest profile is writable; identity and permissions never come from the body. */
export function validateProfileInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Enter your profile details.');
  if (Object.keys(input).some(key=>!fields.has(key))) throw Error('This profile contains unsupported fields.');
  const {name,domain,useCases,step} = input;
  if (typeof name !== 'string' || name.length > 100 || /[\u0000-\u001f\u007f]/.test(name)) throw Error('Use a name of 100 characters or fewer.');
  if (typeof domain !== 'string' || (domain !== '' && !domainIds.has(domain))) throw Error('Choose a professional domain.');
  if (!Array.isArray(useCases) || useCases.length > useCaseIds.size || useCases.some(id=>typeof id !== 'string'||!useCaseIds.has(id))) throw Error('Choose use cases from the list.');
  if (!steps.has(step)) throw Error('Choose a valid setup step.');
  const normalized = {name:name.trim(),domain,useCases:[...new Set(useCases)],step};
  if (step !== 'profile' && (!normalized.name || !domain)) throw Error('Enter your name and choose a professional domain.');
  if (['connector','complete'].includes(step) && !normalized.useCases.length) throw Error('Select at least one use case.');
  return normalized;
}

export function readOnboardingProfile(metadata) {
  const stored=metadata?.datummOnboarding;
  if (!stored || stored.version !== PROFILE_VERSION) return null;
  try {
    const valid=validateProfileInput({name:stored.name,domain:stored.domain,useCases:stored.useCases,step:stored.step});
    return {...valid,version:PROFILE_VERSION,completedAt:typeof stored.completedAt==='string'?stored.completedAt:null,updatedAt:typeof stored.updatedAt==='string'?stored.updatedAt:null};
  } catch {return null;}
}

export function nextOnboardingProfile(input, previous, now = new Date().toISOString()) {
  const valid=validateProfileInput(previous?.completedAt?{...input,step:'complete'}:input);
  // A later profile edit must never send a completed account through first-run setup again.
  const completedAt=previous?.completedAt || (valid.step==='complete'?now:null);
  return {...valid,step:completedAt?'complete':valid.step,version:PROFILE_VERSION,completedAt,updatedAt:now};
}

export function isSameOriginMutation(request) {
  return request.headers.get('origin') === new URL(request.url).origin && !['cross-site','none'].includes(request.headers.get('sec-fetch-site')??'');
}

/** Dependency-injected boundary lets tests exercise the real handler without real Clerk accounts. */
export async function handleProfileRequest(request, {userId,loadUser,saveMetadata}) {
  const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
  if (!userId) return reply({detail:'Sign in to manage your DATUMM profile.'},401);
  if (request.method !== 'GET' && !isSameOriginMutation(request)) return reply({detail:'Same-origin profile requests only.'},403);
  if (!['GET','PUT'].includes(request.method)) return reply({detail:'Method not allowed.'},405);
  let input;
  if (request.method==='PUT') {
    if (request.headers.get('content-type')?.split(';')[0].trim()!=='application/json') return reply({detail:'Send your profile as JSON.'},415);
    if (Number(request.headers.get('content-length')) > 4096) return reply({detail:'Profile is too large.'},413);
    const text=await request.text();
    if (text.length>4096) return reply({detail:'Profile is too large.'},413);
    try {input=validateProfileInput(JSON.parse(text));} catch(error) {return reply({detail:error instanceof Error?error.message:'Check your profile details.'},400);}
  }
  try {
    const user=await loadUser(userId);
    const previous=readOnboardingProfile(user.privateMetadata);
    if (request.method==='GET') return reply({profile:previous,name:user.fullName||[user.firstName,user.lastName].filter(Boolean).join(' ')||''});
    let profile;
    try {profile=nextOnboardingProfile(input,previous);} catch(error) {return reply({detail:error instanceof Error?error.message:'Check your profile details.'},400);}
    // Clerk updateUserMetadata deep-merges this namespace, preserving other private metadata.
    await saveMetadata(userId,{privateMetadata:{datummOnboarding:profile}});
    return reply({profile});
  } catch {return reply({detail:'Your account profile could not be saved or loaded. Try again.'},503);}
}
