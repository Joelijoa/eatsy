export type StrengthLevel = 'weak' | 'fair' | 'strong';

export interface PasswordStrength {
  level: StrengthLevel;
  score: number; // 0-3
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { level: 'weak', score: 0 };

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;

  const level: StrengthLevel = score >= 3 ? 'strong' : score === 2 ? 'fair' : 'weak';
  return { level, score };
}

export function isPasswordAcceptable(password: string): boolean {
  return getPasswordStrength(password).score >= 2;
}
