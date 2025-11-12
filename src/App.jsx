import { useState } from 'react'
import WatermarkTool from './components/WatermarkTool'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('watermark')

  return (
    <div className="App">
      <header className="app-header">
        <h1>🖼️ Image Tools</h1>
        <p>Professional image editing tools for everyone</p>
      </header>

      <nav className="tools-nav">
        <button 
          className={activeTab === 'watermark' ? 'active' : ''}
          onClick={() => setActiveTab('watermark')}
        >
          💧 Watermark
        </button>
        <button className="disabled" disabled>
          🔄 Resize (Coming Soon)
        </button>
        <button className="disabled" disabled>
          ✂️ Crop (Coming Soon)
        </button>
        <button className="disabled" disabled>
          🎨 Filters (Coming Soon)
        </button>
      </nav>

      <main className="tool-container">
        {activeTab === 'watermark' && <WatermarkTool />}
      </main>

      <footer className="app-footer">
        <p>Built with React • Free & Open Source</p>
      </footer>
    </div>
  )
}

export default App
