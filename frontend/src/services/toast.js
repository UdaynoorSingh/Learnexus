


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
