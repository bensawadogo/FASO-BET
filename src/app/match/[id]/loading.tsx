export default function MatchDetailLoading() {
  return (
    <div className="animate-pulse bg-gray-950 min-h-screen">
      <main className="max-w-2xl mx-auto px-margin-mobile">
        {/* Header Match Section */}
        <section className="py-stack-lg border-b border-outline-variant">
          <div className="flex justify-between items-center mb-stack-md">
            {/* Home Circle */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className="w-16 h-16 bg-gray-800 rounded-full" />
              <div className="h-4 w-24 bg-gray-800 rounded" />
            </div>
            {/* Center Text */}
            <div className="flex flex-col items-center justify-center gap-1 flex-none px-stack-lg">
              <div className="h-3 w-20 bg-gray-800 rounded" />
              <div className="h-6 w-10 bg-gray-800 rounded" />
              <div className="h-3 w-24 bg-gray-800 rounded" />
            </div>
            {/* Away Circle */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className="w-16 h-16 bg-gray-800 rounded-full" />
              <div className="h-4 w-24 bg-gray-800 rounded" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-3 w-40 bg-gray-800 rounded" />
            <div className="h-3 w-56 bg-gray-800 rounded" />
          </div>
        </section>

        {/* Prediction Card */}
        <section className="py-stack-lg flex flex-col items-center gap-4">
          <div className="w-48 h-48 bg-gray-800 rounded-full" />
          <div className="grid grid-cols-2 gap-stack-md w-full">
            <div className="h-20 bg-gray-800 rounded" />
            <div className="h-20 bg-gray-800 rounded" />
          </div>
          <div className="w-full h-10 bg-gray-800 rounded" />
        </section>

        {/* Probabilities Bar */}
        <section className="py-stack-lg border-y border-outline-variant">
          <div className="h-3 w-48 bg-gray-800 rounded mb-stack-md" />
          <div className="grid grid-cols-3 gap-1 h-12 rounded overflow-hidden">
            <div className="bg-gray-800" />
            <div className="bg-gray-800" />
            <div className="bg-gray-800" />
          </div>
        </section>

        {/* AI Agent Breakdown (3 rows) */}
        <section className="py-stack-lg space-y-stack-md">
          <div className="h-3 w-36 bg-gray-800 rounded mb-4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-stack-md bg-gray-800/50 border-l-2 border-gray-700 rounded">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 bg-gray-800 rounded" />
                <div className="h-3 w-24 bg-gray-800 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-gray-800 rounded" />
                <div className="h-3 w-3/4 bg-gray-800 rounded" />
              </div>
            </div>
          ))}
        </section>

        {/* H2H Table (3 rows) */}
        <section className="py-stack-lg">
          <div className="h-3 w-24 bg-gray-800 rounded mb-stack-md" />
          <div className="bg-gray-800/30 border border-gray-800 rounded overflow-hidden">
            <div className="h-8 bg-gray-800" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 border-b border-gray-800 flex items-center px-4">
                <div className="h-3 w-3/5 bg-gray-800 rounded" />
                <div className="h-3 w-12 bg-gray-800 rounded mx-auto" />
                <div className="h-3 w-16 bg-gray-800 rounded ml-auto" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}