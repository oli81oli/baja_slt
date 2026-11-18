import { jsPDF } from 'jspdf'

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 20
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const BOTTOM = PAGE_HEIGHT - MARGIN

// Texto compartido por la baja (App.jsx) y la autorización (secretAdmin).
const TEXTO_SIZE = 12
const TEXTO_INTERLINEADO = 5.5

// El DNI de la baja mantiene su tamaño en el PDF final; el que se adjunta en
// secretAdmin es más alto y gana espacio reduciendo márgenes y separaciones.
const DNI_ALTO_BAJA = 52
const DNI_ALTO_ADJUNTO = 104
const DNI_ETIQUETA_ALTO = 6
const DNI_ETIQUETA_ALTO_ADJUNTO = 4
const MARGEN_AUTORIZACION = 10

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
  {
    maxHeight = 90,
    escala = 1,
    escalaEtiqueta = escala,
    xOffset = MARGIN,
    altoDniBase = DNI_ALTO_BAJA,
    altoEtiquetaBase = DNI_ETIQUETA_ALTO
  } = {}
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
  const altoEtiqueta = altoEtiquetaBase * escala
  const altoImagenMaximo = Math.max(12 * escala, maxHeight - altoEtiqueta)

  const cargadas = await Promise.all(
    columnas.map(async (columna) => {
      await cargarImagen(columna.src)
      return { etiqueta: columna.etiqueta, src: columna.src }
    })
  )

  // Mismo tamaño exacto para todas las imágenes del DNI/NIE.
  const anchoObjetivo = anchoColumna
  const altoObjetivo = Math.min(altoDniBase * escala, altoImagenMaximo)

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

  const compacto = { size: TEXTO_SIZE, interlineado: TEXTO_INTERLINEADO }

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
    maxHeight: BOTTOM - escritor.y,
    altoDniBase: DNI_ALTO_BAJA
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
  doc.setFontSize(TEXTO_SIZE)
  const lineasTexto = doc.splitTextToSize(TEXTO_AUTORIZACION, CONTENT_WIDTH)

  const imagenes = await Promise.all(documentoImagenes.map(cargarImagen))
  const hayDni = Boolean(frenteUrl || traseraUrl)

  const separacionBloques = 4
  const saltoTexto = 6

  // El documento de App.jsx se inserta a su ancho A4 original con la misma
  // escala que el texto, para que su DNI conserve el tamaño del PDF final.
  // El DNI adjunto en secretAdmin va más alto: el espacio se gana recortando
  // márgenes y separaciones, sin reducir la escala del resto.
  const sumaRatios = imagenes.reduce(
    (total, img) => total + img.naturalHeight / img.naturalWidth,
    0
  )
  const altoBloqueBase =
    PAGE_WIDTH * sumaRatios +
    4 * Math.max(imagenes.length - 1, 0) +
    (imagenes.length > 0 ? separacionBloques : 0) +
    lineasTexto.length * TEXTO_INTERLINEADO +
    saltoTexto +
    (hayDni ? DNI_ETIQUETA_ALTO_ADJUNTO + DNI_ALTO_ADJUNTO : 0)

  const altoDisponible = PAGE_HEIGHT - MARGEN_AUTORIZACION * 2
  const escala = Math.min(1, altoDisponible / altoBloqueBase)

  const anchoDocumento = PAGE_WIDTH * escala
  const xDocumento = (PAGE_WIDTH - anchoDocumento) / 2
  const xContenido = xDocumento + MARGIN * escala
  const anchoContenido = CONTENT_WIDTH * escala

  escritor.y =
    MARGEN_AUTORIZACION + Math.max(0, (altoDisponible - altoBloqueBase * escala) / 2)

  for (const [indice, img] of imagenes.entries()) {
    const alto = anchoDocumento * (img.naturalHeight / img.naturalWidth)
    doc.addImage(img.src, 'JPEG', xDocumento, escritor.y, anchoDocumento, alto)
    escritor.y += alto
    if (indice < imagenes.length - 1) {
      escritor.y += 4 * escala
    }
  }

  if (imagenes.length > 0) {
    escritor.y += separacionBloques * escala
  }

  escritor.texto(TEXTO_AUTORIZACION, {
    size: TEXTO_SIZE * escala,
    interlineado: TEXTO_INTERLINEADO * escala,
    salto: saltoTexto * escala,
    ancho: anchoContenido,
    x: xContenido
  })

  await agregarFilaDni(escritor, frenteUrl, traseraUrl, {
    maxHeight: PAGE_HEIGHT - MARGEN_AUTORIZACION - escritor.y,
    escala,
    escalaEtiqueta: escala,
    xOffset: xContenido,
    altoDniBase: DNI_ALTO_ADJUNTO,
    altoEtiquetaBase: DNI_ETIQUETA_ALTO_ADJUNTO
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
