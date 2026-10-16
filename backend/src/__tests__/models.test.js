import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { getDb, getPool, closePool } from '../config/database.js';
import * as schema from '../models/schema.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const db = getDb();

describe('Model Tests with Transaction Rollback', () => {
  let testUserId;
  let testPropertyId;
  let testProjectId;
  let testEnquiryId;

  beforeAll(async () => {
    // Ensure database is ready
    await getPool().query('SELECT 1');
  });

  afterAll(async () => {
    await closePool();
  });

  beforeEach(async () => {
    // Create test user
    const passwordHash = await bcrypt.hash('TestPass123!', 12);
    const [testUser] = await db.insert(schema.users).values({
      email: `test${Date.now()}@example.com`,
      passwordHash,
      fullName: 'Test User',
      role: 'staff',
      isActive: true,
    }).returning({ id: schema.users.id });
    testUserId = testUser.id;
  });

  afterEach(async () => {
    // Clean up test data in reverse order of dependencies
    if (testEnquiryId) {
      await db.delete(schema.enquiries).where(eq(schema.enquiries.id, testEnquiryId)).catch(() => {});
      testEnquiryId = null;
    }
    if (testPropertyId) {
      await db.delete(schema.propertyImages).where(eq(schema.propertyImages.propertyId, testPropertyId)).catch(() => {});
      await db.delete(schema.properties).where(eq(schema.properties.id, testPropertyId)).catch(() => {});
      testPropertyId = null;
    }
    if (testProjectId) {
      await db.delete(schema.projectImages).where(eq(schema.projectImages.projectId, testProjectId)).catch(() => {});
      await db.delete(schema.projects).where(eq(schema.projects.id, testProjectId)).catch(() => {});
      testProjectId = null;
    }
    if (testUserId) {
      await db.delete(schema.users).where(eq(schema.users.id, testUserId)).catch(() => {});
      testUserId = null;
    }
  });

  describe('User Model', () => {
    it('should create a user with all required fields', async () => {
      const passwordHash = await bcrypt.hash('TestPass123!', 12);
      const [newUser] = await db.insert(schema.users).values({
        email: `newuser${Date.now()}@example.com`,
        passwordHash,
        fullName: 'New Test User',
        role: 'staff',
        isActive: true,
      }).returning();

      expect(newUser).toBeDefined();
      expect(newUser.id).toBeDefined();
      expect(newUser.email).toBeDefined();
      expect(newUser.fullName).toBe('New Test User');
      expect(newUser.role).toBe('staff');
      expect(newUser.isActive).toBe(true);
      expect(newUser.createdAt).toBeDefined();
      expect(newUser.updatedAt).toBeDefined();
    });

    it('should enforce unique email constraint', async () => {
      const passwordHash = await bcrypt.hash('TestPass123!', 12);
      const email = `duplicate${Date.now()}@example.com`;

      await db.insert(schema.users).values({
        email,
        passwordHash,
        fullName: 'First User',
        role: 'staff',
        isActive: true,
      });

      await expect(
        db.insert(schema.users).values({
          email,
          passwordHash,
          fullName: 'Second User',
          role: 'staff',
          isActive: true,
        })
      ).rejects.toThrow();
    });

    it('should find user by email', async () => {
      const foundUser = await db.query.users.findFirst({
        where: eq(schema.users.email, (await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, testUserId)).limit(1))[0].email),
      });

      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(testUserId);
    });

    it('should update user fields', async () => {
      const [updated] = await db.update(schema.users)
        .set({ fullName: 'Updated Name', role: 'admin' })
        .where(eq(schema.users.id, testUserId))
        .returning();

      expect(updated.fullName).toBe('Updated Name');
      expect(updated.role).toBe('admin');
      expect(updated.updatedAt).toBeDefined();
    });

    it('should delete user', async () => {
      const passwordHash = await bcrypt.hash('TestPass123!', 12);
      const [userToDelete] = await db.insert(schema.users).values({
        email: `todelete${Date.now()}@example.com`,
        passwordHash,
        fullName: 'To Delete',
        role: 'staff',
        isActive: true,
      }).returning({ id: schema.users.id });

      await db.delete(schema.users).where(eq(schema.users.id, userToDelete.id));
      const deleted = await db.query.users.findFirst({
        where: eq(schema.users.id, userToDelete.id),
      });
      expect(deleted).toBeUndefined();
    });
  });

  describe('Property Model', () => {
    it('should create a property with all fields', async () => {
      const [property] = await db.insert(schema.properties).values({
        slug: `test-property-${Date.now()}`,
        title: 'Test Property',
        type: 'house',
        purpose: 'sale',
        status: 'available',
        location: 'Lagos, Nigeria',
        size: '200 sqm',
        price: '50000000',
        priceLabel: '₦50M',
        description: 'A test property',
        features: ['Feature 1', 'Feature 2'],
        accent: 'plum',
        isPublished: false,
      }).returning();

      testPropertyId = property.id;

      expect(property).toBeDefined();
      expect(property.slug).toContain('test-property');
      expect(property.title).toBe('Test Property');
      expect(property.type).toBe('house');
      expect(property.purpose).toBe('sale');
      expect(property.status).toBe('available');
      expect(property.price).toBe('50000000');
      expect(property.features).toEqual(['Feature 1', 'Feature 2']);
      expect(property.isPublished).toBe(false);
    });

    it('should create property images linked to property', async () => {
      const [property] = await db.insert(schema.properties).values({
        slug: `test-property-img-${Date.now()}`,
        title: 'Property with Images',
        type: 'apartment',
        purpose: 'rent',
        status: 'available',
        location: 'Abuja, Nigeria',
        size: '150 sqm',
        price: '3000000',
        priceLabel: '₦3M/yr',
        isPublished: true,
      }).returning();

      testPropertyId = property.id;

      const [image] = await db.insert(schema.propertyImages).values({
        propertyId: property.id,
        url: '/uploads/properties/test-image.webp',
        altText: 'Test image',
        sortOrder: 0,
        isCover: true,
      }).returning();

      expect(image).toBeDefined();
      expect(image.propertyId).toBe(property.id);
      expect(image.isCover).toBe(true);
      expect(image.sortOrder).toBe(0);
    });

    it('should enforce unique slug constraint', async () => {
      const slug = `unique-slug-${Date.now()}`;

      await db.insert(schema.properties).values({
        slug,
        title: 'First Property',
        type: 'land',
        purpose: 'sale',
        status: 'available',
        location: 'Lagos',
      });

      await expect(
        db.insert(schema.properties).values({
          slug,
          title: 'Second Property',
          type: 'land',
          purpose: 'sale',
          status: 'available',
          location: 'Lagos',
        })
      ).rejects.toThrow();
    });

    it('should query published properties only', async () => {
      const [published] = await db.insert(schema.properties).values({
        slug: `published-prop-${Date.now()}`,
        title: 'Published Property',
        type: 'house',
        purpose: 'sale',
        status: 'available',
        location: 'Lagos',
        isPublished: true,
      }).returning({ id: schema.properties.id });

      testPropertyId = published.id;

      const publishedProps = await db.query.properties.findMany({
        where: eq(schema.properties.isPublished, true),
      });

      expect(publishedProps.some(p => p.id === published.id)).toBe(true);

      const unpublished = await db.query.properties.findMany({
        where: eq(schema.properties.isPublished, false),
      });
      expect(unpublished.some(p => p.id === published.id)).toBe(false);
    });

    it('should filter properties by type, purpose, status', async () => {
      const [prop1] = await db.insert(schema.properties).values({
        slug: `filter-test-1-${Date.now()}`,
        title: 'Filter Test 1',
        type: 'house',
        purpose: 'sale',
        status: 'available',
        location: 'Lagos',
        isPublished: true,
      }).returning({ id: schema.properties.id });

      testPropertyId = prop1.id;

      const results = await db.query.properties.findMany({
        where: and(
          eq(schema.properties.type, 'house'),
          eq(schema.properties.purpose, 'sale'),
          eq(schema.properties.status, 'available'),
          eq(schema.properties.isPublished, true)
        ),
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(p => p.type === 'house')).toBe(true);
      expect(results.every(p => p.purpose === 'sale')).toBe(true);
    });
  });

  describe('Project Model', () => {
    it('should create a project with all fields', async () => {
      const [project] = await db.insert(schema.projects).values({
        slug: `test-project-${Date.now()}`,
        title: 'Test Project',
        category: 'residential',
        status: 'planning',
        location: 'Abuja, Nigeria',
        year: '2024',
        size: '500 sqm',
        value: '200000000',
        description: 'A test project',
        highlights: ['Highlight 1', 'Highlight 2'],
        services: ['building_design', 'construction'],
        accent: 'ink',
        isPublished: false,
      }).returning();

      testProjectId = project.id;

      expect(project).toBeDefined();
      expect(project.title).toBe('Test Project');
      expect(project.category).toBe('residential');
      expect(project.status).toBe('planning');
      expect(project.highlights).toEqual(['Highlight 1', 'Highlight 2']);
      expect(project.services).toEqual(['building_design', 'construction']);
    });

    it('should create project images linked to project', async () => {
      const [project] = await db.insert(schema.projects).values({
        slug: `test-project-img-${Date.now()}`,
        title: 'Project with Images',
        category: 'commercial',
        status: 'completed',
        location: 'Lagos',
        isPublished: true,
      }).returning();

      testProjectId = project.id;

      const [image] = await db.insert(schema.projectImages).values({
        projectId: project.id,
        url: '/uploads/projects/test-project.webp',
        altText: 'Project image',
        sortOrder: 0,
        isCover: true,
      }).returning();

      expect(image).toBeDefined();
      expect(image.projectId).toBe(project.id);
      expect(image.isCover).toBe(true);
    });

    it('should enforce unique slug constraint', async () => {
      const slug = `unique-project-slug-${Date.now()}`;

      await db.insert(schema.projects).values({
        slug,
        title: 'First Project',
        category: 'residential',
        status: 'planning',
        location: 'Lagos',
      });

      await expect(
        db.insert(schema.projects).values({
          slug,
          title: 'Second Project',
          category: 'commercial',
          status: 'completed',
          location: 'Abuja',
        })
      ).rejects.toThrow();
    });

    it('should filter projects by category and status', async () => {
      const [project] = await db.insert(schema.projects).values({
        slug: `filter-project-${Date.now()}`,
        title: 'Filter Project',
        category: 'commercial',
        status: 'completed',
        location: 'Lagos',
        isPublished: true,
      }).returning({ id: schema.projects.id });

      testProjectId = project.id;

      const results = await db.query.projects.findMany({
        where: and(
          eq(schema.projects.category, 'commercial'),
          eq(schema.projects.status, 'completed'),
          eq(schema.projects.isPublished, true)
        ),
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(p => p.category === 'commercial')).toBe(true);
      expect(results.every(p => p.status === 'completed')).toBe(true);
    });
  });

  describe('Enquiry Model', () => {
    it('should create an enquiry with all fields', async () => {
      const [enquiry] = await db.insert(schema.enquiries).values({
        name: 'John Doe',
        phone: '+2348012345678',
        email: 'john@example.com',
        service: 'building_design',
        message: 'I need a design for my house',
        status: 'new',
      }).returning();

      testEnquiryId = enquiry.id;

      expect(enquiry).toBeDefined();
      expect(enquiry.name).toBe('John Doe');
      expect(enquiry.phone).toBe('+2348012345678');
      expect(enquiry.email).toBe('john@example.com');
      expect(enquiry.service).toBe('building_design');
      expect(enquiry.status).toBe('new');
    });

    it('should create enquiry linked to property', async () => {
      const [property] = await db.insert(schema.properties).values({
        slug: `enquiry-prop-${Date.now()}`,
        title: 'Property for Enquiry',
        type: 'land',
        purpose: 'sale',
        status: 'available',
        location: 'Lagos',
        isPublished: true,
      }).returning();

      testPropertyId = property.id;

      const [enquiry] = await db.insert(schema.enquiries).values({
        name: 'Jane Doe',
        phone: '+2348012345679',
        service: 'real_estate',
        message: 'Interested in this property',
        propertyId: property.id,
        status: 'new',
      }).returning();

      testEnquiryId = enquiry.id;

      expect(enquiry.propertyId).toBe(property.id);
    });

    it('should create enquiry linked to project', async () => {
      const [project] = await db.insert(schema.projects).values({
        slug: `enquiry-project-${Date.now()}`,
        title: 'Project for Enquiry',
        category: 'residential',
        status: 'completed',
        location: 'Lagos',
        isPublished: true,
      }).returning();

      testProjectId = project.id;

      const [enquiry] = await db.insert(schema.enquiries).values({
        name: 'Bob Smith',
        phone: '+2348012345680',
        service: 'construction',
        message: 'Want similar project',
        projectId: project.id,
        status: 'new',
      }).returning();

      testEnquiryId = enquiry.id;

      expect(enquiry.projectId).toBe(project.id);
    });

    it('should filter enquiries by status', async () => {
      const [enquiry1] = await db.insert(schema.enquiries).values({
        name: 'Status Test 1',
        phone: '+2348012345681',
        service: 'building_design',
        message: 'Test 1',
        status: 'new',
      }).returning({ id: schema.enquiries.id });

      testEnquiryId = enquiry1.id;

      const [enquiry2] = await db.insert(schema.enquiries).values({
        name: 'Status Test 2',
        phone: '+2348012345682',
        service: 'construction',
        message: 'Test 2',
        status: 'closed',
      }).returning({ id: schema.enquiries.id });

      // Can't use testEnquiryId for both, so just test the query
      const newEnquiries = await db.query.enquiries.findMany({
        where: eq(schema.enquiries.status, 'new'),
      });

      const closedEnquiries = await db.query.enquiries.findMany({
        where: eq(schema.enquiries.status, 'closed'),
      });

      expect(newEnquiries.every(e => e.status === 'new')).toBe(true);
      expect(closedEnquiries.every(e => e.status === 'closed')).toBe(true);
    });
  });

  describe('Site Settings Model', () => {
    it('should create and retrieve settings', async () => {
      const key = `test_setting_${Date.now()}`;
      const [setting] = await db.insert(schema.siteSettings).values({
        key,
        value: 'test_value',
        description: 'Test setting',
      }).returning();

      expect(setting.key).toBe(key);
      expect(setting.value).toBe('test_value');

      const retrieved = await db.query.siteSettings.findFirst({
        where: eq(schema.siteSettings.key, key),
      });

      expect(retrieved).toBeDefined();
      expect(retrieved.value).toBe('test_value');
    });

    it('should upsert settings on conflict', async () => {
      const key = `upsert_test_${Date.now()}`;

      await db.insert(schema.siteSettings).values({
        key,
        value: 'original',
        description: 'Original',
      }).onConflictDoUpdate({
        target: schema.siteSettings.key,
        set: { value: 'updated', updatedAt: new Date() },
      });

      const retrieved = await db.query.siteSettings.findFirst({
        where: eq(schema.siteSettings.key, key),
      });

      expect(retrieved.value).toBe('updated');
    });
  });

  describe('Transaction Rollback', () => {
    it('should rollback on error within transaction', async () => {
      const email = `transaction-test-${Date.now()}@example.com`;

      // First insert succeeds
      const [txUser] = await db.insert(schema.users).values({
        email,
        passwordHash: await bcrypt.hash('TestPass123!', 12),
        fullName: 'Transaction Test',
        role: 'staff',
        isActive: true,
      }).returning({ id: schema.users.id });

      testUserId = txUser.id;

      // Simulate a transaction that fails
      try {
        await db.transaction(async (tx) => {
          await tx.update(schema.users).set({ fullName: 'Updated in Transaction' }).where(eq(schema.users.id, testUserId));
          // Force an error
          throw new Error('Simulated error');
        });
      } catch (err) {
        expect(err.message).toBe('Simulated error');
      }

      // Verify rollback occurred - name should not be updated
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, testUserId),
      });
      expect(user.fullName).toBe('Transaction Test'); // Original name preserved
    });
  });

  describe('Cascade Deletes', () => {
    it('should cascade delete property images when property is deleted', async () => {
      const [property] = await db.insert(schema.properties).values({
        slug: `cascade-prop-${Date.now()}`,
        title: 'Cascade Test Property',
        type: 'house',
        purpose: 'sale',
        status: 'available',
        location: 'Lagos',
      }).returning({ id: schema.properties.id });

      testPropertyId = property.id;

      await db.insert(schema.propertyImages).values({
        propertyId: property.id,
        url: '/uploads/test.webp',
        altText: 'Test',
        sortOrder: 0,
        isCover: true,
      });

      await db.delete(schema.properties).where(eq(schema.properties.id, property.id));

      const images = await db.query.propertyImages.findMany({
        where: eq(schema.propertyImages.propertyId, property.id),
      });

      expect(images.length).toBe(0);
    });

    it('should cascade delete project images when project is deleted', async () => {
      const [project] = await db.insert(schema.projects).values({
        slug: `cascade-proj-${Date.now()}`,
        title: 'Cascade Test Project',
        category: 'residential',
        status: 'planning',
        location: 'Lagos',
      }).returning({ id: schema.projects.id });

      testProjectId = project.id;

      await db.insert(schema.projectImages).values({
        projectId: project.id,
        url: '/uploads/test.webp',
        altText: 'Test',
        sortOrder: 0,
        isCover: true,
      });

      await db.delete(schema.projects).where(eq(schema.projects.id, project.id));

      const images = await db.query.projectImages.findMany({
        where: eq(schema.projectImages.projectId, project.id),
      });

      expect(images.length).toBe(0);
    });
  });
});