import bcrypt from 'bcryptjs';
import { getPool, getDb, closePool, testConnection } from './config/database.js';
import * as schema from './models/schema.js';
import { eq } from 'drizzle-orm';
import logger from './config/logger.js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const db = getDb();

const sampleProperties = [
  {
    slug: 'ikeja-residential-plot',
    title: 'Residential Plot - Ikeja GRA',
    type: 'land',
    purpose: 'sale',
    status: 'available',
    location: 'Ikeja GRA, Lagos',
    size: '650 sqm',
    price: '185000000.00',
    priceLabel: '₦185M',
    description: 'Prime residential plot in the heart of Ikeja GRA. Flat, dry land with clear title and excellent road access. Ideal for a luxury family home.',
    features: ['Clear C of O', 'Corner plot', 'Perimeter fencing', 'Gated estate'],
    accent: 'plum',
    isPublished: true,
    publishedAt: new Date(),
  },
  {
    slug: 'lekki-luxury-apartment',
    title: '3-Bed Luxury Apartment - Lekki Phase 1',
    type: 'apartment',
    purpose: 'rent',
    status: 'available',
    location: 'Lekki Phase 1, Lagos',
    size: '245 sqm',
    price: '4200000.00',
    priceLabel: '₦4.2M/yr',
    description: 'Spacious 3-bedroom apartment in a secure, well-managed development. Modern finishes, balcony with lagoon views, 24/7 power backup.',
    features: ['Lagoon views', 'En-suite bedrooms', 'BQ', 'Gym & pool access'],
    accent: 'violet',
    isPublished: true,
    publishedAt: new Date(),
  },
  {
    slug: 'ibadan-family-home',
    title: '4-Bed Detached House - Bodija, Ibadan',
    type: 'house',
    purpose: 'sale',
    status: 'under_offer',
    location: 'Bodija, Ibadan, Oyo',
    size: '420 sqm (land) / 320 sqm (built)',
    price: '95000000.00',
    priceLabel: '₦95M',
    description: 'Elegant 4-bedroom detached home on a generous plot. Mature garden, borehole, solar system, separate staff quarters. Walking distance to top schools.',
    features: ['Solar + inverter', 'Borehole', 'Staff quarters', 'Mature landscaping'],
    accent: 'sand',
    isPublished: true,
    publishedAt: new Date(),
  },
  {
    slug: 'abuja-commercial-office',
    title: 'Grade A Office Suite - Wuse 2, Abuja',
    type: 'commercial',
    purpose: 'rent',
    status: 'available',
    location: 'Wuse 2, Abuja, FCT',
    size: '180 sqm',
    price: '12500000.00',
    priceLabel: '₦12.5M/yr',
    description: 'Modern office suite in a prime commercial building. Raised floors, VRF air-conditioning, high-speed fibre, dedicated parking. Suitable for corporate HQ.',
    features: ['Raised floors', 'VRF AC', 'Fibre ready', '24/7 security'],
    accent: 'ink',
    isPublished: true,
    publishedAt: new Date(),
  },
  {
    slug: 'lagos-mixed-use-land',
    title: 'Mixed-Use Development Site - Yaba',
    type: 'land',
    purpose: 'sale',
    status: 'available',
    location: 'Yaba, Lagos',
    size: '1,200 sqm',
    price: '420000000.00',
    priceLabel: '₦420M',
    description: 'Strategic corner plot in Yaba\'s tech corridor. Suitable for mixed-use residential/commercial development. High footfall, excellent connectivity.',
    features: ['Corner plot', 'Tech hub location', 'High density approved', 'Fibre infrastructure'],
    accent: 'olive',
    isPublished: true,
    publishedAt: new Date(),
  },
];

