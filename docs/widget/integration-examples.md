# 🛠️ Widget Integration Examples - Примеры интеграции

**Практические примеры интеграции ReplyX виджета в различные платформы и фреймворки**

Этот документ содержит готовые к использованию примеры кода для интеграции виджета в популярные технологии.

---

## 🚀 Основные способы интеграции

### 1. Простая HTML интеграция

```html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Мой сайт с ReplyX</title>
</head>
<body>
    <h1>Добро пожаловать на наш сайт!</h1>
    
    <!-- ReplyX Widget -->
    <script>
        // Конфигурация виджета (опционально)
        window.ReplyXConfig = {
            theme: 'blue',
            position: 'bottom-right',
            buttonSize: 80
        };
    </script>
    <script 
        src="https://app.replyx.com/widget.js?assistant_id=456&theme=blue&position=bottom-right"
        async>
    </script>
</body>
</html>
```

### 2. Конфигурация через data-атрибуты

```html
<!-- Контейнер для виджета -->
<div 
    id="replyx-widget"
    data-assistant-id="456"
    data-theme="green"
    data-position="bottom-left" 
    data-button-size="70"
    data-welcome-message="Здравствуйте! Чем могу помочь?"
    data-dev-only="false">
</div>

<!-- Загрузчик виджета -->
<script>
(function() {
    const container = document.getElementById('replyx-widget');
    const config = container.dataset;
    
    const params = new URLSearchParams({
        assistant_id: config.assistantId,
        theme: config.theme || 'blue',
        position: config.position || 'bottom-right',
        buttonSize: config.buttonSize || '80',
        welcomeMessage: config.welcomeMessage || 'Привет! Как дела?'
    });
    
    const script = document.createElement('script');
    script.src = `https://app.replyx.com/widget.js?${params.toString()}`;
    script.async = true;
    document.head.appendChild(script);
})();
</script>
```

---

## ⚛️ React интеграция

### 1. Функциональный компонент с хуками

```tsx
import React, { useEffect, useState } from 'react';

interface ReplyXWidgetProps {
    assistantId: number;
    theme?: 'blue' | 'green' | 'purple' | 'orange';
    siteToken?: string;
    position?: 'bottom-left' | 'bottom-center' | 'bottom-right';
    onMessageSent?: (text: string) => void;
    onMessageReceived?: (text: string) => void;
}

const ReplyXWidget: React.FC<ReplyXWidgetProps> = ({
    assistantId,
    theme = 'blue',
    siteToken,
    position = 'bottom-right',
    onMessageSent,
    onMessageReceived
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    
    useEffect(() => {
        // Проверяем, не загружен ли уже виджет
        if (window.ReplyXWidget) {
            setIsLoaded(true);
            return;
        }
        
        // Конфигурируем виджет
        const params = new URLSearchParams({
            assistant_id: assistantId.toString(),
            theme,
            position
        });
        
        if (siteToken) {
            params.append('token', siteToken);
        }
        
        // Создаем и загружаем скрипт
        const script = document.createElement('script');
        script.src = `https://app.replyx.com/widget.js?${params.toString()}`;
        script.async = true;
        script.onload = () => setIsLoaded(true);
        
        document.head.appendChild(script);
        
        // Слушаем события от виджета
        const handleWidgetMessage = (event: MessageEvent) => {
            if (event.origin !== 'https://app.replyx.com') return;
            
            switch (event.data.type) {
                case 'replyX_message_sent':
                    onMessageSent?.(event.data.text);
                    break;
                case 'replyX_message_received':
                    onMessageReceived?.(event.data.text);
                    break;
            }
        };
        
        window.addEventListener('message', handleWidgetMessage);
        
        // Cleanup
        return () => {
            window.removeEventListener('message', handleWidgetMessage);
            document.head.removeChild(script);
        };
    }, [assistantId, theme, siteToken, position]);
    
    return (
        <div className="replyx-widget-wrapper">
            {!isLoaded && (
                <div className="loading-indicator">
                    Загружается чат поддержки...
                </div>
            )}
        </div>
    );
};

// Использование
const App: React.FC = () => {
    const handleMessageSent = (text: string) => {
        // Аналитика или другая логика
        console.log('Пользователь отправил:', text);
    };
    
    const handleMessageReceived = (text: string) => {
        console.log('Получен ответ:', text);
    };
    
    return (
        <div>
            <h1>Мое React приложение</h1>
            
            <ReplyXWidget
                assistantId={456}
                theme="blue"
                onMessageSent={handleMessageSent}
                onMessageReceived={handleMessageReceived}
            />
        </div>
    );
};

export default App;
```

### 2. React хук для управления виджетом

```tsx
import { useEffect, useState, useCallback } from 'react';

interface UseReplyXWidgetOptions {
    assistantId: number;
    theme?: string;
    siteToken?: string;
    autoLoad?: boolean;
}

interface ReplyXWidgetAPI {
    isLoaded: boolean;
    isMinimized: boolean;
    loadWidget: () => void;
    showWidget: () => void;
    hideWidget: () => void;
    sendAnalyticsEvent: (event: string, data?: any) => void;
}

const useReplyXWidget = ({
    assistantId,
    theme = 'blue',
    siteToken,
    autoLoad = true
}: UseReplyXWidgetOptions): ReplyXWidgetAPI => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isMinimized, setIsMinimized] = useState(true);
    
    const loadWidget = useCallback(() => {
        if (window.ReplyXWidget || isLoaded) return;
        
        const params = new URLSearchParams({
            assistant_id: assistantId.toString(),
            theme
        });
        
        if (siteToken) {
            params.append('token', siteToken);
        }
        
        const script = document.createElement('script');
        script.src = `https://app.replyx.com/widget.js?${params.toString()}`;
        script.async = true;
        script.onload = () => setIsLoaded(true);
        
        document.head.appendChild(script);
    }, [assistantId, theme, siteToken]);
    
    const showWidget = useCallback(() => {
        if (window.ReplyXWidget?.isMinimized) {
            window.ReplyXWidget.expand();
        }
    }, []);
    
    const hideWidget = useCallback(() => {
        if (!window.ReplyXWidget?.isMinimized) {
            window.ReplyXWidget.minimize();
        }
    }, []);
    
    const sendAnalyticsEvent = useCallback((event: string, data?: any) => {
        // Интеграция с вашей системой аналитики
        if (typeof gtag !== 'undefined') {
            gtag('event', event, {
                event_category: 'ReplyX Widget',
                event_label: JSON.stringify(data)
            });
        }
    }, []);
    
    useEffect(() => {
        if (autoLoad) {
            loadWidget();
        }
        
        // Слушаем события виджета
        const handleWidgetEvents = (event: MessageEvent) => {
            if (event.origin !== 'https://app.replyx.com') return;
            
            switch (event.data.type) {
                case 'replyX_minimize':
                    setIsMinimized(true);
                    break;
                case 'replyX_maximize':
                    setIsMinimized(false);
                    break;
                case 'replyX_message_sent':
                    sendAnalyticsEvent('message_sent', {
                        text_length: event.data.text?.length
                    });
                    break;
            }
        };
        
        window.addEventListener('message', handleWidgetEvents);
        return () => window.removeEventListener('message', handleWidgetEvents);
    }, [autoLoad, loadWidget, sendAnalyticsEvent]);
    
    return {
        isLoaded,
        isMinimized,
        loadWidget,
        showWidget,
        hideWidget,
        sendAnalyticsEvent
    };
};

