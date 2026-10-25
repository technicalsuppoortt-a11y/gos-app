export async function firebaseSettingsRequest<T>(path: string): Promise<T> {
  if (path === '/settings') return { profile: { name: 'Mohamed Joe', email: 'demo@example.com', title: 'Business Owner', bio: 'Demo workspace', phone: '', photo: '' }, integrations: {} } as T;
  if (path === '/team') return { members: [] } as T;
  throw new Error('This is a read-only demonstration.');
}
