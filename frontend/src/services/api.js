const API_URL = (
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
).replace(/\/$/, '');

export const TOKEN_KEY = 'clinicqueueweb_token';

export async function apiRequest(endpoint, options = {}) {
  const { token, headers, ...fetchOptions } = options;

  let response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new Error(
      'Cannot connect to the clinic server. Make sure Laravel is running.'
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const validationErrors = data?.errors
      ? Object.values(data.errors).flat().join(' ')
      : '';

    const error = new Error(
      validationErrors || data?.message || 'The request failed. Please try again.'
    );

    error.status = response.status;

    throw error;
  }

  if (data === null) {
    throw new Error('The server returned an unexpected response.');
  }

  return data;
}