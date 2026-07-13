export type MapboxTokenValidationResult = {
  ok: boolean;
  status?: number;
  message?: string;
};

export async function validateMapboxPublicToken(params: {
  token: string;
  styleId?: string; // e.g. "mapbox/dark-v11"
}): Promise<MapboxTokenValidationResult> {
  const token = (params.token || '').trim();
  const styleId = params.styleId || 'mapbox/dark-v11';

  if (!token) return { ok: false, message: 'Missing token.' };

  const url = `https://api.mapbox.com/styles/v1/${styleId}?sdk=js&access_token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(url, { method: 'GET' });

    if (res.ok) return { ok: true, status: res.status };

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        status: res.status,
        message:
          'Mapbox rejected this token. Verify it is a public token (pk.*) and that any URL restrictions allow this domain.',
      };
    }

    return {
      ok: false,
      status: res.status,
      message: `Mapbox style request failed (HTTP ${res.status}).`,
    };
  } catch {
    return {
      ok: false,
      message: 'Unable to reach Mapbox. Check network connectivity/ad blockers, then try again.',
    };
  }
}
