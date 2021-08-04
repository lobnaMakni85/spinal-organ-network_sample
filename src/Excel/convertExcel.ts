import * as Excel from "exceljs";

export default class ConvertExcel {

    private workbook: Excel.Workbook;

    constructor(headerRow: number = 1) {
        this.workbook = new Excel.Workbook();

    }

    public async toJson(data: any, headerRow: number = 1): Promise<any> {
        await this.workbook.xlsx.load(data);
        let result = {}

        this.workbook.eachSheet((sheet) => {

            let begin = headerRow + 1;
            const end = sheet.rowCount;

            result[sheet.name] = [];

            let headers = this._getHeaders(sheet, headerRow);

            for (; begin <= end; begin++) {
                let res = {};

                headers.forEach(header => {
                    res[header] = this._getValueByColumnHeader(sheet, begin, headers, header);
                })

                result[sheet.name].push(res);
            }

        })

        return result;
    }

    private _getHeaders(sheet: any, headerRow: number = 1) {
        let result: string[] = [];
        // let index = 1;

        let row = sheet.getRow(headerRow);

        if (row === null || !row.values || !row.values.length) return [];

        for (let i: number = 1; i < row.values.length; i++) {
            let cell = row.getCell(i);
            result.push(cell.text);
        }
        return result;
    }

    private _getValueByColumnHeader(sheet, rowNumber: number, headers: Array<string>, header: string) {
        let row = sheet.getRow(rowNumber);
        let result: Excel.Cell | undefined;

        row.eachCell(function (cell: Excel.Cell, colNumber: number) {
            let fetchedHeader: string = headers[colNumber - 1];
            if (fetchedHeader && header && fetchedHeader.toLowerCase().trim() === header.toLowerCase().trim()) {
                result = cell;
            }
        });

        return result ? result.value : "";
    }

    public async configurationToJson(data: any, headerRow): Promise<any> {
        await this.workbook.xlsx.load(data);

        let result = {}

        this.workbook.eachSheet((sheet) => {

            let begin = headerRow + 1;
            const end = sheet.rowCount;

            result[sheet.name] = [];

            let headers = this._getHeaders(sheet, headerRow);

            for (; begin <= end; begin++) {
                let res = {};

                headers.forEach(header => {
                    res[header] = this._getValueByColumnHeader(sheet, begin, headers, header);
                })

                // const firstConfHeader = this._getHeaders(sheet, 1);

                // firstConfHeader.forEach(el => {
                //     res[el] = this._getValueByColumnHeader(sheet, 2, firstConfHeader, el);
                // })

                for (let index = 1; index <= 3; index++) {
                    const header = this._getHeaders(sheet, index);

                    console.log("header", header);

                    const key = header[0].replace(":", "").trim();
                    const value = header[1];
                    res[key] = value;
                }

                result[sheet.name].push(res);
            }



        })

        return result;
    }

}