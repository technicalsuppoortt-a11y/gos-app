/**
 * Tracking SDK for UpKlick
 * Safely dispatches events to Meta Pixel (fbq) and Google Analytics (gtag)
 */

// Helper to notify the local UpKlick dashboard (Tracking Center) for Realtime Logs
const notifyDashboard = (eventName, payload) => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('upklick_track', {
      detail: {
        event: eventName,
        payload: payload,
        time: new Date().toLocaleTimeString('en-GB', { hour12: false })
      }
    });
    window.dispatchEvent(event);
  }
};

export const Tracking = {
  /**
   * Track a standard page view
   */
  page: () => {
    if (typeof window !== 'undefined') {
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'PageView');
      }
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'page_view');
      }
      notifyDashboard('Page View', {});
    }
  },

  /**
   * Track a new lead capture / signup
   */
  lead: (payload = {}) => {
    if (typeof window !== 'undefined') {
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Lead', payload);
      }
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'generate_lead', payload);
      }
      notifyDashboard('Lead', payload);
    }
  },

  /**
   * Track a scheduled meeting / booking
   */
  bookMeeting: (payload = {}) => {
    if (typeof window !== 'undefined') {
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Schedule', payload);
      }
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'book_meeting', payload);
      }
      notifyDashboard('Book Meeting', payload);
    }
  },

  /**
   * Track a purchase event
   * @param {number} value The purchase amount
   * @param {string} currency Currency code (e.g. USD)
   */
  purchase: (value, currency = 'USD', payload = {}) => {
    if (typeof window !== 'undefined') {
      const data = { value, currency, ...payload };
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Purchase', data);
      }
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'purchase', data);
      }
      notifyDashboard('Purchase', data);
    }
  },

  /**
   * Identify user
   */
  identify: (userId, traits = {}) => {
    if (typeof window !== 'undefined') {
      if (typeof window.gtag === 'function') {
        window.gtag('set', 'user_properties', { user_id: userId, ...traits });
      }
      notifyDashboard('Identify User', { userId, ...traits });
    }
  },

  /**
   * Generic custom event tracker
   * @param {string} eventName The name of the event
   * @param {object} payload Additional metadata
   */
  track: (eventName, payload = {}) => {
    if (typeof window !== 'undefined') {
      if (typeof window.fbq === 'function') {
        window.fbq('trackCustom', eventName, payload);
      }
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, payload);
      }
      notifyDashboard(eventName, payload);
    }
  },

  /**
   * Alias for custom event tracking
   */
  custom: (eventName, payload = {}) => {
    if (typeof window !== 'undefined') {
      if (typeof window.fbq === 'function') {
        window.fbq('trackCustom', eventName, payload);
      }
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, payload);
      }
      notifyDashboard(eventName, payload);
    }
  }
};
