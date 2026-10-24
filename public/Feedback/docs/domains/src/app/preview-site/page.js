'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import LiveSiteView from '@/components/sites/LiveSiteView';

function LiveSiteContent() {
  const searchParams = useSearchParams();
  const funnelId = searchParams?.get('funnelId') || '';
  const storeId = searchParams?.get('storeId') || '';
  const rawStepIdx = searchParams?.get('stepIdx') ?? searchParams?.get('pageIdx');
  const stepIdx = (rawStepIdx !== null && rawStepIdx !== undefined && rawStepIdx !== '')
    ? Number(rawStepIdx)
    : undefined;
  const isDraft = searchParams?.get('draft') === '1';

  const browserHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const browserPath = typeof window !== 'undefined' ? window.location.pathname : '';

  const host = searchParams?.get('host') || browserHost;
  const path = searchParams?.get('path') || (browserPath && browserPath !== '/preview-site' ? browserPath : '/');
  const productId = searchParams?.get('productId') || '';

  return (
    <LiveSiteView
      funnelId={funnelId}
      storeId={storeId}
      stepIdx={stepIdx}
      path={path}
      host={host}
      isDraft={isDraft}
      productId={productId}
    />
  );
}

export default function LiveSitePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', background: '#0a0a0f', color: '#fff' }}>Loading website...</div>}>
      <LiveSiteContent />
    </Suspense>
  );
}
