var path = require('path');
var webpack = require('webpack');
var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const config = {
    entry: './hoast360.js',
    output: {
        filename: 'hoast360.bundle.js',
        path: path.resolve(__dirname, 'dist'),
        library: {
            type: 'umd'
        }
    },
    module: {
        rules: [
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
        extensions: ['.js'],
        fallback: {
            buffer: require.resolve('buffer/'),
            stream: require.resolve('stream-browserify'),
            string_decoder: require.resolve('string_decoder/')
        }
    },
    plugins: [
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer']
        })
    ]
};

module.exports = env => {
    const doAnalysis = env.analyze;
    if (doAnalysis)
        config.plugins.push(new BundleAnalyzerPlugin({ analyzerPort: 8123 }));

    return config;
}
