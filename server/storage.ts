import {
  User,
  InsertUser,
  Product,
  InsertProduct,
  Migration,
  InsertMigration,
  MigrationProduct,
  InsertMigrationProduct,
  MarketplaceApiConfig,
  InsertMarketplaceApiConfig,
  CategoryMapping,
  InsertCategoryMapping,
  AttributeMapping,
  InsertAttributeMapping,
  users,
  products,
  migrations,
  migrationProducts,
  marketplaceApiConfigs,
  categoryMappings,
  attributeMappings
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, desc, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // API Configuration operations
  getMarketplaceApiConfig(name: string): Promise<MarketplaceApiConfig | undefined>;
  getAllMarketplaceApiConfigs(): Promise<MarketplaceApiConfig[]>;
  createMarketplaceApiConfig(config: InsertMarketplaceApiConfig): Promise<MarketplaceApiConfig>;
  updateMarketplaceApiConfig(name: string, config: Partial<InsertMarketplaceApiConfig>): Promise<MarketplaceApiConfig | undefined>;

  // Product operations
  getProduct(id: number): Promise<Product | undefined>;
  getProductsByMarketplace(marketplaceId: string): Promise<Product[]>;
  getProductByExternalId(externalId: string, marketplaceId: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  searchProducts(query: string, marketplaceId: string): Promise<Product[]>;

  // Category mapping operations
  getCategoryMapping(ozonCategory: string): Promise<CategoryMapping | undefined>;
  getAllCategoryMappings(): Promise<CategoryMapping[]>;
  createCategoryMapping(mapping: InsertCategoryMapping): Promise<CategoryMapping>;
  updateCategoryMapping(id: number, mapping: Partial<InsertCategoryMapping>): Promise<CategoryMapping | undefined>;
  deleteCategoryMapping(id: number): Promise<void>;

  // Attribute mapping operations
  getAttributeMapping(ozonAttribute: string, categoryId?: number): Promise<AttributeMapping | undefined>;
  getAttributeMappingsByCategory(categoryId: number): Promise<AttributeMapping[]>;
  getAllAttributeMappings(): Promise<AttributeMapping[]>;
  createAttributeMapping(mapping: InsertAttributeMapping): Promise<AttributeMapping>;
  updateAttributeMapping(id: number, mapping: Partial<InsertAttributeMapping>): Promise<AttributeMapping | undefined>;
  deleteAttributeMapping(id: number): Promise<void>;
  
  // Migration operations
  getMigration(id: number): Promise<Migration | undefined>;
  getAllMigrations(): Promise<Migration[]>;
  getRecentMigrations(limit: number): Promise<Migration[]>;
  createMigration(migration: InsertMigration): Promise<Migration>;
  updateMigration(id: number, migration: Partial<InsertMigration>): Promise<Migration | undefined>;
  
  // Migration product operations
  getMigrationProducts(migrationId: number): Promise<MigrationProduct[]>;
  createMigrationProduct(migrationProduct: InsertMigrationProduct): Promise<MigrationProduct>;
  updateMigrationProduct(id: number, migrationProduct: Partial<InsertMigrationProduct>): Promise<MigrationProduct | undefined>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // API Configuration operations
  async getMarketplaceApiConfig(name: string): Promise<MarketplaceApiConfig | undefined> {
    const [config] = await db.select().from(marketplaceApiConfigs).where(eq(marketplaceApiConfigs.name, name));
    return config;
  }

  async getAllMarketplaceApiConfigs(): Promise<MarketplaceApiConfig[]> {
    return await db.select().from(marketplaceApiConfigs);
  }

  async createMarketplaceApiConfig(config: InsertMarketplaceApiConfig): Promise<MarketplaceApiConfig> {
    const [createdConfig] = await db.insert(marketplaceApiConfigs).values(config).returning();
    return createdConfig;
  }

  async updateMarketplaceApiConfig(name: string, config: Partial<InsertMarketplaceApiConfig>): Promise<MarketplaceApiConfig | undefined> {
    const [updatedConfig] = await db
      .update(marketplaceApiConfigs)
      .set(config)
      .where(eq(marketplaceApiConfigs.name, name))
      .returning();
    return updatedConfig;
  }

  // Product operations
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductsByMarketplace(marketplaceId: string): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.marketplaceId, marketplaceId));
  }

  async getProductByExternalId(externalId: string, marketplaceId: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.externalId, externalId),
          eq(products.marketplaceId, marketplaceId)
        )
      );
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [createdProduct] = await db.insert(products).values(product).returning();
    return createdProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async searchProducts(query: string, marketplaceId: string): Promise<Product[]> {
    const lowerQuery = `%${query.toLowerCase()}%`;
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.marketplaceId, marketplaceId),
          sql`(lower(${products.name}) like ${lowerQuery} or lower(${products.sku}) like ${lowerQuery})`
        )
      );
  }

  // Category mapping operations
  async getCategoryMapping(ozonCategory: string): Promise<CategoryMapping | undefined> {
    const [mapping] = await db
      .select()
      .from(categoryMappings)
      .where(eq(categoryMappings.ozonCategory, ozonCategory));
    return mapping;
  }

  async getAllCategoryMappings(): Promise<CategoryMapping[]> {
    return await db.select().from(categoryMappings);
  }

  async createCategoryMapping(mapping: InsertCategoryMapping): Promise<CategoryMapping> {
    const [createdMapping] = await db.insert(categoryMappings).values(mapping).returning();
    return createdMapping;
  }

  async updateCategoryMapping(id: number, mapping: Partial<InsertCategoryMapping>): Promise<CategoryMapping | undefined> {
    const [updatedMapping] = await db
      .update(categoryMappings)
      .set(mapping)
      .where(eq(categoryMappings.id, id))
      .returning();
    return updatedMapping;
  }

  async deleteCategoryMapping(id: number): Promise<void> {
    await db
      .delete(categoryMappings)
      .where(eq(categoryMappings.id, id));
  }

  // Attribute mapping operations
  async getAttributeMapping(ozonAttribute: string, categoryId?: number): Promise<AttributeMapping | undefined> {
    let query = db.select().from(attributeMappings);
    
    if (categoryId !== undefined) {
      query = query.where(
        and(
          eq(attributeMappings.ozonAttribute, ozonAttribute),
          eq(attributeMappings.categoryId, categoryId)
        )
      );
    } else {
      query = query.where(eq(attributeMappings.ozonAttribute, ozonAttribute));
    }
    
    const [mapping] = await query;
    return mapping;
  }

  async getAttributeMappingsByCategory(categoryId: number): Promise<AttributeMapping[]> {
    return await db
      .select()
      .from(attributeMappings)
      .where(eq(attributeMappings.categoryId, categoryId));
  }

  async createAttributeMapping(mapping: InsertAttributeMapping): Promise<AttributeMapping> {
    const [createdMapping] = await db.insert(attributeMappings).values(mapping).returning();
    return createdMapping;
  }

  async getAllAttributeMappings(): Promise<AttributeMapping[]> {
    return await db.select().from(attributeMappings);
  }

  async updateAttributeMapping(id: number, mapping: Partial<InsertAttributeMapping>): Promise<AttributeMapping | undefined> {
    const [updatedMapping] = await db
      .update(attributeMappings)
      .set(mapping)
      .where(eq(attributeMappings.id, id))
      .returning();
    return updatedMapping;
  }

  async deleteAttributeMapping(id: number): Promise<void> {
    await db
      .delete(attributeMappings)
      .where(eq(attributeMappings.id, id));
  }

  // Migration operations
  async getMigration(id: number): Promise<Migration | undefined> {
    const [migration] = await db.select().from(migrations).where(eq(migrations.id, id));
    return migration;
  }

  async getAllMigrations(): Promise<Migration[]> {
    return await db.select().from(migrations).orderBy(desc(migrations.createdAt));
  }

  async getRecentMigrations(limit: number): Promise<Migration[]> {
    return await db
      .select()
      .from(migrations)
      .orderBy(desc(migrations.createdAt))
      .limit(limit);
  }

  async createMigration(migration: InsertMigration): Promise<Migration> {
    const [createdMigration] = await db.insert(migrations).values(migration).returning();
    return createdMigration;
  }

  async updateMigration(id: number, migration: Partial<InsertMigration>): Promise<Migration | undefined> {
    const [updatedMigration] = await db
      .update(migrations)
      .set(migration)
      .where(eq(migrations.id, id))
      .returning();
    return updatedMigration;
  }

  // Migration product operations
  async getMigrationProducts(migrationId: number): Promise<MigrationProduct[]> {
    return await db
      .select()
      .from(migrationProducts)
      .where(eq(migrationProducts.migrationId, migrationId));
  }

  async createMigrationProduct(migrationProduct: InsertMigrationProduct): Promise<MigrationProduct> {
    const [createdMigrationProduct] = await db
      .insert(migrationProducts)
      .values(migrationProduct)
      .returning();
    return createdMigrationProduct;
  }

  async updateMigrationProduct(id: number, migrationProduct: Partial<InsertMigrationProduct>): Promise<MigrationProduct | undefined> {
    const [updatedMigrationProduct] = await db
      .update(migrationProducts)
      .set(migrationProduct)
      .where(eq(migrationProducts.id, id))
      .returning();
    return updatedMigrationProduct;
  }
  
  // Initialize default marketplace configurations if they don't exist
  async initializeDefaultConfigs(): Promise<void> {
    // Проверка наличия ключей в переменных окружения
    const ozonClientId = process.env.OZON_CLIENT_ID || '';
    const ozonApiKey = process.env.OZON_API_KEY || '';
    const wildberriesApiKey = process.env.WILDBERRIES_API_KEY || '';
    
    console.log(`Initializing with OZON_CLIENT_ID: ${ozonClientId ? "Found" : "Not found"}`);
    console.log(`Initializing with OZON_API_KEY: ${ozonApiKey ? "Found" : "Not found"}`);
    console.log(`Initializing with WILDBERRIES_API_KEY: ${wildberriesApiKey ? "Found" : "Not found"}`);

    // Check if Ozon config exists
    const ozonConfig = await this.getMarketplaceApiConfig('ozon');
    if (!ozonConfig) {
      await this.createMarketplaceApiConfig({
        name: 'ozon',
        clientId: ozonClientId,
        apiKey: ozonApiKey,
        isConnected: false
      });
      console.log("Created Ozon API configuration");
    } else if (ozonClientId && ozonApiKey) {
      // Обновляем конфигурацию, если найдены переменные окружения
      await this.updateMarketplaceApiConfig('ozon', {
        clientId: ozonClientId,
        apiKey: ozonApiKey
      });
      console.log("Updated Ozon API configuration from environment variables");
    }
    
    // Check if Wildberries config exists
    const wildberriesConfig = await this.getMarketplaceApiConfig('wildberries');
    if (!wildberriesConfig) {
      await this.createMarketplaceApiConfig({
        name: 'wildberries',
        apiKey: wildberriesApiKey,
        isConnected: false
      });
      console.log("Created Wildberries API configuration");
    } else if (wildberriesApiKey) {
      // Обновляем конфигурацию, если найдены переменные окружения
      await this.updateMarketplaceApiConfig('wildberries', {
        apiKey: wildberriesApiKey
      });
      console.log("Updated Wildberries API configuration from environment variables");
    }
  }
}

// Create a new instance of DatabaseStorage
const dbStorage = new DatabaseStorage();

// Initialize default configs
dbStorage.initializeDefaultConfigs()
  .catch(err => {
    console.error('Error initializing default marketplace configs:', err);
  });

export const storage = dbStorage;
