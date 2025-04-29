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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Loader2, Plus, Edit, Save, Trash2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Типы данных для маппинга категорий
interface CategoryMapping {
  id: number;
  ozonCategory: string;
  wildberriesCategory: string;
}

// Типы данных для маппинга атрибутов
interface AttributeMapping {
  id: number;
  ozonAttribute: string;
  ozonAttributeName: string;
  wildberriesAttribute: string;
  wildberriesAttributeName: string;
  categoryId?: number;
}

// Типы для категорий и атрибутов из маркетплейсов
interface OzonCategory {
  category_id: number;
  title: string;
  children?: OzonCategory[];
}

interface WildberriesCategory {
  id: number;
  name: string;
  parentName?: string;
  path?: string;
}

export default function CategoryMappingPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("categories");
  
  // Состояние для редактирования/добавления категорий
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [selectedCategoryMapping, setSelectedCategoryMapping] = useState<CategoryMapping | null>(null);
  const [ozonCategoryInput, setOzonCategoryInput] = useState("");
  const [wbCategoryInput, setWbCategoryInput] = useState("");
  
  // Состояние для редактирования/добавления атрибутов
  const [isAddAttributeOpen, setIsAddAttributeOpen] = useState(false);
  const [selectedAttributeMapping, setSelectedAttributeMapping] = useState<AttributeMapping | null>(null);
  const [ozonAttributeInput, setOzonAttributeInput] = useState("");
  const [ozonAttributeNameInput, setOzonAttributeNameInput] = useState("");
  const [wbAttributeInput, setWbAttributeInput] = useState("");
  const [wbAttributeNameInput, setWbAttributeNameInput] = useState("");
  const [categoryIdInput, setCategoryIdInput] = useState("");

  // Запрос на получение маппинга категорий
  const { 
    data: categoryMappings,
    isLoading: isCategoryMappingsLoading,
    refetch: refetchCategoryMappings
  } = useQuery<CategoryMapping[]>({
    queryKey: ["/api/category-mappings"],
    queryFn: async () => {
      const response = await fetch("/api/category-mappings");
      if (!response.ok) {
        throw new Error("Не удалось загрузить маппинг категорий");
      }
      return response.json();
    },
  });

  // Запрос на получение маппинга атрибутов
  const { 
    data: attributeMappings,
    isLoading: isAttributeMappingsLoading,
    refetch: refetchAttributeMappings
  } = useQuery<AttributeMapping[]>({
    queryKey: ["/api/attribute-mappings"],
    queryFn: async () => {
      const response = await fetch("/api/attribute-mappings");
      if (!response.ok) {
        throw new Error("Не удалось загрузить маппинг атрибутов");
      }
      return response.json();
    },
  });

  // Запрос на получение категорий Ozon
  const { 
    data: ozonCategories,
    isLoading: isOzonCategoriesLoading
  } = useQuery<OzonCategory[]>({
    queryKey: ["/api/ozon/categories"],
    queryFn: async () => {
      const response = await fetch("/api/ozon/categories");
      if (!response.ok) {
        throw new Error("Не удалось загрузить категории Ozon");
      }
      return response.json();
    },
  });

  // Запрос на получение категорий Wildberries
  const { 
    data: wbCategories,
    isLoading: isWbCategoriesLoading
  } = useQuery<WildberriesCategory[]>({
    queryKey: ["/api/wildberries/categories"],
    queryFn: async () => {
      const response = await fetch("/api/wildberries/categories");
      if (!response.ok) {
        throw new Error("Не удалось загрузить категории Wildberries");
      }
      return response.json();
    },
  });

  // Мутация для создания/обновления маппинга категорий
  const categoryMappingMutation = useMutation({
    mutationFn: async (mappingData: {
      id?: number;
      ozonCategory: string;
      wildberriesCategory: string;
    }) => {
      if (mappingData.id) {
        // Обновление существующего маппинга
        const response = await apiRequest(
          "PUT", 
          `/api/category-mappings/${mappingData.id}`,
          mappingData
        );
        return response.json();
      } else {
        // Создание нового маппинга
        const response = await apiRequest(
          "POST",
          "/api/category-mappings",
          mappingData
        );
        return response.json();
      }
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Маппинг категорий сохранен",
      });
      setIsAddCategoryOpen(false);
      setSelectedCategoryMapping(null);
      setOzonCategoryInput("");
      setWbCategoryInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/category-mappings"] });
      refetchCategoryMappings();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Мутация для создания/обновления маппинга атрибутов
  const attributeMappingMutation = useMutation({
    mutationFn: async (mappingData: {
      id?: number;
      ozonAttribute: string;
      ozonAttributeName: string;
      wildberriesAttribute: string;
      wildberriesAttributeName: string;
      categoryId?: number;
    }) => {
      if (mappingData.id) {
        // Обновление существующего маппинга
        const response = await apiRequest(
          "PUT", 
          `/api/attribute-mappings/${mappingData.id}`,
          mappingData
        );
        return response.json();
      } else {
        // Создание нового маппинга
        const response = await apiRequest(
          "POST",
          "/api/attribute-mappings",
          mappingData
        );
        return response.json();
      }
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Маппинг атрибутов сохранен",
      });
      setIsAddAttributeOpen(false);
      setSelectedAttributeMapping(null);
      setOzonAttributeInput("");
      setOzonAttributeNameInput("");
      setWbAttributeInput("");
      setWbAttributeNameInput("");
      setCategoryIdInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/attribute-mappings"] });
      refetchAttributeMappings();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Мутация для удаления маппинга категорий
  const deleteCategoryMappingMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/category-mappings/${id}`
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Маппинг категории удален",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/category-mappings"] });
      refetchCategoryMappings();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Мутация для удаления маппинга атрибутов
  const deleteAttributeMappingMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/attribute-mappings/${id}`
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Маппинг атрибута удален",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attribute-mappings"] });
      refetchAttributeMappings();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Функция для редактирования маппинга категорий
  const handleEditCategoryMapping = (mapping: CategoryMapping) => {
    setSelectedCategoryMapping(mapping);
    setOzonCategoryInput(mapping.ozonCategory);
    setWbCategoryInput(mapping.wildberriesCategory);
    setIsAddCategoryOpen(true);
  };

  // Функция для редактирования маппинга атрибутов
  const handleEditAttributeMapping = (mapping: AttributeMapping) => {
    setSelectedAttributeMapping(mapping);
    setOzonAttributeInput(mapping.ozonAttribute);
    setOzonAttributeNameInput(mapping.ozonAttributeName);
    setWbAttributeInput(mapping.wildberriesAttribute);
    setWbAttributeNameInput(mapping.wildberriesAttributeName);
    setCategoryIdInput(mapping.categoryId?.toString() || "");
    setIsAddAttributeOpen(true);
  };

  // Функция для сохранения маппинга категорий
  const handleSaveCategoryMapping = () => {
    if (!ozonCategoryInput || !wbCategoryInput) {
      toast({
        title: "Ошибка",
        description: "Все поля должны быть заполнены",
        variant: "destructive",
      });
      return;
    }

    categoryMappingMutation.mutate({
      id: selectedCategoryMapping?.id,
      ozonCategory: ozonCategoryInput,
      wildberriesCategory: wbCategoryInput,
    });
  };

  // Функция для сохранения маппинга атрибутов
  const handleSaveAttributeMapping = () => {
    if (!ozonAttributeInput || !ozonAttributeNameInput || !wbAttributeInput || !wbAttributeNameInput) {
      toast({
        title: "Ошибка",
        description: "Поля атрибутов должны быть заполнены",
        variant: "destructive",
      });
      return;
    }

    attributeMappingMutation.mutate({
      id: selectedAttributeMapping?.id,
      ozonAttribute: ozonAttributeInput,
      ozonAttributeName: ozonAttributeNameInput,
      wildberriesAttribute: wbAttributeInput,
      wildberriesAttributeName: wbAttributeNameInput,
      categoryId: categoryIdInput ? parseInt(categoryIdInput) : undefined,
    });
  };

  // Сброс формы категорий при закрытии диалога
  const handleCategoryDialogClose = () => {
    setSelectedCategoryMapping(null);
    setOzonCategoryInput("");
    setWbCategoryInput("");
    setIsAddCategoryOpen(false);
  };

  // Сброс формы атрибутов при закрытии диалога
  const handleAttributeDialogClose = () => {
    setSelectedAttributeMapping(null);
    setOzonAttributeInput("");
    setOzonAttributeNameInput("");
    setWbAttributeInput("");
    setWbAttributeNameInput("");
    setCategoryIdInput("");
    setIsAddAttributeOpen(false);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Настройка маппинга для переноса товаров</CardTitle>
            <CardDescription>
              Настройте соответствие категорий и атрибутов между Ozon и Wildberries для корректного переноса товаров
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="categories">Маппинг категорий</TabsTrigger>
                <TabsTrigger value="attributes">Маппинг атрибутов</TabsTrigger>
              </TabsList>
              
              <TabsContent value="categories">
                <div className="flex justify-between mb-4">
                  <h3 className="text-lg font-medium">Соответствие категорий</h3>
                  <Button onClick={() => setIsAddCategoryOpen(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить маппинг
                  </Button>
                </div>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Категория Ozon</TableHead>
                        <TableHead>Категория Wildberries</TableHead>
                        <TableHead className="w-[100px] text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isCategoryMappingsLoading ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            <span className="mt-2 block text-sm text-muted-foreground">
                              Загрузка маппингов категорий...
                            </span>
                          </TableCell>
                        </TableRow>
                      ) : !categoryMappings || categoryMappings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8">
                            <p className="text-muted-foreground">
                              Маппинги категорий не найдены. Добавьте первый маппинг.
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        categoryMappings.map((mapping) => (
                          <TableRow key={mapping.id}>
                            <TableCell>{mapping.ozonCategory}</TableCell>
                            <TableCell>{mapping.wildberriesCategory}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditCategoryMapping(mapping)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteCategoryMappingMutation.mutate(mapping.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Диалог добавления/редактирования маппинга категорий */}
                <Dialog 
                  open={isAddCategoryOpen} 
                  onOpenChange={(open) => !open && handleCategoryDialogClose()}
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {selectedCategoryMapping ? "Редактировать маппинг категорий" : "Добавить маппинг категорий"}
                      </DialogTitle>
                      <DialogDescription>
                        Укажите соответствие между категориями Ozon и Wildberries
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="ozonCategory">Категория Ozon</Label>
                        <Textarea
                          id="ozonCategory"
                          placeholder="Например: Электроника/Смартфоны"
                          value={ozonCategoryInput}
                          onChange={(e) => setOzonCategoryInput(e.target.value)}
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="wbCategory">Категория Wildberries</Label>
                        <Textarea
                          id="wbCategory"
                          placeholder="Например: Электроника/Смартфоны и телефоны"
                          value={wbCategoryInput}
                          onChange={(e) => setWbCategoryInput(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={handleCategoryDialogClose}>
                        Отмена
                      </Button>
                      <Button onClick={handleSaveCategoryMapping} disabled={categoryMappingMutation.isPending}>
                        {categoryMappingMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Сохранение...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Сохранить
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>
              
              <TabsContent value="attributes">
                <div className="flex justify-between mb-4">
                  <h3 className="text-lg font-medium">Соответствие атрибутов</h3>
                  <Button onClick={() => setIsAddAttributeOpen(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить маппинг
                  </Button>
                </div>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Атрибут Ozon</TableHead>
                        <TableHead>Название Ozon</TableHead>
                        <TableHead>Атрибут Wildberries</TableHead>
                        <TableHead>Название Wildberries</TableHead>
                        <TableHead>Категория ID</TableHead>
                        <TableHead className="w-[100px] text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isAttributeMappingsLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            <span className="mt-2 block text-sm text-muted-foreground">
                              Загрузка маппингов атрибутов...
                            </span>
                          </TableCell>
                        </TableRow>
                      ) : !attributeMappings || attributeMappings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <p className="text-muted-foreground">
                              Маппинги атрибутов не найдены. Добавьте первый маппинг.
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        attributeMappings.map((mapping) => (
                          <TableRow key={mapping.id}>
                            <TableCell>{mapping.ozonAttribute}</TableCell>
                            <TableCell>{mapping.ozonAttributeName}</TableCell>
                            <TableCell>{mapping.wildberriesAttribute}</TableCell>
                            <TableCell>{mapping.wildberriesAttributeName}</TableCell>
                            <TableCell>{mapping.categoryId || "—"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditAttributeMapping(mapping)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteAttributeMappingMutation.mutate(mapping.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Диалог добавления/редактирования маппинга атрибутов */}
                <Dialog 
                  open={isAddAttributeOpen} 
                  onOpenChange={(open) => !open && handleAttributeDialogClose()}
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {selectedAttributeMapping ? "Редактировать маппинг атрибутов" : "Добавить маппинг атрибутов"}
                      </DialogTitle>
                      <DialogDescription>
                        Укажите соответствие между атрибутами Ozon и Wildberries
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="ozonAttribute">ID атрибута Ozon</Label>
                          <Input
                            id="ozonAttribute"
                            placeholder="Например: 8229"
                            value={ozonAttributeInput}
                            onChange={(e) => setOzonAttributeInput(e.target.value)}
                          />
                        </div>
                        
                        <div className="grid gap-2">
                          <Label htmlFor="ozonAttributeName">Название атрибута Ozon</Label>
                          <Input
                            id="ozonAttributeName"
                            placeholder="Например: Бренд"
                            value={ozonAttributeNameInput}
                            onChange={(e) => setOzonAttributeNameInput(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="wbAttribute">ID атрибута Wildberries</Label>
                          <Input
                            id="wbAttribute"
                            placeholder="Например: 107"
                            value={wbAttributeInput}
                            onChange={(e) => setWbAttributeInput(e.target.value)}
                          />
                        </div>
                        
                        <div className="grid gap-2">
                          <Label htmlFor="wbAttributeName">Название атрибута Wildberries</Label>
                          <Input
                            id="wbAttributeName"
                            placeholder="Например: Бренд"
                            value={wbAttributeNameInput}
                            onChange={(e) => setWbAttributeNameInput(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="categoryId">ID категории (необязательно)</Label>
                        <Input
                          id="categoryId"
                          placeholder="ID категории для специфичного маппинга"
                          value={categoryIdInput}
                          onChange={(e) => setCategoryIdInput(e.target.value)}
                        />
                        <p className="text-sm text-muted-foreground">
                          Оставьте пустым для общего маппинга атрибутов
                        </p>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={handleAttributeDialogClose}>
                        Отмена
                      </Button>
                      <Button onClick={handleSaveAttributeMapping} disabled={attributeMappingMutation.isPending}>
                        {attributeMappingMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Сохранение...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Сохранить
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}