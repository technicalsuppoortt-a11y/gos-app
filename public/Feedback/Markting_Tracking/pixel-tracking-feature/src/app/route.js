import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { adminDb } from '@/utils/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'landing-page.html');
  let html = fs.readFileSync(filePath, 'utf8');

  try {
    if (adminDb) {
      const globalDoc = await adminDb.collection('tenants').doc('global').get();
      if (globalDoc.exists) {
        const data = globalDoc.data();
        const tc = data?.trackingCenter;
        if (tc) {
          let scriptsToInject = '';
          if (tc.meta?.connected && tc.meta?.pixel?.id) {
            const pixelId = tc.meta.pixel.id;
            scriptsToInject += `
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/></noscript>
`;
          }
          if (tc.google?.connected && tc.google?.property?.measurementId) {
            const gaId = tc.google.property.measurementId;
            scriptsToInject += `
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${gaId}');
</script>
`;
          }

          if (scriptsToInject) {
            html = html.replace('</head>', `${scriptsToInject}\n</head>`);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error injecting tracking scripts into landing page:", err);
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