// Использование хука
const MyComponent: React.FC = () => {
    const widget = useReplyXWidget({
        assistantId: 456,
        theme: 'blue',
        autoLoad: false // загрузим по клику
    });
    
    return (
        <div>
            <button onClick={widget.loadWidget} disabled={widget.isLoaded}>
                {widget.isLoaded ? 'Чат загружен' : 'Загрузить чат'}
            </button>
            
            {widget.isLoaded && (
                <div>
                    <button onClick={widget.showWidget}>Показать чат</button>
                    <button onClick={widget.hideWidget}>Скрыть чат</button>
                </div>
            )}
        </div>
    );
};
```

---

## 🔥 Next.js интеграция

### 1. Компонент с Server-Side Rendering

```tsx
// components/ReplyXWidget.tsx
import { useEffect, useState } from 'react';
import Script from 'next/script';

interface Props {
    assistantId: number;
    theme?: string;
    siteToken?: string;
}

const ReplyXWidget: React.FC<Props> = ({
    assistantId,
    theme = 'blue',
    siteToken
}) => {
    const [isClient, setIsClient] = useState(false);
    
    // Убеждаемся, что код выполняется только на клиенте
    useEffect(() => {
        setIsClient(true);
    }, []);
    
    if (!isClient) {
        return null;
    }
    
    const widgetUrl = `https://app.replyx.com/widget.js?assistant_id=${assistantId}&theme=${theme}${siteToken ? `&token=${siteToken}` : ''}`;
    
    return (
        <Script
            src={widgetUrl}
            strategy="lazyOnload"
            onLoad={() => {
                console.log('ReplyX Widget loaded');
            }}
        />
    );
};

export default ReplyXWidget;
```

### 2. Провайдер для всего приложения

```tsx
// pages/_app.tsx
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ReplyXWidget from '../components/ReplyXWidget';

export default function App({ Component, pageProps }: AppProps) {
    const router = useRouter();
    const [user, setUser] = useState(null);
    
    // Загружаем виджет только для авторизованных пользователей
    const shouldShowWidget = user?.isLoggedIn && !router.pathname.includes('/admin');
    
    return (
        <>
            <Component {...pageProps} />
            
            {shouldShowWidget && (
                <ReplyXWidget
                    assistantId={456}
                    theme="blue"
                    siteToken={user.siteToken}
                />
            )}
        </>
    );
}
```

### 3. API Route для получения токена

```typescript
// pages/api/widget/token.ts
import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // Проверяем авторизацию пользователя
        const userToken = req.headers.authorization?.replace('Bearer ', '');
        if (!userToken) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Декодируем пользователя
        const user = jwt.verify(userToken, process.env.JWT_SECRET);
        
        // Создаем site token
        const siteToken = jwt.sign(
            {
                user_id: user.id,
                assistant_id: req.body.assistant_id,
                type: 'site'
            },
            process.env.SITE_SECRET
        );
        
        res.json({ site_token: siteToken });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate token' });
    }
}
```

---

## 🎨 Vue.js интеграция

### 1. Vue 3 Composition API

```vue
<!-- ReplyXWidget.vue -->
<template>
  <div class="replyx-widget-container">
    <div v-if="loading" class="loading">
      Загрузка чата...
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

