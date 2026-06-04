import Link from 'next/link'

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
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-[#6949FF] hover:bg-[#5536E6] text-white font-semibold rounded-full transition-all duration-200"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
