const CODE_TO_KEY: Record<string, string> = {
  'auth/email-already-in-use': 'auth_error_email_taken',
  'auth/invalid-email':        'auth_email_invalid',
  'auth/weak-password':        'auth_error_weak_password',
  'auth/too-many-requests':    'auth_error_too_many',
  'auth/network-request-failed': 'auth_error_network',
  'auth/user-disabled':        'auth_error_disabled',
  'auth/requires-recent-login': 'auth_error_reauth',
  'auth/operation-not-allowed': 'auth_error_not_allowed',
};

export function resolveAuthError(
  err: unknown,
  fallbackKey: string,
  t: (key: string) => string,
): string {
  const code = (err as any)?.code;
  const key = code ? CODE_TO_KEY[code] : undefined;
  return t(key ?? fallbackKey);
}