interface Props {
  assistantId: number;
  theme?: 'blue' | 'green' | 'purple' | 'orange';
  siteToken?: string;
  autoLoad?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'blue',
  autoLoad: true
});

const emit = defineEmits<{
  messageSent: [text: string];
  messageReceived: [text: string];
  widgetLoaded: [];
}>();

const loading = ref(true);
const isLoaded = ref(false);

let scriptElement: HTMLScriptElement | null = null;

const loadWidget = () => {
  if (isLoaded.value || scriptElement) return;
  
  const params = new URLSearchParams({
    assistant_id: props.assistantId.toString(),
    theme: props.theme
  });
  
  if (props.siteToken) {
    params.append('token', props.siteToken);
  }
  
  scriptElement = document.createElement('script');
  scriptElement.src = `https://app.replyx.com/widget.js?${params.toString()}`;
  scriptElement.async = true;
  
  scriptElement.onload = () => {
    loading.value = false;
    isLoaded.value = true;
    emit('widgetLoaded');
  };
  
  document.head.appendChild(scriptElement);
};

const handleMessage = (event: MessageEvent) => {
  if (event.origin !== 'https://app.replyx.com') return;
  
  switch (event.data.type) {
    case 'replyX_message_sent':
      emit('messageSent', event.data.text);
      break;
    case 'replyX_message_received':
      emit('messageReceived', event.data.text);
      break;
  }
};

onMounted(() => {
  if (props.autoLoad) {
    loadWidget();
  }
  
  window.addEventListener('message', handleMessage);
});

onUnmounted(() => {
  window.removeEventListener('message', handleMessage);
  
  if (scriptElement) {
    document.head.removeChild(scriptElement);
  }
});

// Реактивная перезагрузка при изменении assistantId
watch(() => props.assistantId, () => {
  if (scriptElement) {
    document.head.removeChild(scriptElement);
    scriptElement = null;
    isLoaded.value = false;
    loading.value = true;
    loadWidget();
  }
});

// Экспортируем метод для ручной загрузки
defineExpose({
  loadWidget
});
</script>

<style scoped>
.replyx-widget-container {
  position: relative;
}

.loading {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #f0f0f0;
  padding: 10px 15px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 9998;
}
</style>
```

### 2. Использование в приложении

```vue
<!-- App.vue -->
<template>
  <div id="app">
    <header>
      <h1>Мое Vue приложение</h1>
    </header>
    
    <main>
      <router-view />
    </main>
    
    <!-- Показываем виджет только авторизованным -->
    <ReplyXWidget
      v-if="user?.isAuthenticated"
      :assistant-id="456"
      theme="green"
      :site-token="user.siteToken"
      @message-sent="onMessageSent"
      @message-received="onMessageReceived"
      @widget-loaded="onWidgetLoaded"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import ReplyXWidget from './components/ReplyXWidget.vue';
import { useAuthStore } from './stores/auth';

const authStore = useAuthStore();
const user = computed(() => authStore.user);

const onMessageSent = (text: string) => {
  console.log('Сообщение отправлено:', text);
  
  // Аналитика
  if (window.gtag) {
    window.gtag('event', 'chat_message_sent', {
      event_category: 'engagement',
      event_label: 'replyx_widget'
    });
  }
};

const onMessageReceived = (text: string) => {
  console.log('Ответ получен:', text);
};

const onWidgetLoaded = () => {
  console.log('Виджет загружен');
};
</script>
```

---

## 📱 Мобильная интеграция

### 1. React Native WebView

```tsx
import React from 'react';
import { WebView } from 'react-native-webview';
import { SafeAreaView, StyleSheet } from 'react-native';

interface Props {
  assistantId: number;
  theme?: string;
}

const ReplyXWebView: React.FC<Props> = ({ assistantId, theme = 'blue' }) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; }
        #chat { width: 100%; height: 100vh; }
      </style>
    </head>
    <body>
      <div id="chat"></div>
      <script>
        // Конфигурация для мобильного
        window.ReplyXConfig = {
          theme: '${theme}',
          type: 'fullscreen', 
          position: 'bottom-center'
        };
      </script>
      <script src="https://app.replyx.com/widget.js?assistant_id=${assistantId}&theme=${theme}&type=fullscreen"></script>
    </body>
    </html>
  `;
  
  return (
    <SafeAreaView style={styles.container}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowsInlineMediaPlayback={true}
        onMessage={(event) => {
          const data = JSON.parse(event.nativeEvent.data);
          console.log('WebView message:', data);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

export default ReplyXWebView;
```

### 2. Flutter WebView

```dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class ReplyXWidget extends StatefulWidget {
  final int assistantId;
  final String theme;
  
  const ReplyXWidget({
    Key? key,
    required this.assistantId,
    this.theme = 'blue',
  }) : super(key: key);
  
  @override
  State<ReplyXWidget> createState() => _ReplyXWidgetState();
}

class _ReplyXWidgetState extends State<ReplyXWidget> {
  late final WebViewController controller;
  
  @override
  void initState() {
    super.initState();
    
    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'ReplyXFlutter',
        onMessageReceived: (JavaScriptMessage message) {
          // Обработка сообщений от виджета
          print('ReplyX message: ${message.message}');
        },
      )
      ..loadHtmlString(_buildHtmlContent());
  }
  
  String _buildHtmlContent() {
    return '''
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
          #chat { width: 100%; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="chat"></div>
        <script>
          window.ReplyXConfig = {
            theme: '${widget.theme}',
            type: 'fullscreen'
          };
          
          // Мост для Flutter
          window.addEventListener('message', (event) => {
            if (event.data.type && event.data.type.startsWith('replyX_')) {
              ReplyXFlutter.postMessage(JSON.stringify(event.data));
            }
          });
        </script>
        <script src="https://app.replyx.com/widget.js?assistant_id=${widget.assistantId}&theme=${widget.theme}&type=fullscreen"></script>
      </body>
      </html>
    ''';
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Чат поддержки')),
      body: WebViewWidget(controller: controller),
    );
  }
}
```

---

## 🛒 E-commerce интеграции

### 1. Shopify приложение

```javascript
// assets/replyx-widget.js
(function() {
  'use strict';
  
  // Получаем настройки из Shopify Admin
  const settings = window.ReplyXShopifySettings || {};
  const assistantId = settings.assistant_id || '456';
  const theme = settings.theme || 'blue';
  const showOnPages = settings.show_on_pages || ['product', 'cart', 'collection'];
  
  // Определяем тип страницы Shopify
  const getPageType = () => {
    const body = document.body;
    if (body.classList.contains('template-product')) return 'product';
    if (body.classList.contains('template-cart')) return 'cart';
    if (body.classList.contains('template-collection')) return 'collection';
    if (body.classList.contains('template-index')) return 'home';
    return 'other';
  };
  
  const pageType = getPageType();
  
  // Показываем виджет только на нужных страницах
  if (showOnPages.includes(pageType)) {
    // Дожидаемся полной загрузки страницы
    const initWidget = () => {
      const script = document.createElement('script');
      script.src = `https://app.replyx.com/widget.js?assistant_id=${assistantId}&theme=${theme}&position=bottom-right`;
      script.async = true;
      document.head.appendChild(script);
      
      // Отправляем контекст товара в чат
      if (pageType === 'product' && window.ShopifyAnalytics?.meta?.product) {
        const product = window.ShopifyAnalytics.meta.product;
        
        script.onload = () => {
          // Передаем контекст товара в виджет
          setTimeout(() => {
            if (window.ReplyXWidget) {
              window.postMessage({
                type: 'product_context',
                data: {
                  id: product.id,
                  title: product.title,
                  price: product.price,
                  vendor: product.vendor
                }
              }, '*');
            }
          }, 1000);
        };
      }
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initWidget);
    } else {
      initWidget();
    }
  }
})();
```

### 2. WooCommerce плагин

```php
<?php
/*
Plugin Name: ReplyX Widget for WooCommerce  
Description: Интеграция чат-бота ReplyX с WooCommerce
Version: 1.0
*/

class ReplyX_WooCommerce_Widget {
    
    public function __construct() {
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts']);
        add_action('wp_footer', [$this, 'render_widget']);
        add_action('admin_menu', [$this, 'admin_menu']);
    }
    
    public function enqueue_scripts() {
        // Загружаем только на нужных страницах
        if (!$this->should_show_widget()) {
            return;
        }
        
        wp_enqueue_script(
            'replyx-widget',
            $this->get_widget_url(),
            [],
            '1.0.0',
            true
        );
        
        // Передаем данные в JavaScript
        wp_localize_script('replyx-widget', 'replyxWoo', [
            'product_id' => get_the_ID(),
            'is_cart' => is_cart(),
            'is_checkout' => is_checkout(),
            'cart_total' => WC()->cart ? WC()->cart->get_total() : 0,
            'user_id' => get_current_user_id(),
        ]);
    }
    
    private function should_show_widget() {
        $settings = get_option('replyx_settings', []);
        $show_on_pages = $settings['show_on_pages'] ?? ['shop', 'product', 'cart'];
        
        if (is_shop() && in_array('shop', $show_on_pages)) return true;
        if (is_product() && in_array('product', $show_on_pages)) return true;
        if (is_cart() && in_array('cart', $show_on_pages)) return true;
        if (is_checkout() && in_array('checkout', $show_on_pages)) return true;
        
        return false;
    }
    
    private function get_widget_url() {
        $settings = get_option('replyx_settings', []);
        $assistant_id = $settings['assistant_id'] ?? '456';
        $theme = $settings['theme'] ?? 'blue';
        
        $params = http_build_query([
            'assistant_id' => $assistant_id,
            'theme' => $theme,
            'position' => 'bottom-right'
        ]);
        
        return "https://app.replyx.com/widget.js?{$params}";
    }
    
