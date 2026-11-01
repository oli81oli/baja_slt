import { useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { archivoImagenAJpeg, generarPdfAutorizacion } from './pdf.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

const convertirPdfAImagenes = async (file) => {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const imagenes = []

  for (let numero = 1; numero <= pdf.numPages; numero += 1) {
    const page = await pdf.getPage(numero)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.height = viewport.height
    canvas.width = viewport.width
    await page.render({ canvasContext: context, viewport: viewport }).promise
    imagenes.push(canvas.toDataURL('image/jpeg', 0.85))
  }

  return imagenes
}

const archivoAImagenes = async (file) => {
  if (file.type === 'application/pdf') {
    return convertirPdfAImagenes(file)
  }

  if (file.type.startsWith('image/')) {
    return [await archivoImagenAJpeg(file)]
  }

  throw new Error('formato no permitido')
}

function SecretAdmin() {
  const [desbloqueado, setDesbloqueado] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const [documentoImagenes, setDocumentoImagenes] = useState([])
  const [documentoStatus, setDocumentoStatus] = useState('')

  const [frenteUrl, setFrenteUrl] = useState('')
  const [frenteStatus, setFrenteStatus] = useState('')

  const [traseraUrl, setTraseraUrl] = useState('')
  const [traseraStatus, setTraseraStatus] = useState('')

  const [generando, setGenerando] = useState(false)

  const handlePasswordSubmit = (e) => {
    e.preventDefault()

    if (password === ADMIN_PASSWORD) {
      setDesbloqueado(true)
      setPassword('')
      setPasswordError('')
      return
    }

    setPasswordError('Contraseña incorrecta')
  }

  const handleDocumentoChange = async (e) => {
    const file = e.target.files[0]
    if (!file) {
      setDocumentoImagenes([])
      setDocumentoStatus('')
      return
    }

    setDocumentoStatus('Subiendo archivo...')
    try {
      const imagenes = await archivoAImagenes(file)
      setDocumentoImagenes(imagenes)
      setDocumentoStatus('Archivo subido')
    } catch {
      alert('Solo se permiten imágenes o archivos PDF')
      setDocumentoImagenes([])
      setDocumentoStatus('')
    }
  }

  const handleFrenteChange = async (e) => {
    const file = e.target.files[0]
    if (!file) {
      setFrenteUrl('')
      setFrenteStatus('')
      return
    }

    setFrenteStatus('Subiendo archivo...')
    try {
      const [imagen] = await archivoAImagenes(file)
      setFrenteUrl(imagen)
      setFrenteStatus('Archivo subido')
    } catch {
      alert('Solo se permiten imágenes o archivos PDF')
      setFrenteUrl('')
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
    try {
      const [imagen] = await archivoAImagenes(file)
      setTraseraUrl(imagen)
      setTraseraStatus('Archivo subido')
    } catch {
      alert('Solo se permiten imágenes o archivos PDF')
      setTraseraUrl('')
      setTraseraStatus('')
    }
  }

  const generarDocumento = async () => {
    if (documentoImagenes.length === 0) {
      alert('Adjunta primero el documento generado')
      return
    }

    setGenerando(true)
    try {
      const doc = await generarPdfAutorizacion({
        documentoImagenes,
        frenteUrl,
        traseraUrl
      })
      doc.save('Autorizacion_BAJA_SLT.pdf')
    } catch {
      alert('Error al generar el documento')
    } finally {
      setGenerando(false)
    }
  }

  if (!desbloqueado) {
    return (
      <div className="app">
        <header className="header">ADMIN</header>

        <main className="main">
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <input
                type="password"
                className="input"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {passwordError && <div className="status error">{passwordError}</div>}

            <div className="button-container">
              <button type="submit" className="generate-button">
                DESBLOQUEAR
              </button>
            </div>
          </form>
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">ADMIN</header>

      <main className="main">
        <div className="form-group">
          <label className="file-label file-label-block">
            Adjuntar documento generado (imagen o PDF)
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleDocumentoChange}
              className="file-input"
            />
          </label>
          {documentoStatus && <div className="status">{documentoStatus}</div>}
        </div>

        <div className="form-group">
          <label className="file-label file-label-block">
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
          <label className="file-label file-label-block">
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

export default SecretAdmin
