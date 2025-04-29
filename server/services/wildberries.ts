import axios from "axios";
import { IStorage } from "../storage";
import { InsertProduct, Product } from "@shared/schema";

export class WildberriesService {
  private storage: IStorage;
  // Согласно документации: https://dev.wildberries.ru/openapi/api-information
  private baseUrl = "https://suppliers-api.wildberries.ru";
  private contentApiUrl = "https://content-api.wildberries.ru";

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  private async getApiCredentials() {
    // Пробуем получить значение из переменной окружения
    const envApiKey = process.env.WILDBERRIES_API_KEY?.trim();
    
    if (envApiKey) {
      console.log("Using Wildberries API credentials from environment variable");
      return {
        apiKey: envApiKey,
        isConnected: false
      };
    }
    
    // Если нет в переменной окружения, берем из базы данных
    const config = await this.storage.getMarketplaceApiConfig("wildberries");
    if (!config || !config.apiKey) {
      throw new Error("Wildberries API credentials not configured");
    }
    
    return {
      apiKey: config.apiKey.trim(),
      isConnected: config.isConnected
    };
  }

  async testConnection(apiKey?: string): Promise<boolean> {
    try {
      const key = apiKey || (await this.getApiCredentials()).apiKey;
      
      console.log("Testing Wildberries API connection with key:", key?.substring(0, 10) + "...");
      
      // Согласно документации https://dev.wildberries.ru/openapi/api-information
      // Используем метод проверки соединения /ping, который присутствует у всех API Wildberries
      
      // Проверяем подключение к Content API (основной API для работы с товарами)
      console.log("Тестирование подключения к Content API Wildberries...");
      const contentApiResponse = await axios.get(
        "https://content-api.wildberries.ru/ping",
        {
          headers: {
            "Authorization": key,
            "Accept": "application/json"
          }
        }
      );
      
      if (contentApiResponse.status === 200) {
        console.log("Успешно подключились к Content API Wildberries:", contentApiResponse.data);
        return true;
      }
      
      // Если первый запрос не удался, проверяем подключение к Common API
      const commonApiResponse = await axios.get(
        "https://common-api.wildberries.ru/ping",
        {
          headers: {
            "Authorization": key,
            "Accept": "application/json"
          }
        }
      );
      
      console.log("Результат проверки подключения к Common API Wildberries:", commonApiResponse.data);
      return commonApiResponse.status === 200;
      
    } catch (error: any) {
      console.error("Wildberries API connection test failed:", error.message || error);
      
      if (error.response) {
        console.error("Статус ошибки:", error.response.status);
        console.error("Заголовки запроса:", error.config?.headers);
        console.error("Данные ответа:", error.response.data);
      }
      
      return false;
    }
  }

  async getProducts(query?: string): Promise<Product[]> {
    try {
      const credentials = await this.getApiCredentials();
      
      // Проверяем состояние соединения с API
      if (!credentials.isConnected) {
        console.log("Wildberries API not marked as connected. Trying anyway...");
      }
      
      // Сначала пробуем получить товары из хранилища
      const storedProducts = await this.storage.getProductsByMarketplace("wildberries");
      
      // Если есть сохраненные товары и задан поисковый запрос, фильтруем их
      if (storedProducts.length > 0) {
        if (query) {
          return await this.storage.searchProducts(query, "wildberries");
        }
        return storedProducts;
      }
      
      // Если нет сохраненных товаров, синхронизируем с API
      await this.syncProducts();
      
      if (query) {
        return await this.storage.searchProducts(query, "wildberries");
      }
      return await this.storage.getProductsByMarketplace("wildberries");
    } catch (error) {
      console.error("Failed to get Wildberries products:", error);
      throw error;
    }
  }

