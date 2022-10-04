/**
 * When generating static files, this bit automatically compiles scss
 *   to css and adds it to the <head> as <link stylesheet> .
 */
import '@/styles/style.scss';

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}
