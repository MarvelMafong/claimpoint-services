// Finds an auth user by (normalized) email using the service client.
// Server only. Returns { user, providers } or null. Bounded scan so a huge
// user table can never hang a login request.
export async function findAuthUserByEmail(service, email) {
  const perPage = 1000;
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('findAuthUserByEmail error:', error.message);
      return null;
    }
    const users = data?.users ?? [];
    const match = users.find((u) => (u.email ?? '').toLowerCase() === email);
    if (match) {
      const providers = new Set([
        ...(match.app_metadata?.providers ?? []),
        ...(match.identities ?? []).map((i) => i.provider),
      ]);
      return { user: match, providers: [...providers] };
    }
    if (users.length < perPage) return null;
  }
  return null;
}

export async function isGoogleOnlyAccount(service, email) {
  const found = await findAuthUserByEmail(service, email);
  if (!found) return false;
  return found.providers.includes('google') && !found.providers.includes('email');
}
