import { useEffect } from 'react';
import Head from 'next/head';
import { useTheme } from '../../hooks/useTheme';
import styles from '../../styles/layout/PublicLayout.module.css';

export default function PublicLayout({ children, title = 'ReplyX' }) {
    const { theme, toggleTheme, isMobile } = useTheme();

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="description" content="ReplyX — Помогаем человечеству шагнуть в будущее." />
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.logo}>
                            <h1>ReplyX</h1>
                        </div>
                        {/* Кнопка переключения темы только для десктопных устройств */}
                        {!isMobile && (
                            <button
                                className={styles.themeToggle}
                                onClick={toggleTheme}
                                aria-label="Toggle theme"
                            >
                                {theme === 'light' ? '🌙' : '☀️'}
                            </button>
                        )}
                    </div>
                </header>

                <main className={styles.main}>
                    {children}
                </main>

                <footer className={styles.footer}>
                    <p>&copy; 2025 ReplyX. Все права защищены.</p>
                </footer>
            </div>
        </>
    );
}