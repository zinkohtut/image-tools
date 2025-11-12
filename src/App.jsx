import { useState } from 'react'
import WatermarkTool from './components/WatermarkTool'
import CropTool from './components/CropTool'
import WorkflowModal from './components/WorkflowModal'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('watermark')
  const [showWorkflowModal, setShowWorkflowModal] = useState(false)
  const [currentToolForModal, setCurrentToolForModal] = useState('')
  const [sharedImages, setSharedImages] = useState([])

  const handleProcessComplete = (tool, processedImages) => {
    setCurrentToolForModal(tool)
    setSharedImages(processedImages)
    setShowWorkflowModal(true)
  }

  const handleNextAction = (action) => {
    if (action === 'crop') {
      setActiveTab('crop')
    } else if (action === 'watermark') {
      setActiveTab('watermark')
    }
    // 'done' action just closes the modal
  }

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-left">
          <h1>Image Tools</h1>
        </div>
        <nav className="header-nav">
          <button 
            className={activeTab === 'watermark' ? 'active' : ''}
            onClick={() => setActiveTab('watermark')}
          >
            💧 Watermark
          </button>
          <button 
            className={activeTab === 'crop' ? 'active' : ''}
            onClick={() => setActiveTab('crop')}
          >
            ✂️ Crop
          </button>
          <button className="disabled" disabled>
            🔄 Resize
          </button>
          <button className="disabled" disabled>
            🎨 Filters
          </button>
        </nav>
      </header>

      <main className="tool-container">
        {activeTab === 'watermark' && (
          <WatermarkTool 
            onProcessComplete={handleProcessComplete}
            incomingImages={sharedImages}
          />
        )}
        {activeTab === 'crop' && (
          <CropTool 
            onProcessComplete={handleProcessComplete}
            incomingImages={sharedImages}
          />
        )}
      </main>

      <WorkflowModal 
        isOpen={showWorkflowModal}
        onClose={() => setShowWorkflowModal(false)}
        onNext={handleNextAction}
        currentTool={currentToolForModal}
      />

      <footer className="app-footer">
        <p>Built with React • Free & Open Source</p>
      </footer>
    </div>
  )
}

export default App
