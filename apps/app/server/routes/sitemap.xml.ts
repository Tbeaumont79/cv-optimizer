/**
 * Sitemap minimal (SEO de base). Une seule URL pour l'instant (landing) ;
 * à étendre quand d'autres pages publiques arrivent. Le domaine canonique est
 * lu depuis la config runtime publique (override NUXT_PUBLIC_SITE_URL au déploiement).
 */
export default defineEventHandler((event) => {
  const siteUrl = useRuntimeConfig(event).public.siteUrl
  const urls = ['/'] // ajouter ici les pages publiques additionnelles
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`).join('\n')}
</urlset>`
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return body
})
