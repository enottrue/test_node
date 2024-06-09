const fs = require('fs');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

var cfg = new Promise((res) => {
    fs.readdir(__dirname + '/src/views', (err, items) => {
        let cfg = [];
        items.forEach((item) => {
            if (fs.existsSync(__dirname + '/src/views/' + item + "/dist/main.js"))
                cfg.push({
                    mode: 'development',
                    entry: __dirname + '/src/views/' + item + "/dist/main.js",
                    output: {
                        path: __dirname + "/public/" + item,
                        filename: "bundle.js"
                    },
                    module: {
                        rules: [
                            {
                                test: /\.s[ac]ss$/i,
                                use: [
                                    'style-loader',
                                    'css-loader',
                                    'sass-loader',
                                ],
                            },
                        ],
                    }
                });
        });

        res(cfg);
    });
});

module.exports = cfg;