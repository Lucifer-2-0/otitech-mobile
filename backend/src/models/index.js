import db, { getDb } from '../config/database.js';
import * as schema from './schema.js';
import { eq, and, or, ilike, desc, asc, count, gte, lte, inArray, sql } from 'drizzle-orm';

const dbInstance = getDb();

export class BaseModel {
  constructor(table) {
    this.table = table;
  }

  async findAll(options = {}) {
    const { where, orderBy, limit, offset } = options;
    let query = dbInstance.select().from(this.table);

    if (where) {
      query = query.where(where);
    }

    if (orderBy) {
      query = query.orderBy(orderBy);
    }

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.offset(offset);
    }

    return query;
  }

  async findById(id) {
    const result = await dbInstance.select().from(this.table).where(eq(this.table.id, id)).limit(1);
    return result[0] || null;
  }

  async findOne(where) {
    const result = await dbInstance.select().from(this.table).where(where).limit(1);
    return result[0] || null;
  }

  async create(data) {
    const result = await dbInstance.insert(this.table).values(data).returning();
    return result[0];
  }

  async update(id, data) {
    const updates = this.table.updatedAt ? { ...data, updatedAt: new Date() } : data;
    const result = await dbInstance.update(this.table).set(updates).where(eq(this.table.id, id)).returning();
    return result[0];
  }

  async delete(id) {
    await dbInstance.delete(this.table).where(eq(this.table.id, id));
    return true;
  }

  async count(where) {
    let query = dbInstance.select({ count: count() }).from(this.table);
    if (where) query = query.where(where);
    const result = await query;
    return Number(result[0]?.count || 0);
  }
}

export class PropertyModel extends BaseModel {
  constructor() {
    super(schema.properties);
  }

  async findPublished(options = {}) {
    const { type, purpose, status, location, minPrice, maxPrice, limit, offset } = options;
    const conditions = [eq(this.table.isPublished, true), eq(this.table.reviewStatus, 'approved')];

    if (type) conditions.push(eq(this.table.type, type));
    if (purpose) conditions.push(eq(this.table.purpose, purpose));
    if (status) conditions.push(eq(this.table.status, status));
    if (location) conditions.push(ilike(this.table.location, `%${location}%`));
    if (minPrice) conditions.push(gte(this.table.price, minPrice));
    if (maxPrice) conditions.push(lte(this.table.price, maxPrice));

    const records = await this.findAll({
      where: and(...conditions),
      orderBy: desc(this.table.createdAt),
      limit,
      offset,
    });
    if (!records.length) return records;
    const imageRows = await dbInstance.select().from(schema.propertyImages)
      .where(inArray(schema.propertyImages.propertyId, records.map((record) => record.id)))
      .orderBy(asc(schema.propertyImages.sortOrder));
    const imagesByProperty = new Map();
    for (const image of imageRows) {
      const images = imagesByProperty.get(image.propertyId) || [];
      images.push(image);
      imagesByProperty.set(image.propertyId, images);
    }
    return records.map((record) => {
      const images = imagesByProperty.get(record.id) || [];
      const { sellerId, reviewStatus, reviewedAt, reviewedBy, ...publicRecord } = record;
      return { ...publicRecord, images, image: images.find((image) => image.isCover)?.url || images[0]?.url || null };
    });
  }

  async findBySlug(slug) {
    const property = await this.findOne(and(
      eq(this.table.slug, slug),
      eq(this.table.isPublished, true),
      eq(this.table.reviewStatus, 'approved'),
    ));
    if (!property) return null;
    const images = await dbInstance.select().from(schema.propertyImages)
      .where(eq(schema.propertyImages.propertyId, property.id)).orderBy(asc(schema.propertyImages.sortOrder));
    const { sellerId, reviewStatus, reviewedAt, reviewedBy, ...publicRecord } = property;
    return { ...publicRecord, images };
  }