    public function render_widget() {
        if (!$this->should_show_widget()) {
            return;
        }
        
        ?>
        <script>
        (function() {
            // Дожидаемся загрузки виджета
            const checkWidget = setInterval(() => {
                if (window.ReplyXWidget) {
                    clearInterval(checkWidget);
                    
                    // Отправляем контекст WooCommerce
                    const context = {
                        platform: 'woocommerce',
                        page_type: '<?php echo $this->get_page_type(); ?>',
                        ...replyxWoo
                    };
                    
                    // Слушаем события виджета
                    window.addEventListener('message', (event) => {
                        if (event.origin !== 'https://app.replyx.com') return;
                        
                        if (event.data.type === 'replyX_message_sent') {
                            // Отправляем в Google Analytics
                            if (typeof gtag !== 'undefined') {
                                gtag('event', 'chat_interaction', {
                                    event_category: 'ReplyX',
                                    event_label: 'message_sent'
                                });
                            }
                        }
                    });
                }
            }, 100);
        })();
        </script>
        <?php
    }
    
    private function get_page_type() {
        if (is_shop()) return 'shop';
        if (is_product()) return 'product';
        if (is_cart()) return 'cart';
        if (is_checkout()) return 'checkout';
        return 'other';
    }
}

new ReplyX_WooCommerce_Widget();
```

---

## 🌐 CMS интеграции

### 1. WordPress плагин

```php
<?php
/*
Plugin Name: ReplyX Chat Widget
Description: Добавляет чат-бот ReplyX на ваш сайт
Version: 1.2.0
*/

class ReplyX_WordPress_Plugin {
    
