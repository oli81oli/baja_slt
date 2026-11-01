import { jsPDF } from 'jspdf'

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 20
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const BOTTOM = PAGE_HEIGHT - MARGIN

const cargarImagen = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

const leerComoDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export const archivoImagenAJpeg = async (file) => {
  const dataUrl = await leerComoDataUrl(file)
  const img = await cargarImagen(dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(img, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.9)
}

class EscritorPdf {
  constructor(doc) {
    this.doc = doc
    this.y = MARGIN
  }

  asegurar(alto) {
    if (this.y + alto > BOTTOM) {
      this.doc.addPage()
      this.y = MARGIN
    }
  }

  texto(texto, {
    size = 11,
    estilo = 'normal',
    alineacion = 'left',
    salto = 6,
    interlineado = 5.5,
    ancho = CONTENT_WIDTH,
    x = MARGIN
  } = {}) {
    this.doc.setFont('helvetica', estilo)
    this.doc.setFontSize(size)
    const lineas = this.doc.splitTextToSize(texto, ancho)
    const alto = lineas.length * interlineado
    this.asegurar(alto)

    const posX =
      alineacion === 'center'
        ? x + ancho / 2
        : alineacion === 'right'
          ? x + ancho
          : x

    this.doc.text(lineas, posX, this.y, { align: alineacion })
    this.y += alto + salto
  }

  espacio(alto) {
    this.y += alto
  }
}

const agregarFilaDni = async (
  escritor,
  frenteUrl,
  traseraUrl,
  { maxHeight = 90, escala = 1, escalaEtiqueta = escala, xOffset = MARGIN } = {}
) => {
  const columnas = [
    { etiqueta: 'Parte delantera DNI/NIE', src: frenteUrl },
    { etiqueta: 'Parte trasera DNI/NIE', src: traseraUrl }
  ].filter((columna) => columna.src)

  if (columnas.length === 0) {
    return
  }

  const separacion = 6 * escala
  const anchoTotal = CONTENT_WIDTH * escala
  const anchoColumna = (anchoTotal - separacion) / 2
  const altoEtiqueta = 6 * escala
  const altoImagenMaximo = Math.max(12 * escala, maxHeight - altoEtiqueta)

  const cargadas = await Promise.all(
    columnas.map(async (columna) => {
      await cargarImagen(columna.src)
      return { etiqueta: columna.etiqueta, src: columna.src }
    })
  )

  // Mismo tamaño exacto para todas las imágenes del DNI/NIE.
  const anchoObjetivo = anchoColumna
  const altoObjetivo = Math.min(52 * escala, altoImagenMaximo)

  const imagenes = cargadas.map(({ etiqueta, src }) => ({
    etiqueta,
    src,
    ancho: anchoObjetivo,
    alto: altoObjetivo
  }))

  const altoFila = Math.max(...imagenes.map((imagen) => imagen.alto)) + altoEtiqueta

  const yInicial = escritor.y
  let x =
    columnas.length === 1 ? xOffset + (anchoTotal - anchoColumna) / 2 : xOffset

  imagenes.forEach((imagen) => {
    escritor.doc.setFont('helvetica', 'normal')
    escritor.doc.setFontSize(10 * escalaEtiqueta)
    escritor.doc.text(imagen.etiqueta, x + anchoColumna / 2, yInicial, { align: 'center' })
    escritor.doc.addImage(
      imagen.src,
      'JPEG',
      x + (anchoColumna - imagen.ancho) / 2,
      yInicial + altoEtiqueta,
      imagen.ancho,
      imagen.alto
    )
    x += anchoColumna + separacion
  })

  escritor.y = yInicial + altoFila
}

export const generarPdfBaja = async ({ nombre, dniNie, frenteUrl, traseraUrl }) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const escritor = new EscritorPdf(doc)

  doc.setProperties({ title: 'Baja SLT' })

  const compacto = { size: 10, interlineado: 5 }

  escritor.texto('Señores', { ...compacto, salto: 2 })
  escritor.texto('Sindicato Libre de Transportes (SLT)', { ...compacto, salto: 2 })
  escritor.texto('Av de Asturias 47 C.P. 28029', { ...compacto, salto: 2 })
  escritor.texto('Madrid', { ...compacto, salto: 8 })

  escritor.texto(
    `Yo, ${nombre}, con DNI/NIE: ${dniNie} por la presente me dirijo a ustedes a fin de notificarles lo siguiente:`,
    { ...compacto, salto: 8 }
  )
  escritor.texto(
    'Solicito me den de baja de su organización sindical conocida por las siglas SLT (Sindicato Libre de Transporte) y en consecuencia notifiquen a la empresa ARES CAPITAL que se abstengan de descontar de mis haberes ningún pago a la nombrada organización sindical.',
    { ...compacto, salto: 8 }
  )
  escritor.texto(
    'De igual forma y de conformidad con lo establecido en la ley orgánica de protección de datos les solicito que mis datos personales sean cancelados de sus registros.',
    { ...compacto, salto: 8 }
  )
  escritor.texto('Sin más de Ustedes', { ...compacto, salto: 8 })
  escritor.texto('En Madrid a fecha de su presentación', {
    ...compacto,
    alineacion: 'right',
    salto: 10
  })
  escritor.texto('Atentamente', { ...compacto, alineacion: 'center', salto: 8 })
  escritor.texto(nombre, { ...compacto, alineacion: 'center', salto: 5 })
  escritor.texto(dniNie, { ...compacto, alineacion: 'center', salto: 10 })

  await agregarFilaDni(escritor, frenteUrl, traseraUrl, {
    maxHeight: BOTTOM - escritor.y
  })

  return doc
}

