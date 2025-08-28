declare global {
  interface Window { grecaptcha?: any }
}

let loadPromise: Promise<any> | null = null;

export function loadRecaptchaEnterprise(siteKey: string): Promise<any> {
  if (window.grecaptcha?.enterprise) return Promise.resolve(window.grecaptcha);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}`;
    s.async = true;
    s.defer = true;

    s.onload = () => {
      const g = window.grecaptcha?.enterprise ? window.grecaptcha : null;
      if (!g) return reject(new Error('reCAPTCHA Enterprise loaded but grecaptcha.enterprise is missing'));
      window.grecaptcha.enterprise.ready(() => resolve(window.grecaptcha));
    };
    s.onerror = () => reject(new Error('Failed to load reCAPTCHA Enterprise'));
    document.head.appendChild(s);
  });

  return loadPromise;
}

export async function getRecaptchaToken(siteKey: string, action: string): Promise<string> {
  const grecaptcha = await loadRecaptchaEnterprise(siteKey);
  return grecaptcha.enterprise.execute(siteKey, { action });
}
