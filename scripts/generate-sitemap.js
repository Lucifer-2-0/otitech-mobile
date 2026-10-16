#!/usr/bin/env node

/**
 * Sitemap Generation Script
 * Run this at build time to generate sitemap.xml and robots.txt
 * Usage: node scripts/generate-sitemap.js
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const BASE_URL = (process.env.SITE_URL || 'https://otitech.com').replace(/\/+$/, '');

// Static pages
const staticPages = [
  { url: '/', changefreq: 'weekly', priority: 1.0 },
  { url: '/pages/services.html', changefreq: 'monthly', priority: 0.9 },
  { url: '/pages/properties.html', changefreq: 'daily', priority: 0.9 },
  { url: '/pages/projects.html', changefreq: 'weekly', priority: 0.8 },
  { url: '/pages/about.html', changefreq: 'monthly', priority: 0.7 },
  { url: '/pages/contact.html', changefreq: 'monthly', priority: 0.7 },
];

function generateSitemap(pages, baseUrl) {
  const xmlEscape = value => String(value).replace(/[<>&\"']/g, character => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '\"': '&quot;',
    "'": '&apos;',
  })[character]);

  const urls = pages.map(page => {
    const lastmod = page.lastmod ? `\n    <lastmod>${xmlEscape(page.lastmod)}</lastmod>` : '';
    return `
  <url>
    <loc>${xmlEscape(new URL(page.url, `${baseUrl}/`).href)}</loc>${lastmod}
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

async function main() {
  console.log('Generating sitemap...');
  
  const allPages = [...staticPages];
  
  // Generate main sitemap
  const sitemap = generateSitemap(allPages, BASE_URL);
  const sitemapPath = resolve(projectRoot, 'sitemap.xml');
  writeFileSync(sitemapPath, sitemap);
  console.log(`Generated ${sitemapPath}`);
  
  // Keep the sitemap reference in sync without replacing custom crawl rules.
  const robotsPath = resolve(projectRoot, 'robots.txt');
  const defaultRobotsContent = `User-agent: *
Allow: /

Disallow: /admin/
Disallow: /seller/
Disallow: /api/
Disallow: /backend/

Sitemap: ${BASE_URL}/sitemap.xml
`;
  const existingRobots = existsSync(robotsPath) ? readFileSync(robotsPath, 'utf8') : defaultRobotsContent;
  const robotsContent = /^Sitemap:\s*.*$/m.test(existingRobots)
    ? existingRobots.replace(/^Sitemap:\s*.*$/m, `Sitemap: ${BASE_URL}/sitemap.xml`)
    : `${existingRobots.trimEnd()}\n\nSitemap: ${BASE_URL}/sitemap.xml\n`;
  writeFileSync(robotsPath, robotsContent);
  console.log(`Generated ${robotsPath}`);
  
  console.log('Sitemap generation complete!');
}

main().catch(console.error);