    public function __construct() {
        add_action('init', [$this, 'init']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_widget']);
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_shortcode('replyx_widget', [$this, 'shortcode']);
    }
    
    public function init() {
        // Регистрируем настройки
        register_setting('replyx_settings', 'replyx_assistant_id');
        register_setting('replyx_settings', 'replyx_theme');
        register_setting('replyx_settings', 'replyx_position');
        register_setting('replyx_settings', 'replyx_show_on_pages');
    }
    
    public function enqueue_widget() {
        $assistant_id = get_option('replyx_assistant_id');
        if (!$assistant_id) return;
        
        $theme = get_option('replyx_theme', 'blue');
        $position = get_option('replyx_position', 'bottom-right');
        $show_on_pages = get_option('replyx_show_on_pages', ['home', 'post', 'page']);
        
        // Проверяем, нужно ли показывать виджет
        if (!$this->should_show_widget($show_on_pages)) {
            return;
        }
        
        $widget_url = add_query_arg([
            'assistant_id' => $assistant_id,
            'theme' => $theme,
            'position' => $position
        ], 'https://app.replyx.com/widget.js');
        
        wp_enqueue_script(
            'replyx-widget',
            $widget_url,
            [],
            '1.2.0',
            true
        );
        
        // Добавляем контекстную информацию
        wp_add_inline_script('replyx-widget', $this->get_context_script());
    }
    
    private function should_show_widget($show_on_pages) {
        if (is_home() && in_array('home', $show_on_pages)) return true;
        if (is_single() && in_array('post', $show_on_pages)) return true;
        if (is_page() && in_array('page', $show_on_pages)) return true;
        if (is_shop() && in_array('shop', $show_on_pages)) return true;
        
        return false;
    }
    
    private function get_context_script() {
        global $post;
        
        $context = [
            'platform' => 'wordpress',
            'page_type' => $this->get_current_page_type(),
            'post_id' => $post ? $post->ID : null,
            'post_title' => $post ? $post->post_title : null,
            'user_id' => get_current_user_id(),
            'is_logged_in' => is_user_logged_in()
        ];
        
        return "
        window.ReplyXWordPressContext = " . json_encode($context) . ";
        
        // Слушаем события виджета
        window.addEventListener('message', function(event) {
            if (event.origin !== 'https://app.replyx.com') return;
            
            // Интеграция с WordPress аналитикой
            if (event.data.type === 'replyX_message_sent' && typeof _gaq !== 'undefined') {
                _gaq.push(['_trackEvent', 'ReplyX', 'Message Sent', event.data.text.substring(0, 50)]);
            }
        });
        ";
    }
    
    public function shortcode($atts) {
        $atts = shortcode_atts([
            'assistant_id' => get_option('replyx_assistant_id'),
            'theme' => 'blue',
            'type' => 'embedded'
        ], $atts);
        
        if (!$atts['assistant_id']) {
            return '<p>ReplyX: Не указан ID ассистента</p>';
        }
        
        $widget_url = add_query_arg([
            'assistant_id' => $atts['assistant_id'],
            'theme' => $atts['theme'],
            'type' => $atts['type']
        ], 'https://app.replyx.com/widget.js');
        
        return "
        <div id='replyx-shortcode-{$atts['assistant_id']}' style='height: 600px; border-radius: 12px; overflow: hidden;'></div>
        <script>
        (function() {
            const script = document.createElement('script');
            script.src = '{$widget_url}';
            script.async = true;
            document.head.appendChild(script);
        })();
        </script>
        ";
    }
}

new ReplyX_WordPress_Plugin();
```

### 2. Drupal модуль

```php
<?php
// modules/custom/replyx_widget/replyx_widget.module

use Drupal\Core\Form\FormStateInterface;

/**
 * Implements hook_page_attachments().
 */
function replyx_widget_page_attachments(array &$attachments) {
  $config = \Drupal::config('replyx_widget.settings');
  $assistant_id = $config->get('assistant_id');
  
  if (!$assistant_id) {
    return;
  }
  
  $theme = $config->get('theme') ?: 'blue';
  $position = $config->get('position') ?: 'bottom-right';
  $show_on_paths = $config->get('show_on_paths') ?: [];
  
  // Проверяем текущий путь
  $current_path = \Drupal::service('path.current')->getPath();
  $path_matcher = \Drupal::service('path.matcher');
  
  $show_widget = FALSE;
  foreach ($show_on_paths as $pattern) {
    if ($path_matcher->matchPath($current_path, $pattern)) {
      $show_widget = TRUE;
      break;
    }
  }
  
  if (!$show_widget) {
    return;
  }
  
  // Добавляем JavaScript
  $attachments['#attached']['html_head'][] = [
    [
      '#tag' => 'script',
      '#attributes' => [
        'src' => "https://app.replyx.com/widget.js?assistant_id={$assistant_id}&theme={$theme}&position={$position}",
        'async' => TRUE,
      ],
    ],
    'replyx_widget_script'
  ];
  
  // Добавляем контекстную информацию
  $context = [
    'platform' => 'drupal',
    'node_id' => NULL,
    'content_type' => NULL,
    'user_id' => \Drupal::currentUser()->id(),
  ];
  
  // Если это страница ноды
  $route_match = \Drupal::routeMatch();
  if ($route_match->getRouteName() == 'entity.node.canonical') {
    $node = $route_match->getParameter('node');
    if ($node) {
      $context['node_id'] = $node->id();
      $context['content_type'] = $node->getType();
    }
  }
  
  $attachments['#attached']['drupalSettings']['replyxWidget']['context'] = $context;
}
```

---

## 📈 Аналитика и мониторинг

### 1. Google Analytics 4 интеграция

```javascript
// ga4-replyx-integration.js
(function() {
    'use strict';
    
    // Ожидаем загрузки gtag
    const waitForGtag = (callback) => {
        if (typeof gtag !== 'undefined') {
            callback();
        } else {
            setTimeout(() => waitForGtag(callback), 100);
        }
    };
    
    // Слушаем события виджета
    window.addEventListener('message', (event) => {
        if (event.origin !== 'https://app.replyx.com') return;
        
        waitForGtag(() => {
            switch (event.data.type) {
                case 'replyX_message_sent':
                    gtag('event', 'chat_message_sent', {
                        event_category: 'ReplyX Widget',
                        event_label: 'User Message',
                        value: 1,
                        custom_parameters: {
                            message_length: event.data.text?.length || 0,
                            timestamp: event.data.timestamp
                        }
                    });
                    break;
                    
                case 'replyX_message_received':
                    gtag('event', 'chat_message_received', {
                        event_category: 'ReplyX Widget',
                        event_label: 'AI Response',
                        value: 1,
                        custom_parameters: {
                            response_length: event.data.text?.length || 0,
                            timestamp: event.data.timestamp
                        }
                    });
                    break;
                    
                case 'replyX_operator_message_received':
                    gtag('event', 'chat_operator_message', {
                        event_category: 'ReplyX Widget',
                        event_label: 'Operator Response',
                        value: 2, // Больший вес для операторских сообщений
                        custom_parameters: {
                            timestamp: event.data.timestamp
                        }
                    });
                    break;
                    
                case 'replyX_websocket_connected':
                    gtag('event', 'chat_connected', {
                        event_category: 'ReplyX Widget',
                        event_label: 'WebSocket Connected'
                    });
                    break;
                    
                case 'replyX_error':
                    gtag('event', 'chat_error', {
                        event_category: 'ReplyX Widget',
                        event_label: 'Widget Error',
                        custom_parameters: {
                            error_message: event.data.message
                        }
                    });
                    break;
            }
        });
    });
    
    // Отслеживаем время сессии
    let sessionStart = Date.now();
    let messageCount = 0;
    
    window.addEventListener('beforeunload', () => {
        const sessionDuration = Date.now() - sessionStart;
        
        if (messageCount > 0) {
            gtag('event', 'chat_session_end', {
                event_category: 'ReplyX Widget',
                event_label: 'Session Completed',
                value: Math.round(sessionDuration / 1000), // в секундах
                custom_parameters: {
                    message_count: messageCount,
                    session_duration: sessionDuration
                }
            });
        }
    });
})();
```

### 2. Mixpanel интеграция

```javascript
// mixpanel-replyx-integration.js
(function() {
    'use strict';
    
    const waitForMixpanel = (callback) => {
        if (typeof mixpanel !== 'undefined') {
            callback();
        } else {
            setTimeout(() => waitForMixpanel(callback), 100);
        }
    };
    
    let sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    let conversationId = null;
    
    window.addEventListener('message', (event) => {
        if (event.origin !== 'https://app.replyx.com') return;
        
        waitForMixpanel(() => {
            const baseProperties = {
                widget_session_id: sessionId,
                conversation_id: conversationId,
                timestamp: new Date().toISOString(),
                page_url: window.location.href,
                page_title: document.title
            };
            
            switch (event.data.type) {
                case 'replyX_message_sent':
                    if (!conversationId) {
                        conversationId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    }
                    
                    mixpanel.track('Widget Message Sent', {
                        ...baseProperties,
                        message_length: event.data.text?.length || 0,
                        message_preview: event.data.text?.substring(0, 50) || ''
                    });
                    break;
                    
                case 'replyX_message_received':
                    mixpanel.track('Widget Message Received', {
                        ...baseProperties,
                        response_length: event.data.text?.length || 0,
                        response_type: 'ai'
                    });
                    break;
                    
                case 'replyX_operator_message_received':
                    mixpanel.track('Widget Operator Message', {
                        ...baseProperties,
                        response_type: 'operator'
                    });
                    break;
            }
            
            // Обновляем профиль пользователя
            mixpanel.people.set({
                'Last Widget Interaction': new Date(),
                'Widget Sessions Count': mixpanel.people.increment('Widget Sessions Count', 1)
            });
        });
    });
})();
```

---

## 🔧 Кастомные интеграции

### 1. Кастомный лоадер с A/B тестированием

```javascript
// custom-replyx-loader.js
class ReplyXLoader {
    constructor(options = {}) {
        this.options = {
            assistantId: options.assistantId || 456,
            theme: options.theme || 'blue',
            abTestEnabled: options.abTestEnabled || false,
            loadDelay: options.loadDelay || 0,
            targetSelector: options.targetSelector || null,
            ...options
        };
        
        this.isLoaded = false;
        this.abVariant = null;
    }
    
