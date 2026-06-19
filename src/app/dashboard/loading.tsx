export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 p-4
                    animate-pulse space-y-4">
      <div className="h-8 bg-gray-800 rounded w-32" />
      {[1,2,3].map(i => (
        <div key={i}
             className="bg-gray-900 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div className="w-10 h-10 bg-gray-800 rounded-full"/>
            <div className="w-16 h-4 bg-gray-800 rounded" />
            <div className="w-10 h-10 bg-gray-800 rounded-full"/>
          </div>
          <div className="h-3 bg-gray-800 rounded w-24 mx-auto"/>
        </div>
      ))}
    </div>
  )
}
