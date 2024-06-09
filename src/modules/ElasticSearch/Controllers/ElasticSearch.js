'use strict';
const fs = require('fs');
let { Client } = require('@opensearch-project/opensearch');
const path = require('path')
const cnf = require('../config.json');

module.exports = {
    index: async (ctx, next) => {

        let host = '10.0.0.6'; // 'mon.taroirena.ru'; // 'localhost';
        let protocol = 'https';
        let port = 9200;
        let auth = 'telegraf:telegraf'; // For testing only. Don't store credentials in code.
        let ca_certs_path = path.resolve(__dirname, '../cert/cert.pem') // '/full/path/to/root-ca.pem';

        // REMOVE ON PRODUCTION STAGE
        if (cnf.CONSOLE_DEBUG === true) {
            console.log(`*** NEW REQUEST IS ARRIVED`)
            console.log(new Date())
            console.log(ctx.request)

        }

        if (Object.keys(ctx.query).length === 0) {
            console.log(`Query parameter is empty.`)
            return ctx.body = { success: false, status: 'query is not defined' }
        }

        let d = { ...ctx.query }
        if (d['ID']) {
            d['ID'] = Number(d['ID'])
        }
        if (d['AMOUNT']) {
            d['AMOUNT'] = Number(d['AMOUNT'])
        }
        if (d['created_at']) {
            d['created_at'] = d['created_at'].replace(/\./g, '-')
            // .replace(/-/g, 'i');
        }
        if (!d['TYPE']) {
            d['TYPE'] = 'LEAD'
        }

        // d['@timestamp']= new Date().toLocaleString('en-GB', { timeZone: 'Europe/Moscow', hour12: false }).
        //         replace(/T/, ' ').      // replace T with a space
        //         replace(/\..+/, '').
        //         replaceAll(',', '').
        //         replaceAll('/', '-')
        d['@timestamp'] = new Date().toISOString()
        d['@timestamp_date'] = d['@timestamp'].split('T')[0]
        d['@timestamp_time'] = d['@timestamp'].split('T')[1]

        try {
            var client = new Client({
                node: protocol + '://' + auth + '@' + host + ':' + port,
                ssl: {
                    rejectUnauthorized: false,
                    // ca: fs.readFileSync(ca_certs_path),
                    // You can turn off certificate verification (rejectUnauthorized: false) if you're using self-signed certificates with a hostname mismatch.
                    // cert: fs.readFileSync(client_cert_path),
                    // key: fs.readFileSync(client_key_path)
                },
                requestTimeout: 4000
            })



            async function search() {

                // Create an index with non-default settings.
                var index_name = `leads-crm-taroirena-${new Date().getFullYear()}`
                var settings = {
                    "mappings": {
                        "date_detection": true,
                        "dynamic_date_formats": ["date_optional_time"],
                        "properties": {
                            "@timestamp_date": { "type": "date", "format": "YYYY-MM-DD" },
                            "@timestamp": { "type": "date", "format": "date_optional_time" },
                            // "created_at": {
                            //     "type": "timestamp", "format": "DD-MM-YYYY HH:mm:ss"
                            // }
                        }
                    },
                    'settings': {
                        'index': {
                            'number_of_shards': 1,
                            'number_of_replicas': 0
                        },
                    }
                }

                let isIndexExists = await client.transport.request({
                    method: 'HEAD',
                    path: `/${index_name}`,
                    body: null
                })


                if (isIndexExists.statusCode !== 200) {
                    console.log('requesting indices.create')

                    var response = await client.indices.create({
                        index: index_name,
                        body: settings,

                    })
                    // await client.indices.putMapping({
                    //     index: index_name,
                    //     "properties": {
                    //             "@timestamp_date":    { "type": "date", "format": "YYYY-MM-DD" }, 
                    //       }
                    // })
                    console.log('response is got')
                    console.log('Creating index:')
                    console.log(response.body)
                }

                var id = '1'

                let isDocExists = await client.exists({
                    index: index_name,
                    id: id
                })
                // if (isDocExists.statusCode !== 200) {
                //     var document = {
                //         'ID': '123',
                //         'SOURCE': 'Stephen King',
                //         'SOURCE_ANALYTICS': '2018',
                //         'AMOUNT': 'Crime fiction',
                //         'UTM_SOURCE': '123',
                //         'UTM_CAMPAIGN': '456',
                //         'UTM_MEDIUM': '321',
                //         'UTM_CONTENT': '654',
                //         'UTM_TERM': '0000'
                //     }


                //     var response = await client.index({
                //         index: index_name,
                //         body: document,
                //         refresh: true
                //     })

                //     console.log('Adding document:')
                //     console.log(response.body)
                // }


                // Add a document to the index.
                // let log_file = path.resolve(__dirname, '../logs/temp.log')
                // console.log(log_file)

                // //Adding logged entries to the index if they exist
                // fs.exists(log_file, async (exists) => {
                //     if (exists) {
                //         const data = JSON.parse(fs.readFileSync(log_file))
                //         // console.log('LOGS FILE')
                //         // console.log(d)

                //         for (let key in data) {
                //             // console.log(key, data[key])

                //             var response = await client.index({
                //                 index: index_name,
                //                 body: data[key],
                //                 refresh: true
                //             })

                //             // console.log('Adding document:')
                //             // console.log(response.body)
                //         }
                //         fs.unlinkSync(log_file);

                //     }
                //     else {
                //         // Create the directory if it doesn't exist
                //         const dir = path.dirname(log_file);
                //         if (!fs.existsSync(dir)) {
                //             fs.mkdirSync(dir, { recursive: true });
                //         }

                //         // Create the file with an empty array
                //         fs.writeFileSync(log_file, JSON.stringify([]));
                //         console.log('Log file created');
                //     }
                // })

                // Adding current ctx.query to the index
                var response = await client.index({
                    index: index_name,
                    body: d,
                    refresh: true
                })
                // console.log('Adding document:')
                // console.log(response.body)

                // Search for the document.
                var query = {
                    'query': {
                        'match': {
                            'ID': {
                                'query': '123'
                            }
                        }
                    }
                }

                // var response = await client.search({
                //     index: index_name,
                //     body: query
                // })

                // console.log('Search results:')
                // console.log(response.body.hits)

                // Delete the document.
                // var response = await client.delete({
                //     index: index_name,
                //     id: id
                // })

                // console.log('Deleting document:')
                // console.log(response.body)

                // Delete the index.
                // var response = await client.indices.delete({
                //     index: index_name
                // })

                // console.log('Deleting index:')
                // console.log(response.body)
            }

            search().catch(
                (err) => {
                    console.log('Error happens in ES:', err)
                    // console.log(err?.meta || err)

                    if (err.meta.statusCode === null) {
                        console.log(`Remote server is not avaliable`);
                        // let log_path = path.resolve(__dirname, '../logs/temp.log')
                        // console.log('Put arrived data in temporary log file.')

                        // fs.exists(log_path, (exists) => {
                        //     if (!exists) {
                        //         console.log('Create new log file to put data')
                        //         fs.writeFileSync(log_path, JSON.stringify({ 0: d }))
                        //         // console.log(ctx.query)
                        //     }
                        //     else {
                        //         let data = JSON.parse(fs.readFileSync(log_path))
                        //         console.log('Log file already exists, appending data to the file.')
                        //         let new_data = { ...data, [Object.keys(data).length]: d }
                        //         fs.writeFileSync(log_path, JSON.stringify(new_data))
                        //     }
                        // })


                    }
                    else {

                        console.log(err)
                    }
                }
            )
            return ctx.body = {
                'success': true
            }


        } catch (error) {
            console.error('222', error)
        }

    }
}
