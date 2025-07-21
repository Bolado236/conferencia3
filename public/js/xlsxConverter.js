import * as XLSX from 'https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs';

const colunasObrigatorias = [
    'codigoProduto',
    'descricao',
    'codigobarras',
    'quantidade',
    'departamento',
    'categoria',
    'subcategoria',
    'disponibilidade'
];

export function validarCabecalho(sheet) {
    const primeiraLinha = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, raw: false })[0];
    if (!primeiraLinha) return false;

    const headers = primeiraLinha.map(h => h.toString().toLowerCase());
    return colunasObrigatorias.every(col => headers.includes(col.toLowerCase()));
}

export function converterXLSXParaJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            if (!validarCabecalho(sheet)) {
                reject(new Error('Arquivo XLSX não possui o cabeçalho obrigatório.'));
                return;
            }

            let json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

            // Processar codigobarras para array
            json = json.map(item => {
                if (typeof item.codigobarras === 'string') {
                    item.codigobarras = item.codigobarras.split(';').map(s => s.trim()).filter(s => s.length > 0);
                } else {
                    item.codigobarras = [];
                }
                return item;
            });

            resolve(json);
        };
        reader.onerror = (err) => {
            reject(err);
        };
        reader.readAsArrayBuffer(file);
    });
}
