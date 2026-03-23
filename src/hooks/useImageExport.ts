// Explort SVG button

export type ExportOptions = {
  filename?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
}

export const useImageExport = () => {
  const exportSvgAsImage = (
    svgElement: SVGElement, 
    { 
      filename = 'image.png',
      width,
      height,
      backgroundColor = 'white'
    }: ExportOptions = {}
  ) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Use provided dimensions or get from SVG viewBox
    const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number) || [];
    canvas.width = width || (viewBox[2] || svgElement.clientWidth);
    canvas.height = height || (viewBox[3] || svgElement.clientHeight);

    // Create a blob from the SVG
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    // Create image from SVG and draw to canvas
    const img = new Image();
    img.onload = () => {
      if (backgroundColor) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      
      // Convert to PNG and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
      
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return { exportSvgAsImage };
}; 