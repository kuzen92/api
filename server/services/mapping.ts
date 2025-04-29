import { IStorage } from "../storage";
import { Product } from "@shared/schema";

export class MappingService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  // Map Ozon category to Wildberries category
  async mapCategory(ozonCategory: string): Promise<string> {
    try {
      const mapping = await this.storage.getCategoryMapping(ozonCategory);
      
      if (mapping) {
        return mapping.wildberriesCategory;
      }
      
      // If no mapping exists, try to find a similar category based on keywords
      const similarCategory = await this.findSimilarCategory(ozonCategory);
      
      if (similarCategory) {
        // Create a mapping for future use
        await this.storage.createCategoryMapping({
          ozonCategory,
          wildberriesCategory: similarCategory
        });
        
        return similarCategory;
      }
      
      // If no similar category found, use the Ozon category as is
      return ozonCategory;
    } catch (error) {
      console.error(`Failed to map category ${ozonCategory}:`, error);
      return ozonCategory;
    }
  }

  private async findSimilarCategory(ozonCategory: string): Promise<string | null> {
    // In a real implementation, this would use a more sophisticated algorithm
    // For now, we'll use simple keyword matching

    const keywords = ozonCategory.toLowerCase().split('/').flatMap(part => 
      part.trim().split(' ')
    );
    
    const mappings = await this.storage.getAllCategoryMappings();
    
    for (const mapping of mappings) {
      const wbCategory = mapping.wildberriesCategory.toLowerCase();
      if (keywords.some(keyword => wbCategory.includes(keyword))) {
        return mapping.wildberriesCategory;
      }
    }
    
    return null;
  }

  // Map Ozon product attributes to Wildberries attributes
  async mapAttributes(
    ozonProduct: Product, 
    wbCategory: string
  ): Promise<Record<string, any>> {
    if (!ozonProduct.attributes) {
      return {};
    }
    
    const mappedAttributes: Record<string, any> = {};
    
    try {
      // Найдем соответствующий маппинг категории, чтобы получить categoryId
      const categoryMappings = await this.storage.getAllCategoryMappings();
      const categoryMapping = categoryMappings.find(
        mapping => mapping.ozonCategory === ozonProduct.categoryPath
      );
      
      let categoryId = categoryMapping?.id;
      
      for (const [attrId, attribute] of Object.entries(ozonProduct.attributes)) {
        // Пытаемся найти маппинг для данного атрибута, сначала по категории
        let mapping = null;
        if (categoryId) {
          mapping = await this.storage.getAttributeMapping(attrId, categoryId);
        }
        
        // Если нет маппинга для конкретной категории, ищем общий маппинг
        if (!mapping) {
          mapping = await this.storage.getAttributeMapping(attrId);
        }
        
        if (mapping) {
          // Используем маппинг, который нашли
          mappedAttributes[mapping.wildberriesAttribute] = attribute.value;
          
          // Обновляем имена атрибутов, если они пусты
          if (!mapping.ozonAttributeName || !mapping.wildberriesAttributeName) {
            await this.storage.updateAttributeMapping(mapping.id, {
              ozonAttributeName: attribute.name,
              wildberriesAttributeName: mapping.wildberriesAttributeName || mapping.wildberriesAttribute
            });
          }
        } else {
          // Если нет маппинга, создаем новый на основе имен атрибутов
          const newMapping = await this.storage.createAttributeMapping({
            ozonAttribute: attrId,
            ozonAttributeName: attribute.name,
            wildberriesAttribute: attribute.name.replace(/\s+/g, '_').toLowerCase(),
            wildberriesAttributeName: attribute.name,
            categoryId: categoryId || null
          });
          
          mappedAttributes[newMapping.wildberriesAttribute] = attribute.value;
        }
      }
    } catch (error) {
      console.error("Ошибка при маппинге атрибутов:", error);
    }
    
    return mappedAttributes;
  }

  // Transform Ozon product to Wildberries format
  async transformProduct(ozonProduct: Product): Promise<Record<string, any>> {
    try {
      const wbCategory = await this.mapCategory(ozonProduct.categoryPath || "");
      const mappedAttributes = await this.mapAttributes(ozonProduct, wbCategory);
      
      // Извлекаем subjectId из категории (если есть)
      let subjectId = 0;
      const existingMappings = await this.storage.getAllCategoryMappings();
      const categoryMapping = existingMappings.find(m => m.wildberriesCategory === wbCategory);
      
      if (categoryMapping && categoryMapping.wildberriesSubjectId) {
        subjectId = categoryMapping.wildberriesSubjectId;
      }
      
      // Build Wildberries product structure
      const wbProduct = {
        name: ozonProduct.name,
        vendorCode: ozonProduct.sku || `OZ-${ozonProduct.externalId}`,
        categoryPath: wbCategory,
        subjectId: subjectId,
        price: ozonProduct.price,
        description: this.generateDescription(ozonProduct),
        imageUrls: ozonProduct.imageUrls || [],
        attributes: mappedAttributes,
        originalOzonId: ozonProduct.externalId,
        originalMarketplaceId: ozonProduct.marketplaceId
      };
      
      return wbProduct;
    } catch (error) {
      console.error(`Failed to transform product ${ozonProduct.id}:`, error);
      throw error;
    }
  }
  
  // Генерация описания товара на основе атрибутов
  private generateDescription(product: Product): string {
    let description = `${product.name}\n\n`;
    
    if (product.attributes && Object.keys(product.attributes).length > 0) {
      description += "Характеристики:\n";
      
      for (const [_, attribute] of Object.entries(product.attributes)) {
        if (attribute.name && attribute.value) {
          description += `- ${attribute.name}: ${attribute.value}\n`;
        }
      }
    }
    
    return description;
  }
  
  // Трансформация товара Wildberries в формат Ozon
  async transformWildberriesProduct(wbProduct: Product): Promise<Record<string, any>> {
    try {
      // Находим или создаем маппинг категорий из Wildberries в Ozon
      let ozonCategory = wbProduct.categoryPath;
      
      // Ищем существующее обратное маппинг из WB категории в Ozon
      const existingMappings = await this.storage.getAllCategoryMappings();
      const reverseMapping = existingMappings.find(m => m.wildberriesCategory === wbProduct.categoryPath);
      
      if (reverseMapping) {
        ozonCategory = reverseMapping.ozonCategory;
      }
      
      // Преобразуем атрибуты из формата WB в формат Ozon
      const ozonAttributes: Record<string, any> = {};
      
      try {
        // Находим категорию Ozon для получения ID категории для атрибутов
        const categoryMappings = await this.storage.getAllCategoryMappings();
        const categoryMapping = categoryMappings.find(
          mapping => mapping.wildberriesCategory === wbProduct.categoryPath
        );
        
        let categoryId = categoryMapping?.id;
        
        if (wbProduct.attributes) {
          // Получаем все маппинги атрибутов
          let attributeMappings: any[] = [];
          
          if (categoryId) {
            attributeMappings = await this.storage.getAttributeMappingsByCategory(categoryId);
          }
          
          if (attributeMappings.length === 0) {
            attributeMappings = await this.storage.getAllAttributeMappings();
          }
          
          for (const [key, value] of Object.entries(wbProduct.attributes)) {
            // Ищем маппинг атрибута из WB в Ozon
            const attrMapping = attributeMappings.find(m => m.wildberriesAttribute === key);
            
            if (attrMapping) {
              // Используем существующий маппинг
              ozonAttributes[attrMapping.ozonAttribute] = {
                name: attrMapping.ozonAttributeName || attrMapping.ozonAttribute,
                value: typeof value === 'object' ? value.value : value
              };
              
              // Если имена атрибутов не установлены, обновляем их
              if (!attrMapping.wildberriesAttributeName) {
                await this.storage.updateAttributeMapping(attrMapping.id, {
                  wildberriesAttributeName: key
                });
              }
            } else {
              // Создаем новый маппинг атрибута в обратном направлении
              const newAttrName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              const newMapping = await this.storage.createAttributeMapping({
                ozonAttribute: key,
                ozonAttributeName: newAttrName,
                wildberriesAttribute: key,
                wildberriesAttributeName: newAttrName,
                categoryId: categoryId || null
              });
              
              ozonAttributes[newMapping.ozonAttribute] = {
                name: newMapping.ozonAttributeName,
                value: typeof value === 'object' ? value.value : value
              };
            }
          }
        }
      } catch (error) {
        console.error("Ошибка при преобразовании атрибутов Wildberries в Ozon:", error);
      }
      
      // Строим структуру товара Ozon
      const ozonProduct = {
        name: wbProduct.name,
        offer_id: wbProduct.sku || `WB-${wbProduct.externalId}`,
        category: ozonCategory,
        price: wbProduct.price,
        description: this.generateOzonDescription(wbProduct),
        images: wbProduct.imageUrls || [],
        attributes: ozonAttributes,
        originalWildberriesId: wbProduct.externalId,
        originalMarketplaceId: wbProduct.marketplaceId
      };
      
      return ozonProduct;
    } catch (error) {
      console.error(`Failed to transform Wildberries product ${wbProduct.id}:`, error);
      throw error;
    }
  }
  
  // Генерация описания для Ozon на основе товара Wildberries
  private generateOzonDescription(product: Product): string {
    let description = `${product.name}\n\n`;
    
    if (product.attributes && Object.keys(product.attributes).length > 0) {
      description += "Характеристики:\n";
      
      for (const [_, attributeValue] of Object.entries(product.attributes)) {
        const attribute = typeof attributeValue === 'object' ? attributeValue : { name: _, value: attributeValue };
        if (attribute.name && attribute.value) {
          description += `- ${attribute.name}: ${attribute.value}\n`;
        }
      }
    }
    
    return description;
  }
  
  // Массовый перенос товаров из Wildberries в Ozon
  async migrateProductsToOzon(
    wbProductIds: number[], 
    options: { 
      updatePrices?: boolean; 
      updateStocks?: boolean; 
      skipExisting?: boolean 
    } = {}
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      productId: number;
      status: 'success' | 'failed';
      ozonProductId?: string;
      errorMessage?: string;
    }>;
  }> {
    const results: Array<{
      productId: number;
      status: 'success' | 'failed';
      ozonProductId?: string;
      errorMessage?: string;
    }> = [];
    
    let successful = 0;
    let failed = 0;
    
    for (const productId of wbProductIds) {
      try {
        // Получаем товар Wildberries из хранилища
        const wbProduct = await this.storage.getProduct(productId);
        
        if (!wbProduct) {
          results.push({
            productId,
            status: 'failed',
            errorMessage: `Товар Wildberries с ID ${productId} не найден в базе данных`
          });
          failed++;
          continue;
        }
        
        // Проверяем, существует ли уже товар на Ozon
        const existingOzonProducts = await this.storage.getProductsByMarketplace("ozon");
        const existingOzonProduct = existingOzonProducts.find(
          p => p.name === wbProduct.name || p.sku === wbProduct.sku
        );
        
        if (options.skipExisting && existingOzonProduct) {
          console.log(`Товар ${wbProduct.name} (ID: ${productId}) уже существует на Ozon, пропускаем`);
          results.push({
            productId,
            status: 'success',
            ozonProductId: existingOzonProduct.externalId
          });
          successful++;
          continue;
        }
        
        // Преобразуем товар в формат Ozon
        const ozonProductData = await this.transformWildberriesProduct(wbProduct);
        
        // Создаем товар на Ozon
        console.log(`Создаем товар на Ozon: ${ozonProductData.name}`);
        
        // В этом месте мы бы отправили запрос в API Ozon
        // Для демонстрации просто создаем запись в локальной БД
        
        // Добавляем товар в хранилище как товар Ozon
        const newProduct = await this.storage.createProduct({
          externalId: `OZ-${Date.now()}`,
          marketplaceId: "ozon",
          name: ozonProductData.name,
          sku: ozonProductData.offer_id,
          categoryPath: ozonProductData.category,
          price: ozonProductData.price,
          imageUrls: ozonProductData.images,
          attributes: ozonProductData.attributes,
          hasWildberriesAnalog: true
        });
        
        // Обновляем товар Wildberries, отмечая, что у него есть аналог на Ozon
        await this.storage.updateProduct(productId, {
          hasOzonAnalog: true
        });
        
        results.push({
          productId,
          status: 'success',
          ozonProductId: newProduct.externalId
        });
        
        successful++;
        console.log(`Товар ${ozonProductData.name} успешно создан на Ozon, ID: ${newProduct.externalId}`);
      } catch (error: any) {
        console.error(`Ошибка при переносе товара ${productId} на Ozon:`, error);
        
        results.push({
          productId,
          status: 'failed',
          errorMessage: error.message || 'Неизвестная ошибка'
        });
        
        failed++;
      }
    }
    
    return {
      total: wbProductIds.length,
      successful,
      failed,
      results
    };
  }
  
  // Массовый перенос товаров из Ozon в Wildberries
  async migrateProductsToWildberries(
    ozonProductIds: number[], 
    options: { 
      updatePrices?: boolean; 
      updateStocks?: boolean; 
      skipExisting?: boolean 
    } = {}
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      productId: number;
      status: 'success' | 'failed';
      wbProductId?: string;
      errorMessage?: string;
    }>;
  }> {
    const results: Array<{
      productId: number;
      status: 'success' | 'failed';
      wbProductId?: string;
      errorMessage?: string;
    }> = [];
    
    let successful = 0;
    let failed = 0;
    
    for (const productId of ozonProductIds) {
      try {
        // Получаем товар Ozon из хранилища
        const ozonProduct = await this.storage.getProduct(productId);
        
        if (!ozonProduct) {
          results.push({
            productId,
            status: 'failed',
            errorMessage: `Товар с ID ${productId} не найден в базе данных`
          });
          failed++;
          continue;
        }
        
        // Проверяем, есть ли уже аналог на Wildberries
        if (options.skipExisting && ozonProduct.hasWildberriesAnalog) {
          console.log(`Товар ${ozonProduct.name} (ID: ${productId}) уже имеет аналог на Wildberries, пропускаем`);
          results.push({
            productId,
            status: 'success',
            wbProductId: 'already_exists'
          });
          successful++;
          continue;
        }
        
        // Преобразуем товар в формат Wildberries
        const wbProductData = await this.transformProduct(ozonProduct);
        
        // Создаем товар на Wildberries
        console.log(`Создаем товар на Wildberries: ${wbProductData.name}`);
        
        // В этом месте мы бы отправили запрос в API Wildberries
        // Для демонстрации просто создаем запись в локальной БД
        
        // Добавляем товар в хранилище как товар Wildberries
        const newProduct = await this.storage.createProduct({
          externalId: `WB-${Date.now()}`,
          marketplaceId: "wildberries",
          name: wbProductData.name,
          sku: wbProductData.vendorCode,
          categoryPath: wbProductData.categoryPath,
          price: wbProductData.price,
          imageUrls: wbProductData.imageUrls,
          attributes: wbProductData.attributes,
          hasWildberriesAnalog: false
        });
        
        // Отмечаем в товаре Ozon, что у него есть аналог на Wildberries
        await this.storage.updateProduct(productId, {
          hasWildberriesAnalog: true
        });
        
        results.push({
          productId,
          status: 'success',
          wbProductId: newProduct.externalId
        });
        
        successful++;
        console.log(`Товар ${wbProductData.name} успешно создан на Wildberries, ID: ${newProduct.externalId}`);
      } catch (error: any) {
        console.error(`Ошибка при переносе товара ${productId} на Wildberries:`, error);
        
        results.push({
          productId,
          status: 'failed',
          errorMessage: error.message || 'Неизвестная ошибка'
        });
        
        failed++;
      }
    }
    
    return {
      total: ozonProductIds.length,
      successful,
      failed,
      results
    };
  }
}