    async init() {
        try {
            // A/B тестирование
            if (this.options.abTestEnabled) {
                this.abVariant = await this.runABTest();
                console.log('A/B Test variant:', this.abVariant);
            }
            
            // Задержка загрузки
            if (this.options.loadDelay > 0) {
                await this.delay(this.options.loadDelay);
            }
            
            // Загрузка виджета
            await this.loadWidget();
            
            // Аналитика
            this.trackWidgetLoaded();
            
        } catch (error) {
            console.error('ReplyX Loader error:', error);
            this.trackError(error);
        }
    }
    
    async runABTest() {
        // Простое A/B тестирование на основе user ID или случайного числа
        const userId = this.getUserId();
        const variant = userId ? (userId % 2 === 0 ? 'A' : 'B') : (Math.random() > 0.5 ? 'A' : 'B');
        
        // Сохраняем вариант
        localStorage.setItem('replyx_ab_variant', variant);
        
        return variant;
    }
    
    async loadWidget() {
        return new Promise((resolve, reject) => {
            // Применяем A/B тест настройки
            const config = this.applyABTestConfig();
            
            const params = new URLSearchParams(config);
            const script = document.createElement('script');
            script.src = `https://app.replyx.com/widget.js?${params.toString()}`;
            script.async = true;
            
            script.onload = () => {
                this.isLoaded = true;
                resolve();
            };
            
            script.onerror = () => {
                reject(new Error('Failed to load widget script'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    applyABTestConfig() {
        let config = {
            assistant_id: this.options.assistantId,
            theme: this.options.theme
        };
        
        // Применяем A/B тест варианты
        if (this.abVariant === 'A') {
            config.position = 'bottom-right';
            config.buttonSize = '80';
            config.theme = 'blue';
        } else if (this.abVariant === 'B') {
            config.position = 'bottom-left';
            config.buttonSize = '70';
            config.theme = 'green';
        }
        
        return config;
    }
    
    trackWidgetLoaded() {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'replyx_widget_loaded', {
                event_category: 'ReplyX',
                event_label: this.abVariant || 'default',
                custom_parameters: {
                    theme: this.options.theme,
                    assistant_id: this.options.assistantId
                }
            });
        }
    }
    
    trackError(error) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'replyx_widget_error', {
                event_category: 'ReplyX',
                event_label: error.message
            });
        }
    }
    
    getUserId() {
        // Попытка получить user ID из различных источников
        if (window.dataLayer) {
            const userIdEvent = window.dataLayer.find(item => item.user_id);
            if (userIdEvent) return userIdEvent.user_id;
        }
        
        // Или из cookies
        const userCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('user_id='));
        
        if (userCookie) {
            return parseInt(userCookie.split('=')[1]);
        }
        
        return null;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Публичные методы
    show() {
        if (window.ReplyXWidget && window.ReplyXWidget.isMinimized) {
            window.ReplyXWidget.expand();
        }
    }
    
    hide() {
        if (window.ReplyXWidget && !window.ReplyXWidget.isMinimized) {
            window.ReplyXWidget.minimize();
        }
    }
    
    isWidgetLoaded() {
        return this.isLoaded && !!window.ReplyXWidget;
    }
}

// Использование
const replyxLoader = new ReplyXLoader({
    assistantId: 456,
    theme: 'blue',
    abTestEnabled: true,
    loadDelay: 2000 // загружаем через 2 секунды
});

// Инициализация после загрузки страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => replyxLoader.init());
} else {
    replyxLoader.init();
}

// Экспортируем глобально
window.ReplyXLoader = replyxLoader;
```

### 2. Интеграция с системой CRM

```javascript
// crm-replyx-integration.js
class ReplyXCRMIntegration {
    constructor(crmConfig) {
        this.crmConfig = crmConfig;
        this.customerData = null;
        this.conversationId = null;
    }
    
