import { Metadata } from 'next'
import { InfoPageLayout } from '@/components/layout/InfoPageLayout'
import { FAQ } from '@/components/sections/FAQ'

export const metadata: Metadata = {
  title: 'FAQ',
}

export default function FAQPage() {
  return (
    <InfoPageLayout>
      <FAQ />
    </InfoPageLayout>
  )
}
