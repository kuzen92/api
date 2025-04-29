import { pgTable, text, serial, integer, boolean, timestamp, json, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Marketplaces
export const marketplaceApiConfigs = pgTable("marketplace_api_configs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // 'ozon' or 'wildberries'
  clientId: text("client_id"),
  apiKey: text("api_key").notNull(),
  isConnected: boolean("is_connected").default(false),
  lastSyncAt: timestamp("last_sync_at"),
});

export const insertMarketplaceApiConfigSchema = createInsertSchema(marketplaceApiConfigs).pick({
  name: true,
  clientId: true,
  apiKey: true,
  isConnected: true,
  lastSyncAt: true,
});

export type InsertMarketplaceApiConfig = z.infer<typeof insertMarketplaceApiConfigSchema>;
export type MarketplaceApiConfig = typeof marketplaceApiConfigs.$inferSelect;

// Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull(), // ID from marketplace
  marketplaceId: text("marketplace_id").notNull(), // 'ozon' or 'wildberries'
  name: text("name").notNull(),
  sku: text("sku"),
  categoryPath: text("category_path"),
  price: integer("price"),
  imageUrls: text("image_urls").array(),
  attributes: json("attributes"),
  hasWildberriesAnalog: boolean("has_wildberries_analog").default(false),
  hasOzonAnalog: boolean("has_ozon_analog").default(false),
});

export const insertProductSchema = createInsertSchema(products).pick({
  externalId: true,
  marketplaceId: true,
  name: true,
  sku: true,
  categoryPath: true,
  price: true,
  imageUrls: true,
  attributes: true,
  hasWildberriesAnalog: true,
  hasOzonAnalog: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Category Mapping
export const categoryMappings = pgTable("category_mappings", {
  id: serial("id").primaryKey(),
  ozonCategory: text("ozon_category").notNull(),
  wildberriesCategory: text("wildberries_category").notNull(),
  wildberriesSubjectId: integer("wildberries_subject_id"),
  ozonCategoryId: integer("ozon_category_id"),
});

export const insertCategoryMappingSchema = createInsertSchema(categoryMappings).pick({
  ozonCategory: true,
  wildberriesCategory: true,
  wildberriesSubjectId: true,
  ozonCategoryId: true,
});

export type InsertCategoryMapping = z.infer<typeof insertCategoryMappingSchema>;
export type CategoryMapping = typeof categoryMappings.$inferSelect;

// Attribute Mapping
export const attributeMappings = pgTable("attribute_mappings", {
  id: serial("id").primaryKey(),
  ozonAttribute: text("ozon_attribute").notNull(),
  ozonAttributeName: text("ozon_attribute_name").notNull(),
  wildberriesAttribute: text("wildberries_attribute").notNull(),
  wildberriesAttributeName: text("wildberries_attribute_name").notNull(),
  categoryId: integer("category_id"),
});

export const insertAttributeMappingSchema = createInsertSchema(attributeMappings).pick({
  ozonAttribute: true,
  ozonAttributeName: true,
  wildberriesAttribute: true,
  wildberriesAttributeName: true,
  categoryId: true,
});

export type InsertAttributeMapping = z.infer<typeof insertAttributeMappingSchema>;
export type AttributeMapping = typeof attributeMappings.$inferSelect;

// Migrations
export const migrations = pgTable("migrations", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  status: text("status").notNull(), // "pending", "in_progress", "completed", "failed", "partial"
  totalProducts: integer("total_products").notNull(),
  successfulProducts: integer("successful_products").default(0),
  failedProducts: integer("failed_products").default(0),
  options: json("options"), // {"updatePrices": true, "updateStocks": true, "skipExisting": false}
  duration: integer("duration"), // in seconds
});

export const insertMigrationSchema = createInsertSchema(migrations).pick({
  status: true,
  totalProducts: true,
  successfulProducts: true,
  failedProducts: true,
  options: true,
});

export type InsertMigration = z.infer<typeof insertMigrationSchema>;
export type Migration = typeof migrations.$inferSelect;

// Migration Products (links migrations to products)
export const migrationProducts = pgTable("migration_products", {
  id: serial("id").primaryKey(),
  migrationId: integer("migration_id").notNull(),
  productId: integer("product_id").notNull(),
  status: text("status").notNull(), // "pending", "success", "failed"
  errorMessage: text("error_message"),
  wildberriesProductId: text("wildberries_product_id"),
});

export const insertMigrationProductSchema = createInsertSchema(migrationProducts).pick({
  migrationId: true,
  productId: true,
  status: true,
  errorMessage: true,
  wildberriesProductId: true,
});

export type InsertMigrationProduct = z.infer<typeof insertMigrationProductSchema>;
export type MigrationProduct = typeof migrationProducts.$inferSelect;
