import * as XLSX from 'https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs';

export function converterXLSXParaJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

                if (!rows.length) return reject("A planilha está vazia.");

                const obrigatorios = ["codigoProduto", "descricao", "quantidade"];
                const primeiraLinha = Object.keys(rows[0]);
                for (const col of obrigatorios) {
                    if (!primeiraLinha.includes(col)) {
                        return reject(`Coluna obrigatória ausente: ${col}`);
                    }
                }

                const json = rows.map(item => {
                    item.codigoProduto = String(item.codigoProduto || "").trim();
                    if (typeof item.codigoBarras === 'string') {
                        item.codigoBarras = item.codigoBarras
                            .split(';')
                            .map(s => s.trim())
                            .filter(s => s.length > 0);
                    } else {
                        item.codigoBarras = [];
                    }
                    return item;
                });

                resolve(json);
            } catch (err) {
                reject("Erro ao processar o XLSX: " + err.message);
            }
        };
        reader.onerror = (err) => reject("Erro de leitura do arquivo: " + err.message);
        reader.readAsArrayBuffer(file);
    });
}
