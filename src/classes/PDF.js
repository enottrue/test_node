const fs = require('fs');
const PDFDocument = require('pdfkit');
const common = require(global.constant.DIR_HELPERS + 'common');

module.exports = class PDF {
    constructor (token, data, cnf, fontsPath) {
        this.nowPage = 0;
        this.cnf = cnf;
        this.fontsPath = fontsPath;
        this.url = '/' + token + '/creator_receipts/' + data.fileName + '.pdf';

        let filePath = global.constant.DIR_PUBLIC + this.url;
        common.createPath(filePath);

        this.doc = new PDFDocument;
        this.doc.pipe(fs.createWriteStream(filePath));

        for (let deal of data.deals) {
            this.nextPage();
            this.createPage(deal);
        }

        this.doc.end();
    };

    createPage (deal) {
        this.nowRow = 1;
        if (this.nowPage != 1) this.doc.addPage();

        this.writeRow('НОМЕР ЗАКАЗА:').writeRow(deal.title, this.cnf['simple-row-space']).nextRow();
        this.writeRow('ДАТА ЗАКАЗА:').writeRow(new Date(deal.dateCreate).toLocaleString('aa'), this.cnf['simple-row-space']).nextRow();
        if (deal.datePayment)
            this.writeRow('ДАТА ОПЛАТЫ:').writeRow(new Date(deal.datePayment).toLocaleString('aa'), this.cnf['simple-row-space']).nextRow();
        this.writeRow('ФИО ЗАКАЗЧИКА:').writeRow(deal.fio, this.cnf['simple-row-space']).nextRow();

        this.nextRow();

        this.writeRow('ТОВАР', this.cnf['common-margin-left'], true).writeRow('КОЛИЧЕСТВО', this.cnf['table-product-col-head'], true).nextRow();
        for (let product of deal.products)
            this.writeRow(product.name).writeRow(product.count + ' шт', this.cnf['table-product-col']).nextRow();

        this.nextRow();

        this.writeRow('ДОСТАВКА:', this.cnf['common-margin-left'], true).nextRow();
        this.writeRow('ТИП:').writeRow(deal.delivery.name, this.cnf['table-delivery-col']).nextRow();
        if (deal.delivery.price)
            this.writeRow('СТОИМОСТЬ:').writeRow(deal.delivery.price + ' руб', this.cnf['table-delivery-col']).nextRow();

        this.nextRow();

        this.writeRow('КОММЕНТАРИЙ КЛИЕНТА:', this.cnf['common-margin-left'], true).nextRow();
        this.writeRow(deal.comment, this.cnf['common-margin-left']);
    };
    writeRow(text, space = this.cnf['common-margin-left'], bold = false) {
        let topSpace = ((this.nowRow > 1?((this.nowRow-1) * (this.cnf["row"] + this.cnf['row-space']) ) :0) + this.cnf["common-margin-top"]);
        this.doc.font(this.fontsPath + (bold?'_bold':'') + '.ttf').fontSize(this.cnf['font-size']).text(text, space, topSpace);
        return this;
    };
    nextRow() {
        this.nowRow++;
    };
    nextPage() {
        this.nowPage++;
    };
    getUrlFile () {
        return this.url;
    };
};