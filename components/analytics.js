export const plausibleScript = (domain, apiHost = 'https://plausible.io') => `
<script defer data-domain="${domain}" src="${apiHost}/js/script.js"></script>
`;

export const consentBannerHTML = () => `
<div class="cookie-consent" id="cookieConsent" role="dialog" aria-label="Cookie consent" hidden>
  <div class="cookie-consent-content">
    <p class="cookie-consent-text">
      We use analytics cookies to understand how you use our website so we can make it better.
      <a href="/pages/privacy.html" class="cookie-consent-link">Read our privacy policy</a>.
    </p>
    <div class="cookie-consent-actions">
      <button type="button" class="btn btn-secondary cookie-consent-decline" data-action="decline">
        Decline
      </button>
      <button type="button" class="btn btn-primary cookie-consent-accept" data-action="accept">
        Accept
      </button>
    </div>
  </div>
</div>
`;

export const initConsentBanner = (domain, apiHost = 'https://plausible.io') => {
  // Check if consent was already given
  const consent = localStorage.getItem('cookie_consent');
  if (consent === 'accepted') {
    loadPlausible(domain, apiHost);
    return;
  }
  if (consent === 'declined') {
    return;
  }

  // Show banner
  const banner = document.getElementById('cookieConsent');
  if (banner) {
    banner.hidden = false;
    
    banner.querySelector('[data-action="accept"]').addEventListener('click', () => {
      localStorage.setItem('cookie_consent', 'accepted');
      banner.hidden = true;
      loadPlausible(domain, apiHost);
    });

    banner.querySelector('[data-action="decline"]').addEventListener('click', () => {
      localStorage.setItem('cookie_consent', 'declined');
      banner.hidden = true;
    });
  }
};

const loadPlausible = (domain, apiHost) => {
  if (document.querySelector(`script[data-domain="${domain}"]`)) return;
  
  const script = document.createElement('script');
  script.defer = true;
  script.dataset.domain = domain;
  script.src = `${apiHost}/js/script.js`;
  document.head.appendChild(script);
};

export const initPlausible = (domain, apiHost = 'https://plausible.io') => {
  // Load immediately if already consented
  if (localStorage.getItem('cookie_consent') === 'accepted') {
    loadPlausible(domain, apiHost);
  }
};

export default {
  plausibleScript,
  consentBannerHTML,
  initConsentBanner,
  initPlausible,
};