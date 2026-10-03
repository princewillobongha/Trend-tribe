type User = { email?: string; name?: string };

const request = async (path: string, options: RequestInit = {}) => {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
};

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body: unknown) =>
    request(path, { method: 'POST', body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
};

const key = 'trend-tribe-admin-user';

export const auth = {
  async getUser(): Promise<User | null> {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  },
  async signIn(): Promise<{ user: User }> {
    const email = window.prompt('Enter your Trend Tribe admin email');
    if (!email) throw new Error('cancelled');
    const user = { email: email.trim() };
    localStorage.setItem(key, JSON.stringify(user));
    return { user };
  },
  async signOut() {
    localStorage.removeItem(key);
  },
};
