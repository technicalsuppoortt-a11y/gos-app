'use client';

import React from 'react';
import Script from 'next/script';

export default function TrackingScripts({ trackingCenter }) {
  if (!trackingCenter) return null;

  const { meta, google } = trackingCenter;

  return (
    <>
      {/* Meta Pixel Code */}
      {meta?.connected && meta?.pixel?.id && (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${meta.pixel.id}');
              // fbq('track', 'PageView'); // We track this explicitly via Tracking.page() in the page load effect
            `
          }}
        />
      )}
      
      {meta?.connected && meta?.pixel?.id && (
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${meta.pixel.id}&ev=PageView&noscript=1`}
          />
        </noscript>
      )}

      {/* Google Analytics (GA4) */}
      {google?.connected && google?.property?.measurementId && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${google.property.measurementId}`}
          />
          <Script
            id="google-analytics"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${google.property.measurementId}', {
                  page_path: window.location.pathname,
                });
              `
            }}
          />
        </>
      )}
    </>
  );
}
