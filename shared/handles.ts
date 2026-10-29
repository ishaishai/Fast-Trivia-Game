/** 3–16 characters: lowercase letters, numbers, dots and underscores; starts and ends with a letter or number. */
export const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9._]{1,14})[a-z0-9]$/;

export function normalizeHandle(input: string): string {
  return input.trim().toLowerCase().replace(/^@/, '').replace(/\s+/g, '.');
}

export function handleProblem(handle: string): string | null {
  if (handle.length < 3) return 'At least 3 characters.';
  if (handle.length > 16) return 'At most 16 characters.';
  if (!HANDLE_PATTERN.test(handle)) return 'Use letters, numbers, dots and underscores.';
  return null;
}

export function cleanCity(input: string): string {
  return input.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24);
}
