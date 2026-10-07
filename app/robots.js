export default function robots() {
  const base = process.env.SITE_URL || 'https://www.iliashossain.site';
  return { rules: [{ userAgent: '*', allow: '/' }], sitemap: `${base}/sitemap.xml` };
}
