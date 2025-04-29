import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Loader2, Search } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

// Тип продукта
interface Product {
  id: number;
  externalId: string;
  name: string;
  sku: string | null;
  categoryPath: string | null;
  price: number | null;
  imageUrls: string[];
  attributes: Record<string, any>;
  hasWildberriesAnalog?: boolean;
  hasOzonAnalog?: boolean;
}

export default function SelectProductsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [marketplaceSource, setMarketplaceSource] = useState("ozon");
  const [marketplaceTarget, setMarketplaceTarget] = useState("wildberries");
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [allSelected, setAllSelected] = useState(false);

  // Запрос на получение товаров выбранного источника
  const { data: products, isLoading, refetch } = useQuery<Product[]>({
    queryKey: [
      marketplaceSource === "ozon" ? "/api/ozon/products" : "/api/wildberries/products",
      searchQuery,
    ],
    queryFn: async () => {
      const url = marketplaceSource === "ozon" 
        ? `/api/ozon/products${searchQuery ? `?query=${encodeURIComponent(searchQuery)}` : ""}`
        : `/api/wildberries/products${searchQuery ? `?query=${encodeURIComponent(searchQuery)}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Не удалось загрузить товары");
      }
      return response.json();
    },
  });

  // Запрос на синхронизацию товаров с выбранного маркетплейса
  const syncMutation = useMutation({
    mutationFn: async () => {
      const url = marketplaceSource === "ozon" 
        ? "/api/ozon/sync"
        : "/api/wildberries/sync";
      const response = await apiRequest("POST", url);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Синхронизация завершена",
        description: `Синхронизировано ${data.synced} из ${data.total} товаров`,
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка синхронизации",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Запрос на перенос выбранных товаров
  const migrateMutation = useMutation({
    mutationFn: async (productIds: number[]) => {
      // Выбираем правильный эндпоинт в зависимости от направления переноса
      const url = marketplaceSource === "ozon" 
        ? "/api/migrate/ozon-to-wildberries"
        : "/api/migrate/wildberries-to-ozon";
      
      const response = await apiRequest("POST", url, { productIds });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Перенос товаров начат",
        description: `Начат перенос ${data.totalProducts} товаров`,
      });
      
      // Перенаправляем на страницу с деталями миграции
      setLocation(`/migrations/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка переноса товаров",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Обработчик смены маркетплейса
  const handleMarketplaceSourceChange = (value: string) => {
    setMarketplaceSource(value);
    // Автоматически выбираем противоположный маркетплейс как цель
    setMarketplaceTarget(value === "ozon" ? "wildberries" : "ozon");
    // Сбрасываем выбранные товары
    setSelectedProducts(new Set());
    setAllSelected(false);
  };

  // Обработчик выбора всех товаров
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedProducts(new Set());
    } else {
      const newSelectedProducts = new Set<number>();
      products?.forEach((product) => {
        newSelectedProducts.add(product.id);
      });
      setSelectedProducts(newSelectedProducts);
    }
    setAllSelected(!allSelected);
  };

  // Обработчик выбора конкретного товара
  const handleProductSelect = (id: number) => {
    const newSelectedProducts = new Set(selectedProducts);
    if (newSelectedProducts.has(id)) {
      newSelectedProducts.delete(id);
    } else {
      newSelectedProducts.add(id);
    }
    setSelectedProducts(newSelectedProducts);
    
    // Проверяем, все ли товары выбраны
    setAllSelected(products && newSelectedProducts.size === products.length);
  };

  // Запуск переноса выбранных товаров
  const handleMigrate = () => {
    if (selectedProducts.size === 0) {
      toast({
        title: "Не выбраны товары",
        description: "Выберите хотя бы один товар для переноса",
        variant: "destructive",
      });
      return;
    }
    
    migrateMutation.mutate(Array.from(selectedProducts));
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Перенос товаров между маркетплейсами</CardTitle>
            <CardDescription>
              Выберите товары для переноса между Ozon и Wildberries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap gap-4">
                <div className="w-full md:w-[250px]">
                  <label className="text-sm font-medium mb-1 block">Маркетплейс-источник</label>
                  <Select value={marketplaceSource} onValueChange={handleMarketplaceSourceChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите маркетплейс" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Маркетплейсы</SelectLabel>
                        <SelectItem value="ozon">Ozon</SelectItem>
                        <SelectItem value="wildberries">Wildberries</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full md:w-[250px]">
                  <label className="text-sm font-medium mb-1 block">Маркетплейс-получатель</label>
                  <Select value={marketplaceTarget} disabled>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите маркетплейс" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Маркетплейсы</SelectLabel>
                        <SelectItem value="ozon">Ozon</SelectItem>
                        <SelectItem value="wildberries">Wildberries</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grow">
                  <label className="text-sm font-medium mb-1 block">Поиск товаров</label>
                  <div className="flex gap-2">
                    <div className="relative w-full">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Поиск по названию, артикулу или категории"
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && refetch()}
                      />
                    </div>
                    <Button 
                      variant="secondary" 
                      onClick={() => refetch()}
                      disabled={isLoading}
                    >
                      Найти
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => syncMutation.mutate()}
                      disabled={syncMutation.isPending}
                    >
                      {syncMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Синхронизация...
                        </>
                      ) : (
                        "Синхронизировать"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={handleSelectAll}
                          disabled={!products || products.length === 0}
                        />
                      </TableHead>
                      <TableHead>Название товара</TableHead>
                      <TableHead>Артикул</TableHead>
                      <TableHead>Категория</TableHead>
                      <TableHead className="text-right">Цена</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          <span className="mt-2 block text-sm text-muted-foreground">
                            Загрузка товаров...
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : !products || products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <p className="text-muted-foreground">
                            Товары не найдены. Попробуйте синхронизировать данные с маркетплейсом.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      products.map((product) => {
                        // Проверяем, есть ли аналог товара на целевом маркетплейсе
                        const hasAnalog = marketplaceSource === "ozon" 
                          ? product.hasWildberriesAnalog 
                          : product.hasOzonAnalog;
                          
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              <Checkbox 
                                checked={selectedProducts.has(product.id)}
                                onCheckedChange={() => handleProductSelect(product.id)}
                                disabled={hasAnalog}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{product.name}</div>
                              {hasAnalog && (
                                <div className="text-xs text-blue-600">
                                  Товар уже есть на {marketplaceTarget === "ozon" ? "Ozon" : "Wildberries"}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{product.sku || "—"}</TableCell>
                            <TableCell>{product.categoryPath || "—"}</TableCell>
                            <TableCell className="text-right">
                              {product.price ? `${product.price.toLocaleString()} ₽` : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div>
              <span className="text-sm text-muted-foreground">
                Выбрано товаров: {selectedProducts.size}
              </span>
            </div>
            <Button 
              onClick={handleMigrate} 
              disabled={selectedProducts.size === 0 || migrateMutation.isPending}
            >
              {migrateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Перенос...
                </>
              ) : (
                `Перенести на ${marketplaceTarget === "ozon" ? "Ozon" : "Wildberries"}`
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}