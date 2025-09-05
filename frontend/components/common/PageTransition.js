import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

/**
 * Компонент для плавных переходов между страницами
 */
const PageTransition = ({ children }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStart = (url) => {
      // Показываем loading только если переходим на другую страницу
      if (url !== router.asPath) {
        setLoading(true);
      }
    };

    const handleComplete = () => {
      setLoading(false);
    };

    const handleError = () => {
      setLoading(false);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleError);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleError);
    };
  }, [router]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Переход на страницу...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition-content rounded-2xl">
      {children}
    </div>
  );
};

/**
 * HOC для добавления анимации fade-in к страницам
 */
export const withPageTransition = (Component) => {
  return function WrappedComponent(props) {
    return (
      <PageTransition>
        <Component {...props} />
      </PageTransition>
    );
  };
};

/**
 * Компонент анимированной карточки
 */
export const AnimatedCard = ({ children, delay = 0, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className={`transition-all duration-500 ${
        isVisible 
          ? 'opacity-100 transform translate-y-0' 
          : 'opacity-0 transform translate-y-4'
      } ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * Компонент плавного появления элементов при скролле
 */
export const ScrollAnimatedElement = ({ 
  children, 
  threshold = 0.1, 
  className = '',
  animation = 'fade-up' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [element, setElement] = useState(null);

  useEffect(() => {
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element); // Анимируем только один раз
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [element, threshold]);

  const animationClasses = {
    'fade-up': isVisible 
      ? 'opacity-100 transform translate-y-0' 
      : 'opacity-0 transform translate-y-8',
    'fade-in': isVisible 
      ? 'opacity-100' 
      : 'opacity-0',
    'slide-left': isVisible 
      ? 'opacity-100 transform translate-x-0' 
      : 'opacity-0 transform translate-x-8',
    'scale': isVisible 
      ? 'opacity-100 transform scale-100' 
      : 'opacity-0 transform scale-95'
  };

  return (
    <div 
      ref={setElement}
      className={`transition-all duration-700 ease-out ${animationClasses[animation]} ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * Кастомный хук для анимаций
 */
export const usePageAnimation = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Небольшая задержка для плавности
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  return {
    isLoaded,
    pageClasses: isLoaded 
      ? 'opacity-100 transform translate-y-0' 
      : 'opacity-0 transform translate-y-4',
    containerClasses: 'transition-all duration-500 ease-out'
  };
};

export default PageTransition;