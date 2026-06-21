export function extractApiError(err: unknown, fallback = 'Une erreur est survenue.'): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const msg = (err as { response?: { data?: { message?: string } } })
      .response?.data?.message;
    return msg ?? fallback;
  }
  return fallback;
}

export function isSubscriptionError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'response' in err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    return status === 402;
  }
  return false;
}
