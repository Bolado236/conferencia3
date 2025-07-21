import Quagga from 'https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.2.6/dist/quagga.min.js';

const btnAtivarCamera = document.getElementById('btnAtivarCamera');
const inputBusca = document.getElementById('inputBusca');

let scannerAtivo = false;

function iniciarScanner() {
    if (scannerAtivo) return;

    Quagga.init({
        inputStream: {
            type: "LiveStream",
            constraints: {
                facingMode: "environment",
                width: { min: 640 },
                height: { min: 480 },
                aspectRatio: { min: 1, max: 100 }
            },
            target: document.body
        },
        decoder: {
            readers: ["ean_reader", "code_128_reader", "upc_reader"]
        },
        locate: true
    }, (err) => {
        if (err) {
            console.error(err);
            alert('Erro ao iniciar scanner: ' + err);
            return;
        }
        Quagga.start();
        scannerAtivo = true;
    });

    Quagga.onDetected((result) => {
        if (result && result.codeResult && result.codeResult.code) {
            inputBusca.value = result.codeResult.code;
            Quagga.stop();
            scannerAtivo = false;
            // Disparar evento input para atualizar busca
            inputBusca.dispatchEvent(new Event('input'));
        }
    });
}

btnAtivarCamera.addEventListener('click', () => {
    if (scannerAtivo) {
        Quagga.stop();
        scannerAtivo = false;
    } else {
        iniciarScanner();
    }
});
