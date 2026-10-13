import type { Setup } from './onboarding-store';

// Reuse the existing mock repositories so generated drafts appear in their native modules.
export async function generateFirstAsset(setup: Setup, asset: NonNullable<Setup['asset']>, userId: string) {
  const id = asset.id || `onboarding-${userId}`;
  if (asset.type === 'Booking page') {
    const { blankPage, readPages, write, KEYS, slugify } = await import('../booking/model');
    const previous = readPages();
    const page = { ...(previous.find(p => p.id === id) || blankPage()), id, name: asset.name, slug: `${slugify(asset.name)}-${userId.slice(0, 8)}`, active: false, duration: Number(asset.duration), durationOptions: [Number(asset.duration)], hostName: setup.name, hostTimezone: setup.timezone, description: setup.description, color: setup.color, price: Number(asset.price), free: Number(asset.price) === 0, currency: setup.currency };
    write(KEYS.pages, previous.some(p => p.id === id) ? previous.map(p => p.id === id ? page : p) : [page, ...previous]);
  } else {
    const [{ saveProduct }, { defaultConfig }] = await Promise.all([import('../commerce/repository'), import('../commerce/model')]);
    const config = defaultConfig('Digital Product', asset.price);
    if (!/^[A-Z]{3}$/.test(setup.currency)) throw new Error('Choose a supported currency.');
    config.currency = setup.currency as typeof config.currency; config.amount = Number(asset.price);
    if (config.experience) { config.experience.oneTimeAmount = Number(asset.price); config.experience.shortDescription = setup.description; }
    saveProduct({ id, name: asset.name, type: 'Digital Product', price: asset.price, stats: [['sales', '0 sales']], status: 'Draft', sales: '0', revenue: '0', art: 'templates', tag: 'Digital Product', description: setup.description, config });
  }
  return { ...asset, id };
}
