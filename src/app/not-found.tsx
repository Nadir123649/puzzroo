import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#181A20] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#6949FF] mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-[#212121] dark:text-white mb-4">
          Page Not Found
        </h2>
        <p className="text-[#424242] dark:text-[#E0E0E0] mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/" prefetch={false}>
          <Button size="md">Go Home</Button>
        </Link>
      </div>
    </div>
  )
}