  async syncProducts(): Promise<{ total: number; synced: number }> {
    try {
      const credentials = await this.getApiCredentials();
      
      // Проверяем состояние подключения, но продолжаем даже если оно не подтверждено
      if (!credentials.isConnected) {
        console.log("Wildberries API not marked as connected. Attempting to sync anyway...");
      }
      
      let synced = 0;
      let total = 0;

      console.log("Starting Wildberries product synchronization with real API...");
      
      // Получаем список товаров (складских остатков) через API Wildberries
      // Согласно документации: https://dev.wildberries.ru/openapi/api-information
      const response = await axios.get(
        `${this.baseUrl}/api/v3/stocks/goods`,
        {
          headers: {
            "Authorization": credentials.apiKey,
            "Content-Type": "application/json"
          }
        }
      );
      
      console.log("Wildberries API stocks response status:", response.status);
      
      if (response.status !== 200) {
        throw new Error(`Wildberries API returned status ${response.status}`);
      }
      
      const stocks = response.data.stocks || [];
      total = stocks.length;
      
      console.log(`Received ${stocks.length} products from Wildberries API`);
      
      // Обрабатываем полученные товары
      for (const stock of stocks) {
        try {
          // Получаем номенклатуру (nmId) товара
          const nmId = stock.nmId;
          
          // Получаем карточку товара через API карточек
          // Согласно документации https://dev.wildberries.ru/openapi/api-content
          // Используем POST вместо GET, как требует API Wildberries
          const cardResponse = await axios.post(
            `${this.contentApiUrl}/content/v2/get/cards/detail`,
            { nm: nmId },
            {
              headers: {
                "Authorization": credentials.apiKey,
                "Content-Type": "application/json"
              }
            }
          );
          
          // Проверяем и обрабатываем данные карточки
          if (cardResponse.data.cards && cardResponse.data.cards.length > 0) {
            const cardData = cardResponse.data.cards[0];
            
            // Получаем цену товара
            const priceResponse = await axios.get(
              `${this.baseUrl}/api/v2/prices`,
              {
                headers: {
                  "Authorization": credentials.apiKey,
                  "Content-Type": "application/json"
                },
                params: {
                  nmId: nmId
                }
              }
            );
            
            let price = 0;
            if (priceResponse.data && priceResponse.data.length > 0) {
              price = priceResponse.data[0].price || 0;
            }
            
            // Проверяем, существует ли товар уже в базе
            const existingProduct = await this.storage.getProductByExternalId(
              String(nmId), 
              "wildberries"
            );
            
            // Подготавливаем данные товара для сохранения
            const productData = {
              externalId: String(nmId),
              marketplaceId: "wildberries",
              name: cardData.title || cardData.subjectName || `Товар WB ${nmId}`,
              sku: cardData.vendorCode || String(nmId),
              categoryPath: cardData.subjectName || "",
              price: price,
              imageUrls: cardData.mediaFiles || [],
              attributes: cardData.characteristics || {},
              hasWildberriesAnalog: true
            };
            
            if (existingProduct) {
              // Обновляем существующий товар
              await this.storage.updateProduct(existingProduct.id, productData);
            } else {
              // Создаем новый товар
              await this.storage.createProduct(productData);
            }
            
            synced++;
          } else {
            console.log(`No card data found for Wildberries product with nmId: ${nmId}`);
          }
        } catch (itemError) {
          console.error("Error processing Wildberries product item:", itemError);
        }
      }
      
      // Обновляем дату последней синхронизации и статус подключения
      await this.storage.updateMarketplaceApiConfig("wildberries", {
        isConnected: true,
        lastSyncAt: new Date()
      });
      
      console.log(`Wildberries sync completed successfully: ${synced} of ${total} products synced.`);
      return { total, synced };
    } catch (error) {
      console.error("Failed to sync Wildberries products:", error);
      
      // Сбрасываем статус соединения при ошибке
      await this.storage.updateMarketplaceApiConfig("wildberries", {
        isConnected: false
      });
      
      throw error;
    }
  }
  
  // Получение подробной информации о карточке товара
  async getCardInfo(nmId: number): Promise<{
    name: string;
    sku: string;
    categoryPath: string;
    price: number;
    imageUrls: string[];
    attributes: Record<string, any>;
  }> {
    try {
      const credentials = await this.getApiCredentials();
      
      // Получаем подробную информацию о карточке товара
      // Согласно документации https://dev.wildberries.ru/openapi/api-content
      // Используем POST вместо GET, как требует API Wildberries
      const response = await axios.post(
        `${this.contentApiUrl}/content/v2/get/cards/detail`,
        { nm: nmId },
        {
          headers: {
            "Authorization": credentials.apiKey,
            "Content-Type": "application/json",
          }
        }
      );
      
      const card = response.data.data[0];
      
      // Получаем цены товара
      const priceResponse = await axios.get(
        `${this.baseUrl}/api/v2/prices`,
        {
          headers: {
            "Authorization": credentials.apiKey,
            "Content-Type": "application/json",
          },
          params: {
            nm_ids: [nmId],
          }
        }
      );
      
      const priceInfo = priceResponse.data.find((p: any) => p.nmID === nmId) || { price: 0 };
      
      // Формируем атрибуты
      const attributes: Record<string, any> = {};
      if (card.characteristics) {
        Object.entries(card.characteristics).forEach(([key, value]) => {
          attributes[key] = {
            name: key,
            value: value as string,
          };
        });
      }
      
      // Формируем путь категории
      const categoryPath = [
        card.object || '',
        card.parent || '',
        card.subjectName || ''
      ].filter(Boolean).join(' / ');
      
      return {
        name: card.title || card.subjectName || `Товар ${nmId}`,
        sku: card.vendorCode || `WB-${nmId}`,
        categoryPath,
        price: priceInfo.price || 0,
        imageUrls: card.mediaFiles?.map((media: string) => media) || [],
        attributes
      };
    } catch (error: any) {
      console.error(`Failed to get Wildberries card info for nmID ${nmId}:`, error);
      throw new Error(`Failed to get card info from Wildberries: ${error.message || 'Unknown error'}`);
    }
  }