const TEXTO_AUTORIZACION =
  'De igual forma autorizo a Carlos Cabral Gómes a que en mi nombre y representación, presente esta comunicación en la sede de este sindicato en Av. Asturias 47'

export const generarPdfAutorizacion = async ({ documentoImagenes, frenteUrl, traseraUrl }) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const escritor = new EscritorPdf(doc)

  doc.setProperties({ title: 'Autorización baja SLT' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const lineasTexto = doc.splitTextToSize(TEXTO_AUTORIZACION, CONTENT_WIDTH)
  const numLineas = lineasTexto.length

  const imagenes = await Promise.all(documentoImagenes.map(cargarImagen))
  const hayDni = Boolean(frenteUrl || traseraUrl)

  // Todo el bloque (documento + texto + DNI) se escala con el mismo factor
  // para que textos e imágenes mantengan proporciones y tamaños coherentes.
  const sumaRatios = imagenes.reduce(
    (total, img) => total + img.naturalHeight / img.naturalWidth,
    0
  )
  const relacionTexto = CONTENT_WIDTH / PAGE_WIDTH
  const altoBloqueBase =
    CONTENT_WIDTH * sumaRatios +
    4 * Math.max(imagenes.length - 1, 0) +
    8 +
    (numLineas * 5 + 12) * relacionTexto +
    (hayDni ? 6 + 52 : 0)

  const altoDisponible = BOTTOM - MARGIN
  const escala = Math.min(1, altoDisponible / altoBloqueBase) * 0.98
  const altoBloque = altoBloqueBase * escala
  const anchoBloque = CONTENT_WIDTH * escala
  const xOffset = MARGIN + (CONTENT_WIDTH - anchoBloque) / 2
  const escalaTexto = anchoBloque / PAGE_WIDTH

  escritor.y = MARGIN + Math.max(0, (altoDisponible - altoBloque) / 2)

  for (const [indice, img] of imagenes.entries()) {
    const alto = anchoBloque * (img.naturalHeight / img.naturalWidth)
    doc.addImage(img.src, 'JPEG', xOffset, escritor.y, anchoBloque, alto)
    escritor.y += alto
    if (indice < imagenes.length - 1) {
      escritor.y += 4 * escala
    }
  }

  if (imagenes.length > 0) {
    escritor.y += 8 * escala
  }

  escritor.texto(TEXTO_AUTORIZACION, {
    size: 10 * escalaTexto,
    interlineado: 5 * escalaTexto,
    salto: 12 * escalaTexto,
    ancho: anchoBloque,
    x: xOffset
  })

  await agregarFilaDni(escritor, frenteUrl, traseraUrl, {
    maxHeight: BOTTOM - escritor.y,
    escala,
    escalaEtiqueta: escalaTexto,
    xOffset
  })

  return doc
}

export const nombreArchivoSeguro = (nombre, porDefecto) => {
  const limpio = (nombre || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '_')

  return limpio || porDefecto
}
