const SUPABASE_URL = 'https://gokprabzwmxdvxevgxbj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_G0Jeq1-68TShWEXQ5J4jkQ_rJrHajtr';

const escapeXml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

export default async function handler(_req, res) {
  try {
    const response = await fetch(
      SUPABASE_URL + '/rest/v1/trend_tribe_products?select=id,name,created_at&order=created_at.desc',
      { headers: { apikey: SUPABASE_KEY } }
    );
    if (!response.ok) throw new Error('Supabase product lookup failed');
    const products = await response.json();
    const urls = [
      '<url><loc>https://trend-tribe.vercel.app/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>',
      ...products.map((product) => {
        const loc = 'https://trend-tribe.vercel.app/?product=' + encodeURIComponent(product.id);
        const lastmod = product.created_at ? new Date(product.created_at).toISOString() : '';
        return '<url><loc>' + escapeXml(loc) + '</loc>' +
          (lastmod ? '<lastmod>' + escapeXml(lastmod) + '</lastmod>' : '') +
          '<changefreq>weekly</changefreq><priority>0.8</priority></url>';
      })
    ];
    const xml = '<?xml version="1.0" encoding="UTF-8"?>' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      urls.join('') +
      '</urlset>';
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(xml);
  } catch (error) {
    res.status(500).send('Sitemap generation failed');
  }
}
