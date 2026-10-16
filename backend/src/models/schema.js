import { pgTable, serial, varchar, text, integer, boolean, timestamp, decimal, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'staff', 'viewer']);
export const propertyTypeEnum = pgEnum('property_type', ['land', 'house', 'apartment', 'commercial']);
export const propertyPurposeEnum = pgEnum('property_purpose', ['sale', 'rent']);
export const propertyStatusEnum = pgEnum('property_status', ['available', 'under_offer', 'sold', 'let']);
export const projectCategoryEnum = pgEnum('project_category', ['residential', 'commercial', 'mixed_use', 'renovation']);
export const projectStatusEnum = pgEnum('project_status', ['planning', 'ongoing', 'completed']);
export const enquiryStatusEnum = pgEnum('enquiry_status', ['new', 'in_progress', 'contacted', 'closed']);
export const serviceTypeEnum = pgEnum('service_type', ['building_design', 'construction', 'real_estate', 'project_support']);

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('staff'),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

// Properties table
export const properties = pgTable('properties', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  type: propertyTypeEnum('type').notNull(),
  purpose: propertyPurposeEnum('purpose').notNull(),
  status: propertyStatusEnum('status').notNull().default('available'),
  location: varchar('location', { length: 255 }).notNull(),
  size: varchar('size', { length: 100 }),
  price: decimal('price', { precision: 14, scale: 2 }),
  priceLabel: varchar('price_label', { length: 50 }),
  description: text('description'),
  features: text('features').array(),
  accent: varchar('accent', { length: 50 }),
  isPublished: boolean('is_published').notNull().default(false),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex('properties_slug_idx').on(table.slug),
  typeIdx: index('properties_type_idx').on(table.type),
  purposeIdx: index('properties_purpose_idx').on(table.purpose),
  statusIdx: index('properties_status_idx').on(table.status),
  publishedIdx: index('properties_published_idx').on(table.isPublished),
}));

// Property images table
export const propertyImages = pgTable('property_images', {
  id: serial('id').primaryKey(),
  propertyId: integer('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull(),
  altText: varchar('alt_text', { length: 255 }),
  sortOrder: integer('sort_order').notNull().default(0),
  isCover: boolean('is_cover').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  propertyIdIdx: index('property_images_property_id_idx').on(table.propertyId),
}));

// Projects table
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  category: projectCategoryEnum('category').notNull(),
  status: projectStatusEnum('status').notNull().default('planning'),
  location: varchar('location', { length: 255 }).notNull(),
  year: varchar('year', { length: 50 }),
  size: varchar('size', { length: 100 }),
  value: decimal('value', { precision: 14, scale: 2 }),
  description: text('description'),
  highlights: text('highlights').array(),
  services: text('services').array(),
  accent: varchar('accent', { length: 50 }),
  isPublished: boolean('is_published').notNull().default(false),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex('projects_slug_idx').on(table.slug),
  categoryIdx: index('projects_category_idx').on(table.category),
  statusIdx: index('projects_status_idx').on(table.status),
  publishedIdx: index('projects_published_idx').on(table.isPublished),
}));

// Project images table
export const projectImages = pgTable('project_images', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull(),
  altText: varchar('alt_text', { length: 255 }),
  sortOrder: integer('sort_order').notNull().default(0),
  isCover: boolean('is_cover').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  projectIdIdx: index('project_images_project_id_idx').on(table.projectId),
}));

// Enquiries table
export const enquiries = pgTable('enquiries', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }),
  service: serviceTypeEnum('service').notNull(),
  message: text('message').notNull(),
  propertyId: integer('property_id').references(() => properties.id, { onDelete: 'set null' }),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
  status: enquiryStatusEnum('status').notNull().default('new'),
  assignedTo: integer('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  statusIdx: index('enquiries_status_idx').on(table.status),
  serviceIdx: index('enquiries_service_idx').on(table.service),
  createdAtIdx: index('enquiries_created_at_idx').on(table.createdAt),
}));

// Site settings table
export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const propertiesRelations = relations(properties, ({ many }) => ({
  images: many(propertyImages),
  enquiries: many(enquiries),
}));

export const propertyImagesRelations = relations(propertyImages, ({ one }) => ({
  property: one(properties, {
    fields: [propertyImages.propertyId],
    references: [properties.id],
  }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  images: many(projectImages),
  enquiries: many(enquiries),
}));

export const projectImagesRelations = relations(projectImages, ({ one }) => ({
  project: one(projects, {
    fields: [projectImages.projectId],
    references: [projects.id],
  }),
}));

export const enquiriesRelations = relations(enquiries, ({ one }) => ({
  property: one(properties, {
    fields: [enquiries.propertyId],
    references: [properties.id],
  }),
  project: one(projects, {
    fields: [enquiries.projectId],
    references: [projects.id],
  }),
  assignee: one(users, {
    fields: [enquiries.assignedTo],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  assignedEnquiries: many(enquiries),
}));

export default {
  users,
  properties,
  propertyImages,
  projects,
  projectImages,
  enquiries,
  siteSettings,
};