    async init() {
        // Получаем данные клиента из CRM
        this.customerData = await this.fetchCustomerData();
        
        // Инициализируем виджет с контекстом
        this.initWidgetWithContext();
        
        // Слушаем события виджета
        this.setupEventListeners();
    }
    
    async fetchCustomerData() {
        const userId = this.getCurrentUserId();
        if (!userId) return null;
        
        try {
            const response = await fetch(`${this.crmConfig.apiUrl}/customers/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${this.crmConfig.apiToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Failed to fetch customer data:', error);
        }
        
        return null;
    }
    
    initWidgetWithContext() {
        // Загружаем виджет с дополнительными параметрами
        const script = document.createElement('script');
        
        const params = new URLSearchParams({
            assistant_id: this.crmConfig.assistantId,
            theme: this.crmConfig.theme || 'blue',
            customer_id: this.customerData?.id || 'anonymous'
        });
        
        script.src = `https://app.replyx.com/widget.js?${params.toString()}`;
        script.async = true;
        
        script.onload = () => {
            this.sendCustomerContext();
        };
        
        document.head.appendChild(script);
    }
    
    setupEventListeners() {
        window.addEventListener('message', (event) => {
            if (event.origin !== 'https://app.replyx.com') return;
            
            switch (event.data.type) {
                case 'replyX_message_sent':
                    this.logInteractionToCRM('message_sent', {
                        text: event.data.text,
                        timestamp: event.data.timestamp
                    });
                    break;
                    
                case 'replyX_message_received':
                    this.logInteractionToCRM('message_received', {
                        text: event.data.text,
                        timestamp: event.data.timestamp,
                        sender_type: 'ai'
                    });
                    break;
                    
                case 'replyX_operator_message_received':
                    this.logInteractionToCRM('message_received', {
                        text: event.data.text,
                        timestamp: event.data.timestamp,
                        sender_type: 'operator'
                    });
                    break;
            }
        });
    }
    
    sendCustomerContext() {
        if (!this.customerData) return;
        
        // Отправляем контекст клиента в виджет
        setTimeout(() => {
            window.postMessage({
                type: 'customer_context',
                data: {
                    customer_id: this.customerData.id,
                    name: this.customerData.name,
                    email: this.customerData.email,
                    subscription_tier: this.customerData.subscription_tier,
                    last_purchase: this.customerData.last_purchase,
                    total_spent: this.customerData.total_spent,
                    support_priority: this.customerData.support_priority
                }
            }, '*');
        }, 1000);
    }
    
    async logInteractionToCRM(type, data) {
        if (!this.customerData) return;
        
        const interactionData = {
            customer_id: this.customerData.id,
            interaction_type: type,
            channel: 'chat_widget',
            conversation_id: this.conversationId,
            data: data,
            timestamp: new Date().toISOString()
        };
        
        try {
            await fetch(`${this.crmConfig.apiUrl}/interactions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.crmConfig.apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(interactionData)
            });
        } catch (error) {
            console.error('Failed to log interaction to CRM:', error);
        }
    }
    
    getCurrentUserId() {
        // Различные способы получения user ID
        return window.currentUser?.id || 
               localStorage.getItem('user_id') ||
               this.getCookieValue('user_id') ||
               null;
    }
    
    getCookieValue(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }
}

// Инициализация с конфигурацией CRM
const crmIntegration = new ReplyXCRMIntegration({
    apiUrl: 'https://api.yourcrm.com',
    apiToken: 'your_crm_api_token',
    assistantId: 456,
    theme: 'blue'
});

// Запуск после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    crmIntegration.init();
});
```

---

## 📋 Заключение

Этот документ содержит практические примеры интеграции ReplyX виджета в различные платформы и технологии. Каждый пример можно адаптировать под ваши конкретные нужды.

### Ключевые принципы интеграции:

1. **Асинхронная загрузка** — всегда загружайте виджет асинхронно
2. **Event-driven архитектура** — используйте postMessage для взаимодействия
3. **Контекстные данные** — передавайте релевантную информацию в виджет
4. **Аналитика** — отслеживайте взаимодействия для оптимизации
5. **Graceful degradation** — предусмотрите fallback варианты

### Поддержка:

- 📚 [Основная документация](README.md)
- 🏗️ [Архитектура виджета](architecture.md)  
- 🔧 [API Reference](api-reference.md)
- 💬 Чат поддержки на сайте

---

**📅 Последнее обновление:** 2025-01-23  
**🔄 Версия примеров:** 1.2.0  
**✅ Протестировано на:** React 18, Vue 3, Next.js 14, WordPress 6.4