import { useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
import SecretAdmin from './SecretAdmin.jsx'
import { archivoImagenAJpeg, generarPdfBaja, nombreArchivoSeguro } from './pdf.js'
import './App.css'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const esRutaSecretAdmin = () => {
  const path = window.location.pathname.replace(/\/+$/, '').toLowerCase()
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase()

  return path.endsWith('/secretadmin') || hash === 'secretadmin'
}

function BajaForm() {
  const [nombre, setNombre] = useState('')
  const [dniNie, setDniNie] = useState('')
  const [frenteUrl, setFrenteUrl] = useState('')
  const [traseraUrl, setTraseraUrl] = useState('')
  const [frenteStatus, setFrenteStatus] = useState('')
  const [traseraStatus, setTraseraStatus] = useState('')
  const [generando, setGenerando] = useState(false)

  const convertirPdfAImagen = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.height = viewport.height
    canvas.width = viewport.width
    await page.render({ canvasContext: context, viewport: viewport }).promise
    return canvas.toDataURL('image/jpeg', 0.8)
  }

  const handleFrenteChange = async (e) => {
    const file = e.target.files[0]
    if (!file) {
      setFrenteUrl('')
      setFrenteStatus('')
      return
    }
    setFrenteStatus('Subiendo archivo...')
    if (file.type === 'application/pdf') {
      try {
        const imgUrl = await convertirPdfAImagen(file)
        setFrenteUrl(imgUrl)
        setFrenteStatus('Archivo subido')
      } catch {
        alert('Error al procesar el PDF')
        setFrenteStatus('')
      }
    } else if (file.type.startsWith('image/')) {
      setFrenteUrl(await archivoImagenAJpeg(file))
      setFrenteStatus('Archivo subido')
    } else {
      alert('Solo se permiten imágenes o archivos PDF')
      setFrenteStatus('')
    }
  }

  const handleTraseraChange = async (e) => {
    const file = e.target.files[0]
    if (!file) {
      setTraseraUrl('')
      setTraseraStatus('')
      return
    }
    setTraseraStatus('Subiendo archivo...')
    if (file.type === 'application/pdf') {
      try {
        const imgUrl = await convertirPdfAImagen(file)
        setTraseraUrl(imgUrl)
        setTraseraStatus('Archivo subido')
      } catch {
        alert('Error al procesar el PDF')
        setTraseraStatus('')
      }
    } else if (file.type.startsWith('image/')) {
      setTraseraUrl(await archivoImagenAJpeg(file))
      setTraseraStatus('Archivo subido')
    } else {
      alert('Solo se permiten imágenes o archivos PDF')
      setTraseraStatus('')
    }
  }

  const generarDocumento = async () => {
    setGenerando(true)
    try {
      const doc = await generarPdfBaja({ nombre, dniNie, frenteUrl, traseraUrl })
      doc.save(`Baja_SLT_${nombreArchivoSeguro(nombre, 'documento')}.pdf`)
    } catch {
      alert('Error al generar el documento')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        BAJA DE SLT
      </header>

      <main className="main">
        <div className="form-group">
          <input
            type="text"
            className="input"
            placeholder="Nombre y apellidos"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className="form-group">
          <input
            type="text"
            className="input"
            placeholder="DNI/NIE"
            value={dniNie}
            onChange={(e) => setDniNie(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="file-label">
            Adjuntar parte delantera DNI/NIE (imagen o PDF)
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFrenteChange}
              className="file-input"
            />
          </label>
          {frenteStatus && <div className="status">{frenteStatus}</div>}
        </div>

        <div className="form-group">
          <label className="file-label">
            Adjuntar parte trasera DNI/NIE (imagen o PDF)
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleTraseraChange}
              className="file-input"
            />
          </label>
          {traseraStatus && <div className="status">{traseraStatus}</div>}
        </div>

        <div className="button-container">
          <button className="generate-button" onClick={generarDocumento} disabled={generando}>
            {generando ? 'GENERANDO...' : 'GENERAR'}
          </button>
        </div>
      </main>
    </div>
  )
}

function App() {
  if (esRutaSecretAdmin()) {
    return <SecretAdmin />
  }

  return <BajaForm />
}

export default App
