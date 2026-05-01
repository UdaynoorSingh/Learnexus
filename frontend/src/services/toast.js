

export const showToast = (type, message, step = null) => {
  window.dispatchEvent(
    new CustomEvent('learnexus-toast', {
      detail: { type, message, step },
    })
  );
};

export const showRateLimitToast = () => {
  showToast(
    'error',
    'Learnexus AI is currently cooling down to prevent overload. Please try your request again in 30 seconds.',
    '⏳ Rate Limit'
  );
};

export function extractApiErrorMessage(error) {
  if (!error) return 'Something went wrong. Please try again.';
  const data = error.response?.data;
  if (!data && error.message) return error.message;
  if (typeof data === 'string') return data;
  if (typeof data?.detail === 'string') return data.detail;
  if (data?.detail && typeof data.detail === 'object') {
    try {
      return JSON.stringify(data.detail);
    } catch {
      return 'Request failed.';
    }
  }
  if (Array.isArray(data?.errors)) {
    const parts = data.errors.map((e) => e?.msg || e?.message).filter(Boolean);
    if (parts.length) return parts.join(' ');
  }
  return (
    data?.error ||
    data?.message ||
    data?.msg ||
    (typeof data === 'object' ? '' : String(data)) ||
    error.message ||
    'Something went wrong. Please try again.'
  );
}

export function isLikelyRateLimitError(error) {
  const status = error.response?.status;
  const errorMsg = JSON.stringify(error.response?.data || '').toLowerCase();
  return (
    status === 429 ||
    (status === 500 &&
      (errorMsg.includes('rate') ||
        errorMsg.includes('quota') ||
        errorMsg.includes('resource_exhausted') ||
        errorMsg.includes('retry in') ||
        errorMsg.includes('too many requests')))
  );
}

export function asRateLimitRejection(error) {
  if (!isLikelyRateLimitError(error)) return null;
  showRateLimitToast();
  const rateLimitError = new Error('RATE_LIMIT');
  rateLimitError.isRateLimit = true;
  rateLimitError.response = error.response;
  rateLimitError.config = error.config;
  return rateLimitError;
}

export function showApiErrorToast(error) {
  if (!error || error.config?.skipErrorToast || error.isRateLimit) return;
  if (error.__learnexusGlobalToastShown) return;
  error.__learnexusGlobalToastShown = true;

  const status = error.response?.status;
  const raw = extractApiErrorMessage(error).trim();
  const haystack = `${raw} ${JSON.stringify(error.response?.data || {})}`.toLowerCase();

  if (status === 401) {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const url = error.config?.url || '';
    if (path === '/login' || url.includes('admin-login') || url.includes('verify-otp')) {
      showToast('error', raw || 'Sign-in failed. Check your email or password.', 'Authentication');
      return;
    }
    showToast('error', 'Session expired or access denied. Please sign in again.', 'Authentication');
    return;
  }

  if (status === 403 || status === 402) {
    if (
      haystack.includes('not enough credit') ||
      haystack.includes('insufficient credit') ||
      haystack.includes('credits') ||
      haystack.includes('credit') ||
      status === 402
    ) {
      showToast('error', 'Transaction Failed: Insufficient ⚡ Credits.', 'Credits');
      return;
    }
    showToast('error', raw || 'You do not have permission for this action.', 'Access denied');
    return;
  }

  if (status === 400) {
    if (
      haystack.includes('insufficient credit') ||
      haystack.includes('not enough credit') ||
      (haystack.includes('credit') && haystack.includes('need'))
    ) {
      showToast('error', 'Transaction Failed: Insufficient ⚡ Credits.', 'Credits');
      return;
    }
    if (
      /toxic|moderat|flagged|inappropriate|blocked|safety|harmful|is_toxic|istoxic|content policy|policy violation/i.test(
        haystack
      )
    ) {
      showToast(
        'error',
        raw
          ? `Content blocked: ${raw}`
          : 'Your content was blocked by our AI safety filter. Please revise and try again.',
        '🛡️ AI Safety'
      );
      return;
    }
    showToast('error', raw || 'Invalid request. Please check your input.', 'Bad request');
    return;
  }

  if (status === 429) {
    showRateLimitToast();
    return;
  }

  if (status >= 500) {
    showToast(
      'error',
      raw || 'Our AI service hit a temporary error. Please try again in a moment.',
      'Server error'
    );
    return;
  }

  if (!error.response) {
    const aborted = error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout');
    showToast(
      'error',
      aborted
        ? 'Request timed out. The AI pipeline may still be running — try again shortly.'
        : 'Network error: no response from the server. Check your connection.',
      aborted ? 'Timeout' : 'Network'
    );
    return;
  }

  showToast('error', raw || `Request failed (${status}).`, 'Error');
}