  async findOwnedBy(sellerId) {
    const records = await this.findAll({
      where: eq(this.table.sellerId, sellerId),
      orderBy: desc(this.table.createdAt),
      limit: 50,
    });
    if (!records.length) return records;
    const imageRows = await dbInstance.select().from(schema.propertyImages)
      .where(inArray(schema.propertyImages.propertyId, records.map((record) => record.id)))
      .orderBy(asc(schema.propertyImages.sortOrder));
    const imagesByProperty = new Map();
    for (const image of imageRows) {
      const images = imagesByProperty.get(image.propertyId) || [];
      images.push(image);
      imagesByProperty.set(image.propertyId, images);
    }
    return records.map((record) => {
      const images = imagesByProperty.get(record.id) || [];
      return { ...record, images, image: images.find((image) => image.isCover)?.url || images[0]?.url || null };
    });
  }

  async findAllForAdmin(options = {}) {
    const { type, purpose, status, location, minPrice, maxPrice, reviewStatus, limit, offset } = options;
    const conditions = [];
    if (type) conditions.push(eq(this.table.type, type));
    if (purpose) conditions.push(eq(this.table.purpose, purpose));
    if (status) conditions.push(eq(this.table.status, status));
    if (location) conditions.push(ilike(this.table.location, `%${location}%`));
    if (minPrice) conditions.push(gte(this.table.price, minPrice));
    if (maxPrice) conditions.push(lte(this.table.price, maxPrice));
    if (reviewStatus) conditions.push(eq(this.table.reviewStatus, reviewStatus));
    const records = await super.findAll({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: desc(this.table.createdAt),
      limit,
      offset,
    });
    const sellerIds = [...new Set(records.map((record) => record.sellerId).filter(Boolean))];
    if (!sellerIds.length) return records;
    const sellers = await dbInstance.select({ id: schema.users.id, fullName: schema.users.fullName, email: schema.users.email })
      .from(schema.users).where(inArray(schema.users.id, sellerIds));
    const sellersById = new Map(sellers.map((seller) => [seller.id, seller]));
    return records.map((record) => ({ ...record, seller: sellersById.get(record.sellerId) || null }));
  }

  async getAdminTotalCount(filters = {}) {
    const { type, purpose, status, location, minPrice, maxPrice, reviewStatus } = filters;
    const conditions = [];
    if (type) conditions.push(eq(this.table.type, type));
    if (purpose) conditions.push(eq(this.table.purpose, purpose));
    if (status) conditions.push(eq(this.table.status, status));
    if (location) conditions.push(ilike(this.table.location, `%${location}%`));
    if (minPrice) conditions.push(gte(this.table.price, minPrice));
    if (maxPrice) conditions.push(lte(this.table.price, maxPrice));
    if (reviewStatus) conditions.push(eq(this.table.reviewStatus, reviewStatus));
    return this.count(conditions.length ? and(...conditions) : undefined);
  }

  async getTotalCount(filters = {}) {
    const conditions = [eq(this.table.isPublished, true), eq(this.table.reviewStatus, 'approved')];
    const { type, purpose, status, location, minPrice, maxPrice } = filters;

    if (type) conditions.push(eq(this.table.type, type));
    if (purpose) conditions.push(eq(this.table.purpose, purpose));
    if (status) conditions.push(eq(this.table.status, status));
    if (location) conditions.push(ilike(this.table.location, `%${location}%`));
    if (minPrice) conditions.push(gte(this.table.price, minPrice));
    if (maxPrice) conditions.push(lte(this.table.price, maxPrice));

    return this.count(and(...conditions));
  }
}

export class ProjectModel extends BaseModel {
  constructor() {
    super(schema.projects);
  }

  async findPublished(options = {}) {
    const { category, status, location, year, limit, offset } = options;
    const conditions = [eq(this.table.isPublished, true)];

    if (category) conditions.push(eq(this.table.category, category));
    if (status) conditions.push(eq(this.table.status, status));
    if (location) conditions.push(ilike(this.table.location, `%${location}%`));
    if (year) conditions.push(ilike(this.table.year, `%${year}%`));

    const records = await this.findAll({
      where: and(...conditions),
      orderBy: desc(this.table.createdAt),
      limit,
      offset,
    });
    if (!records.length) return records;
    const imageRows = await dbInstance.select().from(schema.projectImages)
      .where(inArray(schema.projectImages.projectId, records.map((record) => record.id)))
      .orderBy(asc(schema.projectImages.sortOrder));
    const imagesByProject = new Map();
    for (const image of imageRows) {
      const images = imagesByProject.get(image.projectId) || [];
      images.push(image);
      imagesByProject.set(image.projectId, images);
    }
    return records.map((record) => {
      const images = imagesByProject.get(record.id) || [];
      return { ...record, images, image: images.find((image) => image.isCover)?.url || images[0]?.url || null };
    });
  }

