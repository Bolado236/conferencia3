export function iniciarLeitorCamera(callbackSucesso) {
  if (!window.Quagga) {
    alert("Leitor de câmera não disponível.");
    return;
  }

  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      constraints: {
        width: 640,
        height: 480,
        facingMode: "environment"
      },
      target: document.body
    },
    decoder: {
      readers: ["ean_reader", "code_128_reader"]
    }
  }, err => {
    if (err) {
      console.error(err);
      return;
    }

    try {
      const canvas = Quagga.canvas?.ctx?.image?.canvas;
      if (canvas) {
        canvas.getContext('2d', { willReadFrequently: true });
      }
    } catch (e) {
      console.warn('Não foi possível ajustar willReadFrequently:', e);
    }

    Quagga.start();
  });

  Quagga.onDetected(data => {
    const code = data.codeResult.code;
    Quagga.stop();
    if (callbackSucesso) callbackSucesso(code);
  });
}
