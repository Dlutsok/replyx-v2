import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ru">
      <Head>
        <link rel="icon" type="image/svg+xml" href="/Favicon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/Favicon.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/Favicon.svg" />
        <link rel="apple-touch-icon" sizes="152x152" href="/Favicon.svg" />
        <link rel="apple-touch-icon" sizes="144x144" href="/Favicon.svg" />
        <link rel="apple-touch-icon" sizes="120x120" href="/Favicon.svg" />
        <link rel="apple-touch-icon" sizes="114x114" href="/Favicon.svg" />
        <link rel="apple-touch-icon" sizes="76x76" href="/Favicon.svg" />
        <link rel="apple-touch-icon" sizes="72x72" href="/Favicon.svg" />
        <link rel="apple-touch-icon" sizes="57x57" href="/Favicon.svg" />

        <meta name="theme-color" content="#6334E5" />

        {/* Safari-specific meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ReplyX" />
        <meta name="apple-touch-fullscreen" content="yes" />
        
        {/* Security headers are configured in next.config.js */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="Referrer-Policy" content="origin-when-cross-origin" />

        {/* SEO: Robots tag handled by next.config.js per page basis */}
        
        {/* Yandex.Metrika counter */}
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              (function(m,e,t,r,i,k,a){
                  m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                  m[i].l=1*new Date();
                  for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
              })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=104132878', 'ym');

              ym(104132878, 'init', {
                webvisor:true, 
                clickmap:true, 
                trackLinks:true,
                accurateTrackBounce:true,
                ecommerce:"dataLayer",
                childIframe:true,
                trackHash:true
              });
            `,
          }}
        />
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/104132878" style={{position:'absolute', left:'-9999px'}} alt="" />
          </div>
        </noscript>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}