import Head from 'next/head'
import { Footer } from '@/components/footer';
import { MainBody } from '@/components/main';

export default function Home() {
  return (
    <>
      <Head>
        <title>Create Next App</title>
      </Head>
      <MainBody />
      <Footer />
    </>
  )
}
