import './WorkflowModal.css'

function WorkflowModal({ isOpen, onClose, onNext, currentTool }) {
  if (!isOpen) return null

  const nextOptions = currentTool === 'watermark' 
    ? [
        { id: 'crop', label: '✂️ Crop Images', description: 'Crop the watermarked images' },
        { id: 'done', label: '✅ I\'m Done', description: 'Download and finish' }
      ]
    : [
        { id: 'watermark', label: '💧 Add Watermark', description: 'Add watermark to cropped images' },
        { id: 'done', label: '✅ I\'m Done', description: 'Download and finish' }
      ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>What would you like to do next?</h2>
        <p className="modal-description">Your images have been processed successfully!</p>
        
        <div className="workflow-options">
          {nextOptions.map(option => (
            <button
              key={option.id}
              className={`workflow-option ${option.id === 'done' ? 'done-option' : ''}`}
              onClick={() => {
                onNext(option.id)
                onClose()
              }}
            >
              <div className="option-label">{option.label}</div>
              <div className="option-description">{option.description}</div>
            </button>
          ))}
        </div>

        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
      </div>
    </div>
  )
}

export default WorkflowModal
