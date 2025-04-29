import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  Card, 
  CardContent,
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

const AuthPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, register, login, isLoading } = useAuth();

  // Перенаправление, если пользователь уже авторизован
  useEffect(() => {
    if (user) {
      setLocation('/');
    }
  }, [user, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, заполните все поля',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsSubmittingLogin(true);
      await login({ username, password });
      setLocation('/');
    } catch (error) {
      // Обработка ошибок происходит в хуке useAuth
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, заполните все поля',
        variant: 'destructive',
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        title: 'Слишком короткий пароль',
        description: 'Пароль должен содержать не менее 6 символов',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsSubmittingRegister(true);
      await register({ username, password });
      setLocation('/');
    } catch (error) {
      // Обработка ошибок происходит в хуке useAuth
    } finally {
      setIsSubmittingRegister(false);
    }
  };

  // Отображаем индикатор загрузки, если проверяем статус авторизации
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Форма авторизации */}
      <div className="flex items-center justify-center w-full lg:w-1/2 p-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Ozon-Wildberries Migration</h1>
            <p className="text-gray-600 mt-2">Сервис миграции товаров</p>
          </div>
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Вход в систему</CardTitle>
                  <CardDescription>
                    Введите имя пользователя и пароль для входа в систему.
                  </CardDescription>
                </CardHeader>
                
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="username">
                        Имя пользователя
                      </label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="Введите имя пользователя"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="password">
                        Пароль
                      </label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Введите пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isSubmittingLogin}
                    >
                      {isSubmittingLogin ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Вход...
                        </>
                      ) : 'Войти'}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Регистрация</CardTitle>
                  <CardDescription>
                    Создайте новую учетную запись для начала работы.
                  </CardDescription>
                </CardHeader>
                
                <form onSubmit={handleRegister}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="reg-username">
                        Имя пользователя
                      </label>
                      <Input
                        id="reg-username"
                        type="text"
                        placeholder="Придумайте имя пользователя"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="reg-password">
                        Пароль
                      </label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="Придумайте пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <p className="text-xs text-gray-500">
                        Пароль должен содержать не менее 6 символов
                      </p>
                    </div>
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isSubmittingRegister}
                    >
                      {isSubmittingRegister ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Регистрация...
                        </>
                      ) : 'Зарегистрироваться'}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Информационная секция */}
      <div className="hidden lg:block lg:w-1/2 bg-gray-100">
        <div className="h-full flex flex-col items-center justify-center p-8">
          <div className="max-w-lg">
            <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Оптимизируйте миграцию товаров
            </h2>
            
            <p className="text-lg mb-8 text-gray-700">
              Наш сервис позволяет быстро и безопасно переносить товары с Ozon на Wildberries
              с автоматическим сопоставлением категорий и атрибутов.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-white">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Простое подключение</h3>
                  <p className="text-gray-600">
                    Подключите свои API-ключи Ozon и Wildberries для начала работы.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-white">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Автоматическое сопоставление</h3>
                  <p className="text-gray-600">
                    Система автоматически сопоставляет категории и атрибуты товаров.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-white">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Быстрая миграция</h3>
                  <p className="text-gray-600">
                    Перенос товаров происходит быстро и с минимальным вмешательством.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;