  async findBySlug(slug) {
    const project = await this.findOne(and(eq(this.table.slug, slug), eq(this.table.isPublished, true)));
    if (!project) return null;
    const images = await dbInstance.select().from(schema.projectImages)
      .where(eq(schema.projectImages.projectId, project.id)).orderBy(asc(schema.projectImages.sortOrder));
    return { ...project, images };
  }

  async findAllForAdmin(options = {}) {
    const { category, status, location, year, limit, offset } = options;
    const conditions = [];
    if (category) conditions.push(eq(this.table.category, category));
    if (status) conditions.push(eq(this.table.status, status));
    if (location) conditions.push(ilike(this.table.location, `%${location}%`));
    if (year) conditions.push(ilike(this.table.year, `%${year}%`));
    return super.findAll({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: desc(this.table.createdAt),
      limit,
      offset,
    });
  }

  async getAdminTotalCount(filters = {}) {
    const { category, status, location, year } = filters;
    const conditions = [];
    if (category) conditions.push(eq(this.table.category, category));
    if (status) conditions.push(eq(this.table.status, status));
    if (location) conditions.push(ilike(this.table.location, `%${location}%`));
    if (year) conditions.push(ilike(this.table.year, `%${year}%`));
    return this.count(conditions.length ? and(...conditions) : undefined);
  }

  async getTotalCount(filters = {}) {
    const conditions = [eq(this.table.isPublished, true)];
    const { category, status, location, year } = filters;

    if (category) conditions.push(eq(this.table.category, category));
    if (status) conditions.push(eq(this.table.status, status));
    if (location) conditions.push(ilike(this.table.location, `%${location}%`));
    if (year) conditions.push(ilike(this.table.year, `%${year}%`));

    return this.count(and(...conditions));
  }
}

export class EnquiryModel extends BaseModel {
  constructor() {
    super(schema.enquiries);
  }

  async findAll(options = {}) {
    const { status, service, assignedTo, limit, offset } = options;
    const conditions = [];

    if (status) conditions.push(eq(this.table.status, status));
    if (service) conditions.push(eq(this.table.service, service));
    if (assignedTo !== undefined && assignedTo !== null) conditions.push(eq(this.table.assignedTo, assignedTo));

    return super.findAll({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: desc(this.table.createdAt),
      limit,
      offset,
    });
  }

  async getTotalCount(filters = {}) {
    const conditions = [];
    const { status, service, assignedTo } = filters;

    if (status) conditions.push(eq(this.table.status, status));
    if (service) conditions.push(eq(this.table.service, service));
    if (assignedTo !== undefined && assignedTo !== null) conditions.push(eq(this.table.assignedTo, assignedTo));

    return this.count(conditions.length ? and(...conditions) : undefined);
  }
}

export class UserModel extends BaseModel {
  constructor() {
    super(schema.users);
  }

  async findByEmail(email) {
    return this.findOne(eq(this.table.email, email));
  }

  async findActive() {
    return this.findAll({
      where: eq(this.table.isActive, true),
      orderBy: asc(this.table.fullName),
    });
  }

  async findEnquiryAssignees() {
    return dbInstance.select({ id: this.table.id, email: this.table.email, fullName: this.table.fullName, role: this.table.role })
      .from(this.table)
      .where(and(eq(this.table.isActive, true), eq(this.table.role, 'moderator')))
      .orderBy(asc(this.table.fullName));
  }
}

export const propertyModel = new PropertyModel();
export const projectModel = new ProjectModel();
export const enquiryModel = new EnquiryModel();
export const userModel = new UserModel();

export default {
  propertyModel,
  projectModel,
  enquiryModel,
  userModel,
};
