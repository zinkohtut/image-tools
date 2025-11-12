import { useState, useRef, useEffect } from 'react'
import JSZip from 'jszip'
import './WatermarkTool.css'

function WatermarkTool({ onProcessComplete, incomingImages = [] }) {
  const [selectedImages, setSelectedImages] = useState([])
  const [watermarkImage, setWatermarkImage] = useState(null)
  const [watermarkSize, setWatermarkSize] = useState(100)
  const [watermarkOpacity, setWatermarkOpacity] = useState(100)
  const [watermarkPosition, setWatermarkPosition] = useState('center')
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [processedImages, setProcessedImages] = useState([])
  const [previewUrl, setPreviewUrl] = useState(null)
  
  const canvasRef = useRef(null)
  const watermarkImgRef = useRef(null)

  // Load incoming images from previous tool
  useEffect(() => {
    if (incomingImages.length > 0 && selectedImages.length === 0) {
      // Convert blobs back to files
      const files = incomingImages.map((item) => {
        return new File([item.blob], item.name, { type: 'image/png' })
      })
      setSelectedImages(files)
      setStatusMessage(`${files.length} image(s) loaded from previous step`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingImages])

  const handleImageSelection = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      setSelectedImages(files)
      setStatusMessage(`${files.length} image(s) selected`)
      setProcessedImages([])
      setPreviewUrl(null)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e, type) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'))
    
    if (files.length > 0) {
      if (type === 'images') {
        setSelectedImages(files)
        setStatusMessage(`${files.length} image(s) selected`)
        setProcessedImages([])
        setPreviewUrl(null)
      } else if (type === 'watermark') {
        const file = files[0]
        const reader = new FileReader()
        reader.onload = (event) => {
          const img = new Image()
          img.onload = () => {
            watermarkImgRef.current = img
            setWatermarkImage(img)
            setStatusMessage('Watermark loaded successfully')
            if (selectedImages.length > 0) {
              generatePreviewWithWatermark(img)
            }
          }
          img.src = event.target.result
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleWatermarkSelection = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          watermarkImgRef.current = img
          setWatermarkImage(img)
          setStatusMessage('Watermark loaded successfully')
          // Generate preview immediately after watermark is loaded
          if (selectedImages.length > 0) {
            generatePreviewWithWatermark(img)
          }
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    }
  }

  const generatePreviewWithWatermark = (wmImage) => {
    if (!selectedImages[0] || !wmImage) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')

        canvas.width = img.width
        canvas.height = img.height

        // Draw original image
        ctx.drawImage(img, 0, 0)

        // Draw watermark
        const { x, y, width, height } = calculateWatermarkDimensions(
          img.width,
          img.height,
          wmImage.width,
          wmImage.height
        )

        ctx.globalAlpha = watermarkOpacity / 100
        ctx.drawImage(wmImage, x, y, width, height)
        ctx.globalAlpha = 1.0

        // Create preview URL
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob)
          setPreviewUrl(url)
        }, 'image/png')
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(selectedImages[0])
  }

  const calculateWatermarkDimensions = (imgWidth, imgHeight, wmWidth, wmHeight) => {
    const padding = 20
    const sizePercent = watermarkSize / 100
    const width = imgWidth * sizePercent
    const height = (wmHeight / wmWidth) * width

    let x, y

    switch (watermarkPosition) {
      case 'top-left':
        x = padding
        y = padding
        break
      case 'top-right':
        x = imgWidth - width - padding
        y = padding
        break
      case 'bottom-left':
        x = padding
        y = imgHeight - height - padding
        break
      case 'bottom-right':
        x = imgWidth - width - padding
        y = imgHeight - height - padding
        break
      case 'center':
        x = (imgWidth - width) / 2
        y = (imgHeight - height) / 2
        break
      default:
        x = (imgWidth - width) / 2
        y = (imgHeight - height) / 2
    }

    return { x, y, width, height }
  }

  const processImage = (imageFile, watermark) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          canvas.width = img.width
          canvas.height = img.height

          // Draw original image
          ctx.drawImage(img, 0, 0)

          // Draw watermark
          const { x, y, width, height } = calculateWatermarkDimensions(
            img.width,
            img.height,
            watermark.width,
            watermark.height
          )

          ctx.globalAlpha = watermarkOpacity / 100
          ctx.drawImage(watermark, x, y, width, height)
          ctx.globalAlpha = 1.0

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
    if (!watermarkImage || selectedImages.length === 0) return

    setIsProcessing(true)
    setProcessedImages([])
    
    const processed = []

    for (let i = 0; i < selectedImages.length; i++) {
      setStatusMessage(`Processing image ${i + 1} of ${selectedImages.length}...`)
      
      const blob = await processImage(selectedImages[i], watermarkImage)
      processed.push({
        name: selectedImages[i].name,
        blob: blob
      })
    }

    setProcessedImages(processed)
    setStatusMessage(`Successfully processed ${processed.length} images!`)
    setIsProcessing(false)
    
    // Trigger workflow modal if callback provided
    if (onProcessComplete && processed.length > 0) {
      onProcessComplete('watermark', processed)
    }
  }

  const downloadAsZip = async () => {
    if (processedImages.length === 0) return

    setStatusMessage('Creating zip file...')
    
    const zip = new JSZip()
    const folder = zip.folder('watermarked_images')

    processedImages.forEach((item) => {
      const nameParts = item.name.split('.')
      const extension = nameParts.pop()
      const baseName = nameParts.join('.')
      const newName = `${baseName}_watermarked.${extension}`
      
      folder.file(newName, item.blob)
    })

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    
    const link = document.createElement('a')
    link.href = URL.createObjectURL(zipBlob)
    link.download = `watermarked_images_${Date.now()}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setStatusMessage('Download complete!')
  }

  return (
    <div className="watermark-tool">
      <div className="tool-card">
        <h2>💧 Batch Watermark Tool</h2>
        <p className="tool-description">Add watermarks to multiple images at once</p>

        <div className="tool-layout">
          <div className="left-panel">
            <div className="upload-grid">
              <div 
                className="upload-box"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'images')}
              >
                <label htmlFor="imageFiles" className="upload-label">
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
                  id="imageFiles" 
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

              <div 
                className="upload-box"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'watermark')}
              >
                <label htmlFor="watermarkFile" className="upload-label">
                  <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="12" y1="18" x2="12" y2="12"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
                  <div className="upload-text">
                    <strong>Select Watermark</strong>
                    <span>Click or drag & drop</span>
                  </div>
                </label>
                <input 
                  type="file" 
                  id="watermarkFile" 
                  accept="image/*" 
                  onChange={handleWatermarkSelection}
                />
                {watermarkImage && (
                  <div className="file-count">
                    ✓ Watermark loaded
                  </div>
                )}
              </div>
            </div>

            <div className="settings-section">
              <h3>⚙️ Watermark Settings</h3>
              <div className="settings-grid">
                <div className="setting-item">
                  <label>
                    Size: <strong>{watermarkSize}%</strong>
                  </label>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={watermarkSize}
                    onChange={(e) => {
                      setWatermarkSize(Number(e.target.value))
                      if (watermarkImage) generatePreviewWithWatermark(watermarkImage)
                    }}
                  />
                </div>

                <div className="setting-item">
                  <label>
                    Opacity: <strong>{watermarkOpacity}%</strong>
                  </label>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={watermarkOpacity}
                    onChange={(e) => {
                      setWatermarkOpacity(Number(e.target.value))
                      if (watermarkImage) generatePreviewWithWatermark(watermarkImage)
                    }}
                  />
                </div>

                <div className="setting-item">
                  <label>
                    Position: <strong>{watermarkPosition.replace('-', ' ')}</strong>
                  </label>
                  <select 
                    value={watermarkPosition}
                    onChange={(e) => {
                      setWatermarkPosition(e.target.value)
                      if (watermarkImage) generatePreviewWithWatermark(watermarkImage)
                    }}
                  >
                    <option value="center">Center</option>
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="action-section">
              <button 
                className="btn-primary"
                onClick={processAllImages}
                disabled={!watermarkImage || selectedImages.length === 0 || isProcessing}
              >
                {isProcessing ? 'Processing...' : '🎨 Apply Watermark'}
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
                <img src={previewUrl} alt="Preview" className="preview-image" />
              </div>
            ) : (
              <div className="preview-placeholder">
                <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
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

export default WatermarkTool
