// Global toast utility — fires custom events that Layout.jsx listens to.
// This allows any part of the app (including api.js interceptors) to show toasts.

export const showToast = (type, message, step = null) => {
  window.dispatchEvent(
    new CustomEvent('learnexus-toast', {
      detail: { type, message, step }
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
