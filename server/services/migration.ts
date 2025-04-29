import { IStorage } from "../storage";
import { Migration } from "@shared/schema";
import { OzonService } from "./ozon";
import { WildberriesService } from "./wildberries";
import { MappingService } from "./mapping";

export class MigrationService {
  private storage: IStorage;
  private ozonService: OzonService;
  private wildberriesService: WildberriesService;
  private mappingService: MappingService;

  constructor(
    storage: IStorage,
    ozonService: OzonService,
    wildberriesService: WildberriesService,
    mappingService: MappingService
  ) {
    this.storage = storage;
    this.ozonService = ozonService;
    this.wildberriesService = wildberriesService;
    this.mappingService = mappingService;
  }

  async startMigration(migrationId: number, productIds: number[]): Promise<void> {
    try {
      // Get migration
      const migration = await this.storage.getMigration(migrationId);
      if (!migration) {
        throw new Error(`Migration ${migrationId} not found`);
      }
      
      // Update migration status to in_progress
      await this.storage.updateMigration(migrationId, {
        status: "in_progress"
      });
      
      const startTime = Date.now();
      let successCount = 0;
      let failCount = 0;
      
      // Process each product
      for (const productId of productIds) {
        try {
          // Get product details
          const product = await this.storage.getProduct(productId);
          if (!product) {
            throw new Error(`Product ${productId} not found`);
          }
          
          // Create migration product record
          const migrationProduct = await this.storage.createMigrationProduct({
            migrationId,
            productId,
            status: "pending",
            errorMessage: null,
            wildberriesProductId: null
          });
          
          // Transform product for Wildberries
          const transformedProduct = await this.mappingService.transformProduct(product);
          
          // Create product on Wildberries
          const result = await this.wildberriesService.createProduct(transformedProduct);
          
          if (result.success && result.productId) {
            // Update migration product status
            await this.storage.updateMigrationProduct(migrationProduct.id, {
              status: "success",
              wildberriesProductId: result.productId
            });
            
            // Update product to indicate it has a Wildberries analog
            await this.storage.updateProduct(productId, {
              hasWildberriesAnalog: true
            });
            
            // Update migration success count
            successCount++;
            await this.storage.updateMigration(migrationId, {
              successfulProducts: successCount
            });
            
            // If the migration options include updating prices and stocks, do that too
            if (migration.options && migration.options.updatePrices) {
              await this.wildberriesService.updateProductPrice(result.productId, product.price);
            }
            
            // Stock updates would be implemented here if we had stock data
          } else {
            // Update migration product status with error
            await this.storage.updateMigrationProduct(migrationProduct.id, {
              status: "failed",
              errorMessage: result.error || "Unknown error"
            });
            
            // Update migration failure count
            failCount++;
            await this.storage.updateMigration(migrationId, {
              failedProducts: failCount
            });
          }
        } catch (error) {
          console.error(`Error processing product ${productId}:`, error);
          
          // Create or update migration product with error
          const migrationProduct = await this.storage.getMigrationProducts(migrationId).then(
            products => products.find(mp => mp.productId === productId)
          );
          
          if (migrationProduct) {
            await this.storage.updateMigrationProduct(migrationProduct.id, {
              status: "failed",
              errorMessage: error.message
            });
          } else {
            await this.storage.createMigrationProduct({
              migrationId,
              productId,
              status: "failed",
              errorMessage: error.message,
              wildberriesProductId: null
            });
          }
          
          // Update migration failure count
          failCount++;
          await this.storage.updateMigration(migrationId, {
            failedProducts: failCount
          });
        }
      }
      
      // Calculate duration
      const duration = Math.floor((Date.now() - startTime) / 1000);
      
      // Update migration status
      let finalStatus = "completed";
      if (failCount > 0 && successCount === 0) {
        finalStatus = "failed";
      } else if (failCount > 0) {
        finalStatus = "partial";
      }
      
      await this.storage.updateMigration(migrationId, {
        status: finalStatus,
        completedAt: new Date(),
        duration
      });
    } catch (error) {
      console.error(`Error in migration ${migrationId}:`, error);
      
      // Update migration to failed status
      await this.storage.updateMigration(migrationId, {
        status: "failed",
        completedAt: new Date(),
        duration: 0
      });
      
      throw error;
    }
  }

  async getMigrationStatus(migrationId: number): Promise<Migration> {
    const migration = await this.storage.getMigration(migrationId);
    if (!migration) {
      throw new Error(`Migration ${migrationId} not found`);
    }
    return migration;
  }
}
