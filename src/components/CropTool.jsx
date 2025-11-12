import { useState, useRef, useEffect } from 'react'
import JSZip from 'jszip'
import './CropTool.css'

function CropTool({ onProcessComplete, incomingImages = [] }) {
  const [selectedImages, setSelectedImages] = useState([])
  const [cropTop, setCropTop] = useState(0)
  const [cropBottom, setCropBottom] = useState(0)
  const [cropLeft, setCropLeft] = useState(0)
  const [cropRight, setCropRight] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [processedImages, setProcessedImages] = useState([])
  const [previewUrl, setPreviewUrl] = useState(null)
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 })
  
  const canvasRef = useRef(null)

  // Load incoming images from previous tool
  useEffect(() => {
    if (incomingImages.length > 0 && selectedImages.length === 0) {
      const files = incomingImages.map((item) => {
        return new File([item.blob], item.name, { type: 'image/png' })
      })
      setSelectedImages(files)
      setStatusMessage(`${files.length} image(s) loaded from previous step`)
      
      // Load first image for preview
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          setOriginalDimensions({ width: img.width, height: img.height })
          generatePreview(img)
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(files[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingImages])

  const handleImageSelection = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      setSelectedImages(files)
      setStatusMessage(`${files.length} image(s) selected`)
      setProcessedImages([])
      
      // Load first image for preview
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          setOriginalDimensions({ width: img.width, height: img.height })
          generatePreview(img)
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(files[0])
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'))
    
    if (files.length > 0) {
      setSelectedImages(files)
      setStatusMessage(`${files.length} image(s) selected`)
      setProcessedImages([])
      
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          setOriginalDimensions({ width: img.width, height: img.height })
          generatePreview(img)
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(files[0])
    }
  }

  const generatePreview = (img) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Calculate cropped dimensions
    const newWidth = img.width - cropLeft - cropRight
    const newHeight = img.height - cropTop - cropBottom

    // Ensure dimensions are positive
    if (newWidth <= 0 || newHeight <= 0) {
      setPreviewUrl(null)
      return
    }

    canvas.width = newWidth
    canvas.height = newHeight

    // Draw cropped image
    ctx.drawImage(
      img,
      cropLeft, cropTop, newWidth, newHeight,
      0, 0, newWidth, newHeight
    )

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    }, 'image/png')
  }

  const updatePreview = () => {
    if (selectedImages.length > 0) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          generatePreview(img)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(selectedImages[0])
    }
  }

  const handleCropChange = (setter, value) => {
    setter(Number(value))
    setTimeout(updatePreview, 0)
  }

  const processImage = (imageFile) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          const newWidth = img.width - cropLeft - cropRight
          const newHeight = img.height - cropTop - cropBottom

          if (newWidth <= 0 || newHeight <= 0) {
            resolve(null)
            return
          }

          canvas.width = newWidth
          canvas.height = newHeight

          ctx.drawImage(
            img,
            cropLeft, cropTop, newWidth, newHeight,
            0, 0, newWidth, newHeight
          )

          canvas.toBlob((blob) => {
            resolve(blob)
          }, 'image/png')
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(imageFile)
    })
  }

  const processAllImages = async () => {
    if (selectedImages.length === 0) return

    setIsProcessing(true)
    setProcessedImages([])
    
    const processed = []

    for (let i = 0; i < selectedImages.length; i++) {
      setStatusMessage(`Processing image ${i + 1} of ${selectedImages.length}...`)
      
      const blob = await processImage(selectedImages[i])
      if (blob) {
        processed.push({
          name: selectedImages[i].name,
          blob: blob
        })
      }
    }

    setProcessedImages(processed)
    setStatusMessage(`Successfully processed ${processed.length} images!`)
    setIsProcessing(false)
    
    // Trigger workflow modal if callback provided
    if (onProcessComplete && processed.length > 0) {
      onProcessComplete('crop', processed)
    }
  }

  const downloadAsZip = async () => {
    if (processedImages.length === 0) return

    setStatusMessage('Creating zip file...')
    
    const zip = new JSZip()
    const folder = zip.folder('cropped_images')

    processedImages.forEach((item) => {
      const nameParts = item.name.split('.')
      const extension = nameParts.pop()
      const baseName = nameParts.join('.')
      const newName = `${baseName}_cropped.${extension}`
      
      folder.file(newName, item.blob)
    })

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    
    const link = document.createElement('a')
    link.href = URL.createObjectURL(zipBlob)
    link.download = `cropped_images_${Date.now()}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setStatusMessage('Download complete!')
  }

  const croppedWidth = originalDimensions.width - cropLeft - cropRight
  const croppedHeight = originalDimensions.height - cropTop - cropBottom

  return (
    <div className="crop-tool">
      <div className="tool-card">
        <h2>✂️ Batch Image Crop Tool</h2>
        <p className="tool-description">Crop multiple images by pixels (top, bottom, left, right)</p>

        <div className="tool-layout">
          <div className="left-panel">
            <div className="upload-section">
              <div 
                className="upload-box"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <label htmlFor="cropImageFiles" className="upload-label">
                  <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <div className="upload-text">
                    <strong>Select Images</strong>
                    <span>Click or drag & drop</span>
                  </div>
                </label>
                <input 
                  type="file" 
                  id="cropImageFiles" 
                  accept="image/*" 
                  multiple 
                  onChange={handleImageSelection}
                />
                {selectedImages.length > 0 && (
                  <div className="file-count">
                    ✓ {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} selected
                  </div>
                )}
              </div>
            </div>

            {originalDimensions.width > 0 && (
              <div className="dimensions-info">
                <p><strong>Original:</strong> {originalDimensions.width} × {originalDimensions.height} px</p>
                <p><strong>After Crop:</strong> {croppedWidth > 0 ? croppedWidth : 0} × {croppedHeight > 0 ? croppedHeight : 0} px</p>
              </div>
            )}

            <div className="settings-section">
              <h3>✂️ Crop Settings (in pixels)</h3>
              <div className="settings-grid">
                <div className="setting-item">
                  <label>
                    Crop Top: <strong>{cropTop}px</strong>
                  </label>
                  <input 
                    type="number" 
                    min="0" 
                    max={originalDimensions.height}
                    value={cropTop}
                    onChange={(e) => handleCropChange(setCropTop, e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="setting-item">
                  <label>
                    Crop Bottom: <strong>{cropBottom}px</strong>
                  </label>
                  <input 
                    type="number" 
                    min="0" 
                    max={originalDimensions.height}
                    value={cropBottom}
                    onChange={(e) => handleCropChange(setCropBottom, e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="setting-item">
                  <label>
                    Crop Left: <strong>{cropLeft}px</strong>
                  </label>
                  <input 
                    type="number" 
                    min="0" 
                    max={originalDimensions.width}
                    value={cropLeft}
                    onChange={(e) => handleCropChange(setCropLeft, e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="setting-item">
                  <label>
                    Crop Right: <strong>{cropRight}px</strong>
                  </label>
                  <input 
                    type="number" 
                    min="0" 
                    max={originalDimensions.width}
                    value={cropRight}
                    onChange={(e) => handleCropChange(setCropRight, e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="action-section">
              <button 
                className="btn-primary"
                onClick={processAllImages}
                disabled={selectedImages.length === 0 || isProcessing || croppedWidth <= 0 || croppedHeight <= 0}
              >
                {isProcessing ? 'Processing...' : '✂️ Crop All Images'}
              </button>

              {processedImages.length > 0 && (
                <button 
                  className="btn-success"
                  onClick={downloadAsZip}
                >
                  📦 Download ZIP
                </button>
              )}

              {statusMessage && (
                <p className="status-message">{statusMessage}</p>
              )}
            </div>
          </div>

          <div className="right-panel">
            {previewUrl ? (
              <div className="preview-section">
                <h3>👁️ Preview</h3>
                <img src={previewUrl} alt="Cropped Preview" className="preview-image" />
              </div>
            ) : (
              <div className="preview-placeholder">
                <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="6" y="6" width="12" height="12" rx="1" ry="1"></rect>
                  <path d="M3 3h3m15 0h3M3 21h3m15 0h3M3 3v3m0 15v3M21 3v3m0 15v3"></path>
                </svg>
                <p>Preview will appear here</p>
              </div>
            )}
          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  )
}

export default CropTool
