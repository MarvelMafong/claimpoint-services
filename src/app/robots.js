export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://claimpoint.vercel.app';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/accounts',
        '/activity',
        '/deposits',
        '/withdrawals',
        '/transfers',
        '/savings',
        '/beneficiaries',
        '/referrals',
        '/settings',
        '/support',
        '/claims',
        '/verify',
        '/api',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}