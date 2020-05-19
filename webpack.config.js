var webpack = require('webpack');
var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const config = {
    entry: './hoast360.js',
    output: {
        filename: 'hoast360.bundle.js',
        libraryTarget: 'umd'
    },
    module: {
        rules: [
            {
                enforce: 'pre',
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'eslint-loader',
            },
            {
                test: /\.m?js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    resolve: {
        extensions: ['*', '.js'],
    },
    plugins: [
    ]
};

module.exports = env => {
    const doAnalysis = env.analyze;
    if (doAnalysis)
        config.plugins.push(new BundleAnalyzerPlugin({ analyzerPort: 8123 }));

    return config;
}
