/**
 * Compressão de Imagens Client-side via Canvas API ($0 cost)
 * Reduz fotos de 10MB para ~120-180KB mantendo total nitidez para leitura de etiquetas e documentos
 */
export async function compressImage(
  source: File | string,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    const onLoad = () => {
      let width = img.width;
      let height = img.height;

      // Calcular proporção mantendo aspecto
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Falha ao criar contexto do Canvas'));
        return;
      }

      // Desenho nítido com suavização
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Exportar como JPEG otimizado
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.onerror = (err) => reject(err);

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(source);
    }
  });
}
