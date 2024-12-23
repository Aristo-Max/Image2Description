const webpack = require('webpack');
const { override } = require('customize-cra');

module.exports = override((config) => {
    config.resolve.fallback = {
        "buffer": require.resolve("buffer/"),
        "url": require.resolve("url/"),
        "https": require.resolve("https-browserify"),
        "http": require.resolve("stream-http"),
        "querystring": require.resolve("querystring-es3"),
        "stream": require.resolve("stream-browserify"),
        "os": require.resolve("os-browserify/browser"),
        "path": require.resolve("path-browserify"),
        "util": require.resolve("util/"),
        "crypto": require.resolve("crypto-browserify"),
        "assert": require.resolve("assert/"),
        "fs": false,
        "child_process": false,
        "net": require.resolve("net-browserify"),
        "tls": require.resolve("tls-browserify"),
        "zlib": require.resolve("browserify-zlib"),
        "process": require.resolve("process/browser"),
    };
    config.plugins.push(
        new webpack.ProvidePlugin({
            URL: ['url', 'URL'],
            process: 'process/browser',
        })
    );
    return config;
});