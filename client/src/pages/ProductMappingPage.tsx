import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Loader2, ArrowRight, RotateCcw } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";

// Интерфейсы для атрибутов
interface ProductAttribute {
  id: string;
  name: string;
  value: string;
  valueId?: string;
  required?: boolean;
}

// Интерфейс для продукта
interface Product {
  id: number;
  externalId: string;
  name: string;
  sku: string | null;
  categoryPath: string | null;
  price: number | null;
  imageUrls: string[];
  attributes: Record<string, any>;
}

// Интерфейс для категории
interface Category {
  id: number;
  name: string;
  parentId?: number;
  path?: string;
}

// Интерфейс для маппинга категорий
interface CategoryMapping {
  id: number;
  ozonCategory: string;
  wildberriesCategory: string;
}

// Интерфейс для маппинга атрибутов
interface AttributeMapping {
  id: number;
  ozonAttribute: string;
  ozonAttributeName: string;
  wildberriesAttribute: string;
  wildberriesAttributeName: string;
  categoryId?: number;
}

export default function ProductMappingPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // ID продукта и направление переноса из URL
  const productId = params.productId ? parseInt(params.productId) : 0;
  const direction = params.direction || "ozon-to-wildberries";
  
  // Состояние источника и назначения
  const sourceMarketplace = direction === "ozon-to-wildberries" ? "ozon" : "wildberries";
  const targetMarketplace = direction === "ozon-to-wildberries" ? "wildberries" : "ozon";
  
  // Состояние для выбранной категории назначения
  const [selectedTargetCategory, setSelectedTargetCategory] = useState<string>("");
  
  // Состояние для маппинга атрибутов
  const [attributeMappings, setAttributeMappings] = useState<Record<string, string>>({});
  
  // Загрузка информации о продукте
  const { data: product, isLoading: isProductLoading } = useQuery<Product>({
    queryKey: [`/api/${sourceMarketplace}/product/${productId}`],
    queryFn: async () => {
      const response = await fetch(`/api/${sourceMarketplace}/product/${productId}`);
      if (!response.ok) {
        throw new Error(`Не удалось загрузить информацию о товаре`);
      }
      return response.json();
    },
    enabled: !!productId,
  });
  
  // Загрузка категорий назначения
  const { data: targetCategories, isLoading: isTargetCategoriesLoading } = useQuery<Category[]>({
    queryKey: [`/api/${targetMarketplace}/categories`],
    queryFn: async () => {
      const response = await fetch(`/api/${targetMarketplace}/categories`);
      if (!response.ok) {
        throw new Error(`Не удалось загрузить категории ${targetMarketplace}`);
      }
      return response.json();
    },
  });
  
  // Загрузка маппинга категорий
  const { data: categoryMappings } = useQuery<CategoryMapping[]>({
    queryKey: ["/api/category-mappings"],
    queryFn: async () => {
      const response = await fetch("/api/category-mappings");
      if (!response.ok) {
        throw new Error("Не удалось загрузить маппинг категорий");
      }
      return response.json();
    },
  });
  
  // Загрузка атрибутов категории назначения
  const { data: targetCategoryAttributes, isLoading: isTargetAttributesLoading } = useQuery<ProductAttribute[]>({
    queryKey: [`/api/${targetMarketplace}/category/${selectedTargetCategory}/attributes`],
    queryFn: async () => {
      if (!selectedTargetCategory) return [];
      
      const endpoint = targetMarketplace === "ozon" 
        ? `/api/ozon/category/${selectedTargetCategory}/attributes`
        : `/api/wildberries/subject/${selectedTargetCategory}/characteristics`;
        
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Не удалось загрузить атрибуты категории`);
      }
      return response.json();
    },
    enabled: !!selectedTargetCategory,
  });
  
  // Мутация для переноса товара с настроенным маппингом
  const migrationMutation = useMutation({
    mutationFn: async (migrationData: {
      productId: number;
      targetCategoryId: string;
      attributeMappings: Record<string, string>;
    }) => {
      const endpoint = direction === "ozon-to-wildberries" 
        ? "/api/migrate/ozon-to-wildberries/product"
        : "/api/migrate/wildberries-to-ozon/product";
        
      const response = await apiRequest("POST", endpoint, migrationData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Товар успешно перенесен",
        description: `Товар был успешно перенесен в ${targetMarketplace === "ozon" ? "Ozon" : "Wildberries"}`,
      });
      
      // Перенаправляем на страницу миграций
      setLocation(`/migrations/${data.migrationId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка при переносе товара",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Получаем список атрибутов исходного товара
  const getSourceAttributes = (): ProductAttribute[] => {
    if (!product || !product.attributes) return [];
    
    // Преобразуем объект атрибутов в массив
    return Object.entries(product.attributes).map(([id, attr]) => ({
      id,
      name: attr.name || id,
      value: attr.value || "",
      valueId: attr.valueId,
    }));
  };
  
  // Находим соответствие категории
  useEffect(() => {
    if (!product || !product.categoryPath || !categoryMappings) return;
    
    // Пытаемся найти соответствие категории
    const sourceCategoryPath = product.categoryPath;
    const mapping = categoryMappings.find(m => 
      (sourceMarketplace === "ozon" && m.ozonCategory === sourceCategoryPath) ||
      (sourceMarketplace === "wildberries" && m.wildberriesCategory === sourceCategoryPath)
    );
    
    if (mapping) {
      // Устанавливаем найденную категорию
      const targetCategory = sourceMarketplace === "ozon" 
        ? mapping.wildberriesCategory 
        : mapping.ozonCategory;
        
      // Находим ID категории по имени
      if (targetCategories) {
        const category = targetCategories.find(c => 
          c.path === targetCategory || c.name === targetCategory
        );
        
        if (category) {
          setSelectedTargetCategory(category.id.toString());
        }
      }
    }
  }, [product, categoryMappings, targetCategories]);
  
  // Обновляем маппинг атрибутов при изменении атрибутов исходного и целевого товара
  useEffect(() => {
    if (!targetCategoryAttributes) return;
    
    const sourceAttrs = getSourceAttributes();
    const initialMappings: Record<string, string> = {};
    
    // Пытаемся автоматически сопоставить атрибуты по названию
    sourceAttrs.forEach(sourceAttr => {
      const matchingTargetAttr = targetCategoryAttributes.find(targetAttr => 
        targetAttr.name.toLowerCase() === sourceAttr.name.toLowerCase()
      );
      
      if (matchingTargetAttr) {
        initialMappings[sourceAttr.id] = matchingTargetAttr.id;
      }
    });
    
    setAttributeMappings(initialMappings);
  }, [targetCategoryAttributes]);
  
  const handleCategoryChange = (categoryId: string) => {
    setSelectedTargetCategory(categoryId);
  };
  
  const handleAttributeMappingChange = (sourceAttrId: string, targetAttrId: string) => {
    setAttributeMappings(prev => ({
      ...prev,
      [sourceAttrId]: targetAttrId
    }));
  };
  
  const handleMigrateProduct = () => {
    if (!selectedTargetCategory) {
      toast({
        title: "Категория не выбрана",
        description: "Пожалуйста, выберите категорию назначения",
        variant: "destructive",
      });
      return;
    }
    
    // Проверяем обязательные атрибуты
    if (targetCategoryAttributes) {
      const requiredAttrs = targetCategoryAttributes.filter(attr => attr.required);
      const isMissingRequired = requiredAttrs.some(attr => {
        // Проверяем, есть ли для этого обязательного атрибута маппинг
        return !Object.values(attributeMappings).includes(attr.id);
      });
      
      if (isMissingRequired) {
        toast({
          title: "Не все обязательные атрибуты сопоставлены",
          description: "Пожалуйста, сопоставьте все обязательные атрибуты",
          variant: "destructive",
        });
        return;
      }
    }
    
    migrationMutation.mutate({
      productId,
      targetCategoryId: selectedTargetCategory,
      attributeMappings
    });
  };
  
  // Получаем исходные атрибуты товара
  const sourceAttributes = getSourceAttributes();
  
  if (isProductLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <Card>
            <CardContent className="p-10">
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-4 text-lg">Загрузка информации о товаре...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }
  
  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <Card>
            <CardContent className="p-10">
              <div className="flex flex-col items-center justify-center">
                <p className="text-lg text-red-500">Товар не найден</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setLocation("/products")}
                >
                  Вернуться к списку товаров
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Настройка переноса товара</CardTitle>
            <CardDescription>
              Настройте соответствие атрибутов для переноса товара из {sourceMarketplace === "ozon" ? "Ozon" : "Wildberries"} в {targetMarketplace === "ozon" ? "Ozon" : "Wildberries"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Информация о товаре */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Информация о товаре</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Название:</span>
                      <span className="font-medium">{product.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Артикул:</span>
                      <span>{product.sku || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Категория:</span>
                      <span>{product.categoryPath || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Цена:</span>
                      <span>{product.price ? `${product.price} ₽` : "—"}</span>
                    </div>
                  </div>
                </div>
                
                {/* Выбор категории назначения */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Категория в {targetMarketplace === "ozon" ? "Ozon" : "Wildberries"}</h3>
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Выберите категорию</label>
                      <Select value={selectedTargetCategory} onValueChange={handleCategoryChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                        <SelectContent>
                          {isTargetCategoriesLoading ? (
                            <div className="p-2 flex items-center justify-center">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="ml-2">Загрузка категорий...</span>
                            </div>
                          ) : !targetCategories || targetCategories.length === 0 ? (
                            <div className="p-2 text-center text-muted-foreground">
                              Категории не найдены
                            </div>
                          ) : (
                            targetCategories.map(category => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.path || category.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {isTargetAttributesLoading && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Загрузка атрибутов категории...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            <h3 className="text-lg font-medium mb-4">Сопоставление атрибутов</h3>
            
            {selectedTargetCategory ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Колонка атрибутов исходного товара */}
                  <div>
                    <h4 className="text-md font-medium mb-2">
                      Атрибуты товара в {sourceMarketplace === "ozon" ? "Ozon" : "Wildberries"}
                    </h4>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Название атрибута</TableHead>
                            <TableHead>Значение</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sourceAttributes.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-4">
                                <p className="text-muted-foreground">
                                  У товара нет атрибутов
                                </p>
                              </TableCell>
                            </TableRow>
                          ) : (
                            sourceAttributes.map(attr => (
                              <TableRow key={attr.id}>
                                <TableCell>{attr.name}</TableCell>
                                <TableCell>{attr.value || "—"}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  
                  {/* Колонка для сопоставления с атрибутами целевого маркетплейса */}
                  <div>
                    <h4 className="text-md font-medium mb-2">
                      Сопоставление с атрибутами {targetMarketplace === "ozon" ? "Ozon" : "Wildberries"}
                    </h4>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Атрибут исходного товара</TableHead>
                            <TableHead>Атрибут целевого маркетплейса</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sourceAttributes.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-4">
                                <p className="text-muted-foreground">
                                  Нет атрибутов для сопоставления
                                </p>
                              </TableCell>
                            </TableRow>
                          ) : isTargetAttributesLoading ? (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                <span className="mt-2 block text-sm text-muted-foreground">
                                  Загрузка атрибутов целевой категории...
                                </span>
                              </TableCell>
                            </TableRow>
                          ) : !targetCategoryAttributes || targetCategoryAttributes.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-4">
                                <p className="text-muted-foreground">
                                  В выбранной категории нет атрибутов
                                </p>
                              </TableCell>
                            </TableRow>
                          ) : (
                            sourceAttributes.map(sourceAttr => (
                              <TableRow key={sourceAttr.id}>
                                <TableCell>{sourceAttr.name}</TableCell>
                                <TableCell>
                                  <Select
                                    value={attributeMappings[sourceAttr.id] || ""}
                                    onValueChange={(value) => handleAttributeMappingChange(sourceAttr.id, value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Выберите атрибут" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="">Не сопоставлять</SelectItem>
                                      {targetCategoryAttributes.map(targetAttr => (
                                        <SelectItem key={targetAttr.id} value={targetAttr.id}>
                                          {targetAttr.name} {targetAttr.required ? "* (обязательный)" : ""}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
                
                {targetCategoryAttributes && targetCategoryAttributes.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-md font-medium mb-2">
                      Обязательные атрибуты целевой категории
                    </h4>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Название атрибута</TableHead>
                            <TableHead>Статус</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {targetCategoryAttributes
                            .filter(attr => attr.required)
                            .map(attr => {
                              const isMapped = Object.values(attributeMappings).includes(attr.id);
                              return (
                                <TableRow key={attr.id}>
                                  <TableCell>{attr.name}</TableCell>
                                  <TableCell>
                                    {isMapped ? (
                                      <span className="text-green-600">✓ Сопоставлен</span>
                                    ) : (
                                      <span className="text-red-600">⚠ Не сопоставлен</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Выберите категорию назначения, чтобы настроить маппинг атрибутов</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setLocation("/products")}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Вернуться к выбору товаров
            </Button>
            <Button 
              onClick={handleMigrateProduct} 
              disabled={!selectedTargetCategory || migrationMutation.isPending}
            >
              {migrationMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Перенос товара...
                </>
              ) : (
                <>
                  Перенести товар
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}