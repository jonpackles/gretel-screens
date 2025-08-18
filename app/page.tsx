import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <Link 
          href="/dashboard" 
          className="w-48 h-48 border-2 border-white bg-black hover:bg-gray-900 text-white font-medium flex items-center justify-center text-xl transition-colors duration-200"
        >
          Dashboard
        </Link>
        
        <Link 
          href="/screen-a" 
          className="w-48 h-48 border-2 border-white bg-black hover:bg-gray-900 text-white font-medium flex items-center justify-center text-xl transition-colors duration-200"
        >
          Screen A
        </Link>
        
        <Link 
          href="/screen-b" 
          className="w-48 h-48 border-2 border-white bg-black hover:bg-gray-900 text-white font-medium flex items-center justify-center text-xl transition-colors duration-200"
        >
          Screen B
        </Link>

        <Link 
          href="/screens" 
          className="w-48 h-48 border-2 border-white bg-black hover:bg-gray-900 text-white font-medium flex items-center justify-center text-xl transition-colors duration-200"
        >
          <div className="text-center">
            <div>Screen</div>
            <div>Preview</div>
          </div>
        </Link>
      </div>
    </div>
  )
}

