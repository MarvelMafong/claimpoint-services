const routes = [
  '',
  '/about',
  '/banking',
  '/recovery',
  '/how-it-works',
  '/security',
  '/help',
  '/contact',
  '/login',
  '/signup',
  '/privacy',
  '/terms',
  '/disclosures',
];

export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://claimpoint.vercel.app';

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.7,
  }));
}