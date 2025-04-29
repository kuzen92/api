import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { OzonService } from "./services/ozon";
import { WildberriesService } from "./services/wildberries";
import { MappingService } from "./services/mapping";
import { MigrationService } from "./services/migration";
import { insertMarketplaceApiConfigSchema, insertMigrationSchema } from "@shared/schema";
import { setupAuth, requireAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Настройка системы аутентификации
  setupAuth(app);

  const ozonService = new OzonService(storage);
  const wildberriesService = new WildberriesService(storage);
  const mappingService = new MappingService(storage);
  const migrationService = new MigrationService(storage, ozonService, wildberriesService, mappingService);

  // API Configuration Routes
  app.get("/api/marketplace-configs", async (req: Request, res: Response) => {
    const configs = await storage.getAllMarketplaceApiConfigs();
    // Mask API keys for security
    const maskedConfigs = configs.map(config => ({
      ...config,
      apiKey: config.apiKey ? `•••••••${config.apiKey.substring(config.apiKey.length - 3)}` : "",
      clientId: config.clientId ? `•••••••${config.clientId.substring(config.clientId.length - 3)}` : ""
    }));
    res.json(maskedConfigs);
  });

  app.post("/api/marketplace-configs/:name", async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const configData = insertMarketplaceApiConfigSchema.parse({
        ...req.body,
        name
      });
      
      const existingConfig = await storage.getMarketplaceApiConfig(name);
      let config;
      
      if (existingConfig) {
        config = await storage.updateMarketplaceApiConfig(name, configData);
      } else {
        config = await storage.createMarketplaceApiConfig(configData);
      }

      // Test the connection
      let isConnected = false;
      if (name === 'ozon') {
        // Выводим информацию о входящих данных API
        console.log(`Попытка обновления конфигурации Ozon API:`);
        console.log(`- clientId: ${configData.clientId?.substring(0, 6)}... (длина: ${configData.clientId?.length})`);
        console.log(`- apiKey: ${configData.apiKey?.substring(0, 6)}... (длина: ${configData.apiKey?.length})`);
        
        // Проверяем ожидаемый формат: clientId должен быть коротким, apiKey - длинным
        const isClientIdFormatCorrect = configData.clientId && configData.clientId.length < 10;
        const isApiKeyFormatCorrect = configData.apiKey && configData.apiKey.length > 30;
        
        if (!isClientIdFormatCorrect || !isApiKeyFormatCorrect) {
          console.log("⚠️ Обнаружено возможное несоответствие форматов API-ключей:");
          if (!isClientIdFormatCorrect) {
            console.log(`   Client-Id должен быть коротким числом, получено: ${configData.clientId?.length} символов`);
          }
          if (!isApiKeyFormatCorrect) {
            console.log(`   Api-Key должен быть длинным UUID, получено: ${configData.apiKey?.length} символов`);
          }
          console.log("Возможно, значения Client-Id и Api-Key перепутаны местами");
          
          // Попробуем поменять значения местами автоматически
          if (!isClientIdFormatCorrect && !isApiKeyFormatCorrect) {
            console.log("Пробуем поменять значения clientId и apiKey местами...");
            try {
              const swappedIsConnected = await ozonService.testConnection(configData.clientId, configData.apiKey);
              if (swappedIsConnected) {
                console.log("✅ Соединение установлено после смены clientId и apiKey местами!");
                // Меняем значения местами для сохранения
                const temp = configData.clientId;
                configData.clientId = configData.apiKey;
                configData.apiKey = temp;
                isConnected = true;
              } else {
                isConnected = await ozonService.testConnection(configData.apiKey, configData.clientId);
              }
            } catch (retryError) {
              console.error("Вторая попытка также неудачна:", retryError);
              isConnected = await ozonService.testConnection(configData.apiKey, configData.clientId);
            }
          } else {
            isConnected = await ozonService.testConnection(configData.apiKey, configData.clientId);
          }
        } else {
          isConnected = await ozonService.testConnection(configData.apiKey, configData.clientId);
        }
      } else if (name === 'wildberries') {
        console.log(`Попытка обновления конфигурации Wildberries API:`);
        console.log(`- apiKey: ${configData.apiKey?.substring(0, 6)}... (длина: ${configData.apiKey?.length})`);
        isConnected = await wildberriesService.testConnection(configData.apiKey);
      }

      // Update connection status
      config = await storage.updateMarketplaceApiConfig(name, {
        isConnected,
        lastSyncAt: isConnected ? new Date() : undefined
      });

      // Mask API key for response
      const response = {
        ...config,
        apiKey: config?.apiKey ? `•••••••${config.apiKey.substring(config.apiKey.length - 3)}` : "",
        clientId: config?.clientId ? `•••••••${config.clientId.substring(config.clientId.length - 3)}` : ""
      };

      res.json(response);
    } catch (error) {
      console.error("Error updating API config:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update API configuration" });
      }
    }
  });

  // Ozon Products Routes
  app.get("/api/ozon/products", async (req: Request, res: Response) => {
    try {
      const query = req.query.query as string | undefined;
      const products = await ozonService.getProducts(query);
      res.json(products);
    } catch (error: any) {
      console.error("Error fetching Ozon products:", error);
      res.status(500).json({ message: "Failed to fetch Ozon products", error: error.message });
    }
  });

  app.post("/api/ozon/sync", async (req: Request, res: Response) => {
    try {
      const result = await ozonService.syncProducts();
      res.json(result);
    } catch (error) {
      console.error("Error syncing Ozon products:", error);
      res.status(500).json({ message: "Failed to sync Ozon products", error: error.message });
    }
  });

  // Wildberries Products Routes
  app.get("/api/wildberries/products", async (req: Request, res: Response) => {
    try {
      const query = req.query.query as string | undefined;
      const products = await wildberriesService.getProducts(query);
      res.json(products);
    } catch (error) {
      console.error("Error fetching Wildberries products:", error);
      res.status(500).json({ message: "Failed to fetch Wildberries products", error: error.message });
    }
  });

  // Migration Routes
  app.get("/api/migrations", async (req: Request, res: Response) => {
    try {
      const migrations = await storage.getAllMigrations();
      res.json(migrations);
    } catch (error) {
      console.error("Error fetching migrations:", error);
      res.status(500).json({ message: "Failed to fetch migrations", error: error.message });
    }
  });

  app.get("/api/migrations/recent", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string || "5");
      const migrations = await storage.getRecentMigrations(limit);
      res.json(migrations);
    } catch (error) {
      console.error("Error fetching recent migrations:", error);
      res.status(500).json({ message: "Failed to fetch recent migrations", error: error.message });
    }
  });

  app.get("/api/migrations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const migration = await storage.getMigration(id);
      
      if (!migration) {
        return res.status(404).json({ message: "Migration not found" });
      }
      
      const migrationProducts = await storage.getMigrationProducts(id);
      
      // Get product details for each migration product
      const productsDetails = await Promise.all(
        migrationProducts.map(async (mp) => {
          const product = await storage.getProduct(mp.productId);
          return {
            ...mp,
            product
          };
        })
      );
      
      res.json({
        ...migration,
        products: productsDetails
      });
    } catch (error) {
      console.error("Error fetching migration details:", error);
      res.status(500).json({ message: "Failed to fetch migration details", error: error.message });
    }
  });

  app.post("/api/migrations", async (req: Request, res: Response) => {
    try {
      const { productIds, options } = req.body;
      
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: "Product IDs are required" });
      }
      
      const migrationData = insertMigrationSchema.parse({
        status: "pending",
        totalProducts: productIds.length,
        successfulProducts: 0,
        failedProducts: 0,
        options
      });
      
      const migration = await storage.createMigration(migrationData);
      
      // Start migration process asynchronously
      migrationService.startMigration(migration.id, productIds).catch(error => {
        console.error(`Error in migration ${migration.id}:`, error);
      });
      
      res.status(201).json(migration);
    } catch (error) {
      console.error("Error creating migration:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create migration", error: error.message });
      }
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req: Request, res: Response) => {
    try {
      const ozonProducts = await storage.getProductsByMarketplace("ozon");
      const wbProducts = await storage.getProductsByMarketplace("wildberries");
      const migrations = await storage.getAllMigrations();
      
      const successfulMigrations = migrations.filter(m => m.status === "completed").length;
      const failedMigrations = migrations.filter(m => m.status === "failed" || m.status === "partial").length;
      
      res.json({
        ozonProducts: ozonProducts.length,
        wbProducts: wbProducts.length,
        successfulMigrations,
        failedMigrations
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats", error: error.message });
    }
  });
  
  // Новые API-эндпоинты для переноса товаров
  
  // Перенос товаров из Ozon в Wildberries
  app.post("/api/migrate/ozon-to-wildberries", async (req: Request, res: Response) => {
    try {
      const { productIds, options } = req.body;
      
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: "Необходимо указать массив ID товаров" });
      }
      
      // Создаем запись о миграции
      const migration = await storage.createMigration({
        status: "in_progress",
        totalProducts: productIds.length,
        successfulProducts: 0,
        failedProducts: 0,
        options: options || {}
      });
      
      // Запускаем перенос товаров
      console.log(`Начинаем перенос ${productIds.length} товаров из Ozon в Wildberries`);
      
      const result = await mappingService.migrateProductsToWildberries(productIds, options || {});
      
      // Обновляем статус миграции
      await storage.updateMigration(migration.id, {
        status: result.failed > 0 ? "partial" : "completed",
        successfulProducts: result.successful,
        failedProducts: result.failed,
        completedAt: new Date()
      });
      
      // Сохраняем результаты для каждого продукта
      for (const productResult of result.results) {
        await storage.createMigrationProduct({
          migrationId: migration.id,
          productId: productResult.productId,
          status: productResult.status,
          errorMessage: productResult.errorMessage,
          wildberriesProductId: productResult.wbProductId
        });
      }
      
      res.status(200).json({
        migrationId: migration.id,
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        details: result.results
      });
    } catch (error: any) {
      console.error("Ошибка при переносе товаров из Ozon в Wildberries:", error);
      res.status(500).json({ 
        message: "Ошибка при переносе товаров", 
        error: error.message || "Неизвестная ошибка" 
      });
    }
  });
  
  // Перенос товаров из Wildberries в Ozon
  app.post("/api/migrate/wildberries-to-ozon", async (req: Request, res: Response) => {
    try {
      const { productIds, options } = req.body;
      
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: "Необходимо указать массив ID товаров" });
      }
      
      // Создаем запись о миграции
      const migration = await storage.createMigration({
        status: "in_progress",
        totalProducts: productIds.length,
        successfulProducts: 0,
        failedProducts: 0,
        options: options || {}
      });
      
      // Запускаем перенос товаров
      console.log(`Начинаем перенос ${productIds.length} товаров из Wildberries в Ozon`);
      
      const result = await mappingService.migrateProductsToOzon(productIds, options || {});
      
      // Обновляем статус миграции
      await storage.updateMigration(migration.id, {
        status: result.failed > 0 ? "partial" : "completed",
        successfulProducts: result.successful,
        failedProducts: result.failed,
        completedAt: new Date()
      });
      
      // Сохраняем результаты для каждого продукта
      for (const productResult of result.results) {
        await storage.createMigrationProduct({
          migrationId: migration.id,
          productId: productResult.productId,
          status: productResult.status,
          errorMessage: productResult.errorMessage,
          wildberriesProductId: productResult.ozonProductId
        });
      }
      
      res.status(200).json({
        migrationId: migration.id,
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        details: result.results
      });
    } catch (error: any) {
      console.error("Ошибка при переносе товаров из Wildberries в Ozon:", error);
      res.status(500).json({ 
        message: "Ошибка при переносе товаров", 
        error: error.message || "Неизвестная ошибка" 
      });
    }
  });
  
  // Получение категорий Ozon
  app.get("/api/ozon/categories", async (req: Request, res: Response) => {
    try {
      const categories = await ozonService.getCategories();
      res.status(200).json(categories);
    } catch (error: any) {
      console.error("Ошибка при получении категорий Ozon:", error);
      res.status(500).json({ 
        message: "Не удалось получить категории Ozon", 
        error: error.message || "Неизвестная ошибка" 
      });
    }
  });
  
  // Получение атрибутов категории Ozon
  app.get("/api/ozon/category/:categoryId/attributes", async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Некорректный ID категории" });
      }
      
      const attributes = await ozonService.getCategoryAttributes(categoryId);
      res.status(200).json(attributes);
    } catch (error: any) {
      console.error(`Ошибка при получении атрибутов категории Ozon ${req.params.categoryId}:`, error);
      res.status(500).json({ 
        message: "Не удалось получить атрибуты категории", 
        error: error.message || "Неизвестная ошибка" 
      });
    }
  });
  
  // Получение категорий Wildberries
  app.get("/api/wildberries/categories", async (req: Request, res: Response) => {
    try {
      const categories = await wildberriesService.getCategories();
      res.status(200).json(categories);
    } catch (error: any) {
      console.error("Ошибка при получении категорий Wildberries:", error);
      res.status(500).json({ 
        message: "Не удалось получить категории Wildberries", 
        error: error.message || "Неизвестная ошибка" 
      });
    }
  });
  
  // Получение характеристик предмета Wildberries
  app.get("/api/wildberries/subject/:subjectId/characteristics", async (req: Request, res: Response) => {
    try {
      const subjectId = parseInt(req.params.subjectId);
      
      if (isNaN(subjectId)) {
        return res.status(400).json({ message: "Некорректный ID предмета" });
      }
      
      const characteristics = await wildberriesService.getCategoryCharacteristics(subjectId);
      res.status(200).json(characteristics);
    } catch (error: any) {
      console.error(`Ошибка при получении характеристик предмета Wildberries ${req.params.subjectId}:`, error);
      res.status(500).json({ 
        message: "Не удалось получить характеристики предмета", 
        error: error.message || "Неизвестная ошибка" 
      });
    }
  });
  
  // Получение маппингов категорий
  app.get("/api/category-mappings", async (req: Request, res: Response) => {
    try {
      const mappings = await storage.getAllCategoryMappings();
      res.status(200).json(mappings);
    } catch (error: any) {
      console.error("Ошибка при получении маппингов категорий:", error);
      res.status(500).json({ 
        message: "Не удалось получить маппинги категорий", 
        error: error.message || "Неизвестная ошибка" 
      });
    }
  });
  
  // Создание или обновление маппинга категорий
  app.post("/api/category-mappings", async (req: Request, res: Response) => {
    try {
      const { ozonCategory, wildberriesCategory, wildberriesSubjectId, ozonCategoryId } = req.body;
      
      if (!ozonCategory || !wildberriesCategory) {
        return res.status(400).json({ 
          message: "Необходимо указать названия категорий Ozon и Wildberries" 
        });
      }
      
      // Проверяем, существует ли уже такой маппинг
      const existingMapping = await storage.getCategoryMapping(ozonCategory);
      
      let mapping;
      
      if (existingMapping) {
        // Обновляем существующий маппинг
        const updatedMapping = await storage.updateCategoryMapping(existingMapping.id, {
          wildberriesCategory,
          wildberriesSubjectId,
          ozonCategoryId
        });
        mapping = updatedMapping;
      } else {
        // Создаем новый маппинг
        mapping = await storage.createCategoryMapping({
          ozonCategory,
          wildberriesCategory,
          wildberriesSubjectId,
          ozonCategoryId
        });
      }
      
      res.status(200).json(mapping);
    } catch (error: any) {
      console.error("Ошибка при создании маппинга категорий:", error);
      res.status(500).json({ 
        message: "Не удалось создать маппинг категорий", 
        error: error.message || "Неизвестная ошибка" 
      });
    }
  });

  // Получение всех маппингов атрибутов
  app.get("/api/attribute-mappings", async (req: Request, res: Response) => {
    try {
      // Если указана категория, фильтруем по ней
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      
      if (categoryId) {
        const mappings = await storage.getAttributeMappingsByCategory(categoryId);
        return res.status(200).json(mappings);
      }
      
      // Иначе возвращаем все маппинги атрибутов
      const mappings = await storage.getAllAttributeMappings();
      res.status(200).json(mappings);
    } catch (error: any) {
      console.error("Ошибка при получении маппингов атрибутов:", error);
      res.status(500).json({ 
        message: "Не удалось получить маппинги атрибутов", 
        error: error.message || "Неизвестная ошибка" 
      });
    }
  });
  
  // Создание маппинга атрибутов
  app.post("/api/attribute-mappings", async (req: Request, res: Response) => {
    try {
      const { ozonAttribute, ozonAttributeName, wildberriesAttribute, wildberriesAttributeName, categoryId } = req.body;
      
      if (!ozonAttribute || !ozonAttributeName || !wildberriesAttribute || !wildberriesAttributeName) {
        return res.status(400).json({ 
          message: "Необходимо указать идентификаторы и названия атрибутов" 
        });
      }
      
      // Создаем маппинг атрибутов
      const mapping = await storage.createAttributeMapping({
        ozonAttribute,
        ozonAttributeName,
        wildberriesAttribute,
        wildberriesAttributeName,
        categoryId
      });
      
      res.status(201).json(mapping);
    } catch (error: any) {
      console.error("Ошибка при создании маппинга атрибутов:", error);
      res.status(500).json({ 
        message: "Не удалось создать маппинг атрибутов", 
        error: error.message || "Неизвестная ошибка" 
      });
    }
  });
  
  // Обновление маппинга атрибутов
  app.put("/api/attribute-mappings/:id", async (req: Request, res: Response) => {
    try {
      const mappingId = parseInt(req.params.id);
      const { ozonAttribute, ozonAttributeName, wildberriesAttribute, wildberriesAttributeName, categoryId } = req.body;
      
      // Проверяем, существует ли маппинг
      const existingMapping = await storage.getAttributeMapping(ozonAttribute, categoryId);
      
      if (!existingMapping || existingMapping.id !== mappingId) {
        return res.status(404).json({ message: "Маппинг атрибута не найден" });
      }
      
      // Обновляем маппинг
      const updatedMapping = await storage.updateAttributeMapping(mappingId, {
        ozonAttribute,
        ozonAttributeName,
        wildberriesAttribute,
        wildberriesAttributeName,
        categoryId
      });
      
      res.status(200).json(updatedMapping);
    } catch (error: any) {
      console.error("Ошибка при обновлении маппинга атрибутов:", error);
      res.status(500).json({ 
        message: "Не удалось обновить маппинг атрибутов", 
        error: error.message || "Неизвестная ошибка" 
      });
    }
  });
  
  // Удаление маппинга атрибутов
  app.delete("/api/attribute-mappings/:id", async (req: Request, res: Response) => {
    try {
      const mappingId = parseInt(req.params.id);
      
      // Удаляем маппинг
      await storage.deleteAttributeMapping(mappingId);
      
      res.status(200).json({ message: "Маппинг атрибута успешно удален" });
    } catch (error: any) {
      console.error("Ошибка при удалении маппинга атрибутов:", error);
      res.status(500).json({ 
        message: "Не удалось удалить маппинг атрибутов", 
        error: error.message || "Неизвестная ошибка" 
      });
    }
  });
  
  // Получение отдельного товара по ID для маппинга (Ozon)
  app.get("/api/ozon/product/:id", async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      
      const product = await storage.getProduct(productId);
      if (!product || product.marketplaceId !== "ozon") {
        return res.status(404).json({ message: "Товар Ozon не найден" });
      }
      
      res.status(200).json(product);
    } catch (error: any) {
      console.error("Ошибка при получении товара Ozon:", error);
      res.status(500).json({ 
        message: "Не удалось получить товар Ozon", 
        error: error.message || "Неизвестная ошибка" 
      });
    }
  });
  
  // Получение отдельного товара по ID для маппинга (Wildberries)
  app.get("/api/wildberries/product/:id", async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      
      const product = await storage.getProduct(productId);
      if (!product || product.marketplaceId !== "wildberries") {
        return res.status(404).json({ message: "Товар Wildberries не найден" });
      }
      
      res.status(200).json(product);
    } catch (error: any) {
      console.error("Ошибка при получении товара Wildberries:", error);
      res.status(500).json({ 
        message: "Не удалось получить товар Wildberries", 
        error: error.message || "Неизвестная ошибка" 
      });
    }
  });
  
  // Маршрут для переноса отдельного товара из Ozon в Wildberries с детальным маппингом
  app.post("/api/migrate/ozon-to-wildberries/product", async (req: Request, res: Response) => {
    try {
      const { productId, targetCategoryId, attributeMappings } = req.body;
      
      if (!productId || !targetCategoryId) {
        return res.status(400).json({ 
          message: "Необходимо указать productId и targetCategoryId" 
        });
      }
      
      // Получаем информацию о товаре
      const product = await storage.getProduct(productId);
      if (!product || product.marketplaceId !== "ozon") {
        return res.status(404).json({ message: "Товар Ozon не найден" });
      }
      
      // Создаем запись о миграции
      const migration = await storage.createMigration({
        status: "pending",
        totalProducts: 1,
        options: { 
          skipExisting: false,
          targetCategoryId,
          attributeMappings
        }
      });
      
      // Создаем запись о продукте миграции
      await storage.createMigrationProduct({
        migrationId: migration.id,
        productId: product.id,
        status: "pending",
      });
      
      // Запускаем миграцию товара в фоновом режиме
      migrationService.startMigration(migration.id, [productId]).catch(error => {
        console.error(`Ошибка при выполнении миграции ${migration.id}:`, error);
      });
      
      res.status(201).json({ 
        migrationId: migration.id,
        status: "success",
        message: "Перенос товара запущен"
      });
    } catch (error: any) {
      console.error("Ошибка при детальном переносе товара Ozon -> Wildberries:", error);
      res.status(500).json({ 
        message: "Не удалось перенести товар", 
        error: error.message || "Неизвестная ошибка" 
      });
    }
  });
  
  // Маршрут для переноса отдельного товара из Wildberries в Ozon с детальным маппингом
  app.post("/api/migrate/wildberries-to-ozon/product", async (req: Request, res: Response) => {
    try {
      const { productId, targetCategoryId, attributeMappings } = req.body;
      
      if (!productId || !targetCategoryId) {
        return res.status(400).json({ 
          message: "Необходимо указать productId и targetCategoryId" 
        });
      }
      
      // Получаем информацию о товаре
      const product = await storage.getProduct(productId);
      if (!product || product.marketplaceId !== "wildberries") {
        return res.status(404).json({ message: "Товар Wildberries не найден" });
      }
      
      // Создаем запись о миграции
      const migration = await storage.createMigration({
        status: "pending",
        totalProducts: 1,
        options: { 
          skipExisting: false,
          targetCategoryId,
          attributeMappings
        }
      });
      
      // Создаем запись о продукте миграции
      await storage.createMigrationProduct({
        migrationId: migration.id,
        productId: product.id,
        status: "pending",
      });
      
      // Запускаем миграцию товара в фоновом режиме
      migrationService.startMigration(migration.id, [productId]).catch(error => {
        console.error(`Ошибка при выполнении миграции ${migration.id}:`, error);
      });
      
      res.status(201).json({ 
        migrationId: migration.id,
        status: "success",
        message: "Перенос товара запущен"
      });
    } catch (error: any) {
      console.error("Ошибка при детальном переносе товара Wildberries -> Ozon:", error);
      res.status(500).json({ 
        message: "Не удалось перенести товар", 
        error: error.message || "Неизвестная ошибка" 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
