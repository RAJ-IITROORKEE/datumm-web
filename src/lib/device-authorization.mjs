/** Browser review only. Starting a request and claiming its token belong to the connector. */
export function authorizationRequest(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(value) ? value : null;
}

export function authorizationReturnUrl(request) {
  const id = authorizationRequest(request);
  return id ? `/connect?request=${encodeURIComponent(id)}` : '/connect';
}

export function authorizationGate(configured, loaded, userId) {
  if (!configured) return 'unconfigured';
  if (!loaded) return 'loading';
  return userId ? 'signed-in' : 'signed-out';
}

export async function reviewAuthorization(request, {fetcher = fetch, signal} = {}) {
  return authorizationCall(request, false, fetcher, signal);
}

export async function approveAuthorization(request, {fetcher = fetch, signal} = {}) {
  return authorizationCall(request, true, fetcher, signal);
}

async function authorizationCall(request, approve, fetcher, signal) {
  const id = authorizationRequest(request);
  if (!id) return {status:'invalid'};
  try {
    const response = await fetcher(`/api/service/device-authorizations/${id}${approve ? '/approve' : ''}`, {
      method:approve ? 'POST' : 'GET', credentials:'same-origin', cache:'no-store', redirect:'error', signal,
    });
    if (response.status === 401) return {status:'signed-out'};
    if (response.status === 404) return {status:'expired'};
    if (response.status === 409) return {status:'conflict'};
    if (!response.ok) return {status:'unavailable'};
    const data = await response.json();
    if (approve) return data?.approved === true ? {status:'approved'} : {status:'unavailable'};
    if (typeof data?.name !== 'string' || !data.name.trim() || data.name.length > 80 ||
        /[\u0000-\u001f\u007f]/.test(data.name) || typeof data.approved !== 'boolean') return {status:'unavailable'};
    return {status:data.approved ? 'already-approved' : 'ready', name:data.name};
  } catch (error) {
    if (signal?.aborted) throw error;
    return {status:'unavailable'};
  }
}
