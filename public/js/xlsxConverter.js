import * as XLSX from 'https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs';

export function converterXLSXParaJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            // Processar codigobarras para array
            const json = rows.map(item => {
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
