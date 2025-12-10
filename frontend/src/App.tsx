import { useState, useEffect } from 'react'
import init, * as wasm from 'hello_world'

function App() {
  const [greeting, setGreeting] = useState<string>('')
  const [wasmReady, setWasmReady] = useState<boolean>(false)

  useEffect(() => {
    init().then(() => {
      setWasmReady(true)
    })
  }, [])

  const testWasm = () => {
    if (!wasmReady) return
    const message = wasm.greet('World')
    setGreeting(message)
    console.log('WASM add function:', wasm.add(5, 7))
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-slate-900 rounded-xl shadow-2xl p-8 border border-slate-800">
        <h1 className="text-4xl font-bold mb-6 text-center text-slate-50">
          React + Rust WASM + Tailwind
        </h1>

        <div className="space-y-4">
          <button
            onClick={testWasm}
            disabled={!wasmReady}
            className="w-full px-6 py-3 bg-slate-50 text-slate-900 font-semibold rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {wasmReady ? 'Test WASM' : 'Loading WASM...'}
          </button>

          {greeting && (
            <div className="mt-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <p className="text-lg text-slate-100 text-center font-medium">
                {greeting}
              </p>
            </div>
          )}

          <div className="mt-8 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
            <h2 className="text-lg font-semibold mb-2 text-slate-50">
              ✅ Setup Complete!
            </h2>
            <p className="text-sm text-slate-400">
              This demonstrates that your React + Rust WASM + Tailwind stack is working.
              You can add more crates in the <code className="bg-slate-800 px-2 py-1 rounded text-slate-300 border border-slate-700">crates/</code> directory.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