const sampleProjects = [
  {
    slug: 'modern-home-ikeja',
    title: 'Modern Family Residence - Ikeja GRA',
    category: 'residential',
    status: 'completed',
    location: 'Ikeja GRA, Lagos',
    year: '2024',
    size: '450 sqm',
    value: '180000000.00',
    description: 'A contemporary 5-bedroom family home featuring clean lines, natural ventilation, and indoor-outdoor flow. Designed for a young family with entertaining spaces on the ground floor and private quarters above.',
    highlights: ['Passive cooling design', 'Solar PV integration', 'Smart home automation', 'Landscaped garden with irrigation'],
    services: ['building_design', 'construction', 'real_estate'],
    accent: 'plum',
    isPublished: true,
    publishedAt: new Date(),
  },
  {
    slug: 'bungalow-ibadan',
    title: 'Executive Bungalow - Bodija, Ibadan',
    category: 'residential',
    status: 'completed',
    location: 'Bodija, Ibadan, Oyo',
    year: '2023',
    size: '320 sqm',
    value: '95000000.00',
    description: 'Single-storey executive residence on a generous corner plot. Accessible design with wide corridors, step-free access throughout, and a focus on ageing-in-place principles.',
    highlights: ['Universal design', 'Borehole & water treatment', 'Backup power system', 'Perimeter security'],
    services: ['building_design', 'construction', 'project_support'],
    accent: 'sand',
    isPublished: true,
    publishedAt: new Date(),
  },
  {
    slug: 'apartment-complex-lekki',
    title: 'Luxury Apartment Block - Lekki Phase 1',
    category: 'residential',
    status: 'ongoing',
    location: 'Lekki Phase 1, Lagos',
    year: '2024-2025',
    size: '2,800 sqm (GFA)',
    value: '2400000000.00',
    description: '12-unit luxury apartment building (2, 3 & 4 bedroom units) with shared amenities. RC frame construction, curtain wall glazing, podium parking. Targeting high-end rental market.',
    highlights: ['Curtain wall facade', 'Podium car park', 'Rooftop terrace & pool', 'Building management system'],
    services: ['building_design', 'construction', 'project_support'],
    accent: 'violet',
    isPublished: true,
    publishedAt: new Date(),
  },
  {
    slug: 'courtyard-residence-victoria-island',
    title: 'Courtyard House - Victoria Island',
    category: 'residential',
    status: 'completed',
    location: 'Victoria Island, Lagos',
    year: '2022',
    size: '600 sqm',
    value: '320000000.00',
    description: 'Inward-looking courtyard residence providing privacy and tranquility in a dense urban context. Central courtyard organizes circulation and brings light deep into the plan.',
    highlights: ['Central courtyard', 'Cross ventilation', 'Water feature', 'Art integration'],
    services: ['building_design', 'construction'],
    accent: 'rose',
    isPublished: true,
    publishedAt: new Date(),
  },
];

const siteSettings = [
  { key: 'whatsapp_number', value: '2349017017156', description: 'WhatsApp business number for enquiries' },
  { key: 'company_phone', value: '+234 901 701 7156', description: 'Company phone number' },
  { key: 'company_email', value: 'info@otitech.com', description: 'Company email address' },
  { key: 'company_address', value: 'Lagos, Nigeria', description: 'Company physical address' },
  { key: 'google_maps_embed', value: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.5!2d3.3792!3d6.5244!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103b8b9b9b9b9b9b%3A0x9b9b9b9b9b9b9b9b!2sLagos%2C%20Nigeria!5e0!3m2!1sen!2sng!4v1699999999999!5m2!1sen!2sng', description: 'Google Maps embed URL for contact page' },
];

const seed = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword || adminPassword.length < 12) {
      throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters in backend/.env before seeding.');
    }

    const connected = await testConnection();
    if (!connected) {
      logger.warn('Database not available, skipping seed');
      return;
    }

    logger.info('Seeding database...');

    const adminExists = await db.select().from(schema.users).where(eq(schema.users.email, adminEmail)).limit(1);
    if (!adminExists[0]) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await db.insert(schema.users).values({
        email: adminEmail,
        passwordHash,
        fullName: process.env.ADMIN_FULL_NAME?.trim() || 'OTI-TECH Admin',
        role: 'admin',
      });
      logger.info({ email: adminEmail }, 'Created administrator account');
    }

    for (const prop of sampleProperties) {
      const exists = await db.select().from(schema.properties).where(eq(schema.properties.slug, prop.slug)).limit(1);
      if (!exists[0]) {
        await db.insert(schema.properties).values(prop);
        logger.info(`Seeded property: ${prop.title}`);
      }
    }

    for (const proj of sampleProjects) {
      const exists = await db.select().from(schema.projects).where(eq(schema.projects.slug, proj.slug)).limit(1);
      if (!exists[0]) {
        await db.insert(schema.projects).values(proj);
        logger.info(`Seeded project: ${proj.title}`);
      }
    }

    for (const setting of siteSettings) {
      const exists = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.key, setting.key)).limit(1);
      if (!exists[0]) {
        await db.insert(schema.siteSettings).values(setting);
        logger.info(`Seeded setting: ${setting.key}`);
      }
    }

    logger.info('Database seeding completed');
  } catch (err) {
    logger.error({ err }, 'Seeding failed');
    throw err;
  } finally {
    await closePool();
  }
};

const isMainModule = process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMainModule) {
  seed().catch((err) => {
    logger.error({ err }, 'Seed script failed');
    process.exit(1);
  });
}

export default seed;