  async createProduct(productData: any): Promise<{ 
    success: boolean; 
    productId?: string; 
    error?: string; 
  }> {
    try {
      const credentials = await this.getApiCredentials();
      
      if (!credentials.isConnected) {
        throw new Error("Wildberries API is not connected");
      }
      
      // Подготовка данных для создания товара в Wildberries
      // Формируем тело запроса в соответствии с API Wildberries
      const cardData = {
        subjectID: productData.subjectId || 0, // ID предмета в Wildberries
        vendorCode: productData.sku,
        title: productData.name,
        description: productData.description || "",
        characteristics: productData.attributes || {},
        images: productData.imageUrls || [],
        price: {
          priceRrc: productData.price || 0
        }
      };
      
      // В реальной реализации отправляем запрос на создание карточки
      const response = await axios.post(
        `${this.contentApiUrl}/api/v1/card/upload`,
        cardData,
        {
          headers: {
            "Authorization": credentials.apiKey,
            "Content-Type": "application/json",
          }
        }
      );
      
      // Обрабатываем ответ от API
      if (response.data.error) {
        return {
          success: false,
          error: response.data.errorText || "Ошибка при создании товара на Wildberries"
        };
      }
      
      // Извлекаем ID созданного товара
      const productId = response.data.data.nmID?.toString();
      
      if (!productId) {
        return {
          success: false,
          error: "Не удалось получить ID созданного товара"
        };
      }
      
      // Добавляем товар в локальное хранилище
      await this.storage.createProduct({
        externalId: productId,
        marketplaceId: "wildberries",
        name: productData.name,
        sku: productData.sku || "",
        categoryPath: productData.categoryPath || "",
        price: productData.price || 0,
        imageUrls: productData.imageUrls || [],
        attributes: productData.attributes || {},
        hasWildberriesAnalog: true
      });
      
      return {
        success: true,
        productId
      };
    } catch (error: any) {
      console.error("Failed to create Wildberries product:", error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  async updateProductStock(productId: string, stock: number): Promise<boolean> {
    try {
      const credentials = await this.getApiCredentials();
      
      if (!credentials.isConnected) {
        throw new Error("Wildberries API is not connected");
      }
      
      // Обновление остатков товара
      const response = await axios.put(
        `${this.baseUrl}/api/v3/stocks`,
        {
          stocks: [
            {
              nmId: parseInt(productId),
              wh: 507, // ID склада Wildberries (можно получить через отдельный API-запрос)
              amount: stock
            }
          ]
        },
        {
          headers: {
            "Authorization": credentials.apiKey,
            "Content-Type": "application/json",
          }
        }
      );
      
      return response.status === 200;
    } catch (error) {
      console.error(`Failed to update Wildberries product stock for ID ${productId}:`, error);
      return false;
    }
  }

  async updateProductPrice(productId: string, price: number): Promise<boolean> {
    try {
      const credentials = await this.getApiCredentials();
      
      if (!credentials.isConnected) {
        throw new Error("Wildberries API is not connected");
      }
      
      // Обновление цены товара
      const response = await axios.post(
        `${this.baseUrl}/api/v2/prices`,
        [
          {
            nmId: parseInt(productId),
            price: price
          }
        ],
        {
          headers: {
            "Authorization": credentials.apiKey,
            "Content-Type": "application/json",
          }
        }
      );
      
      return response.status === 200;
    } catch (error) {
      console.error(`Failed to update Wildberries product price for ID ${productId}:`, error);
      return false;
    }
  }
  
  // Получение категорий и предметов Wildberries
  async getCategories(): Promise<any[]> {
    try {
      const credentials = await this.getApiCredentials();
      
      const response = await axios.get(
        `${this.contentApiUrl}/api/v1/directory/get/categories`,
        {
          headers: {
            "Authorization": credentials.apiKey,
            "Content-Type": "application/json",
          }
        }
      );
      
      return response.data.data || [];
    } catch (error) {
      console.error("Failed to get Wildberries categories:", error);
      throw error;
    }
  }
  
  // Получение характеристик для категории
  async getCategoryCharacteristics(subjectId: number): Promise<any[]> {
    try {
      const credentials = await this.getApiCredentials();
      
      const response = await axios.get(
        `${this.contentApiUrl}/api/v1/directory/get/object/characteristics/${subjectId}`,
        {
          headers: {
            "Authorization": credentials.apiKey,
            "Content-Type": "application/json",
          }
        }
      );
      
      return response.data.data || [];
    } catch (error) {
      console.error(`Failed to get characteristics for subject ${subjectId}:`, error);
      throw error;
    }
  }
}
