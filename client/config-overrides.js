const webpack = require('webpack');
const { override } = require('customize-cra');

module.exports = override((config) => {
    // Set up fallbacks for Node.js core modules
    config.resolve.fallback = {
        buffer: require.resolve("buffer"),
        url: require.resolve("url"),
        https: require.resolve("https-browserify"),
        http: require.resolve("stream-http"),
        querystring: require.resolve("querystring-es3"),
        stream: require.resolve("stream-browserify"),
        os: require.resolve("os-browserify/browser"),
        path: require.resolve("path-browserify"),
        util: require.resolve("util"),
        crypto: require.resolve("crypto-browserify"),
        assert: require.resolve("assert"),
        fs: false, // Not available in the browser
        child_process: false, // Not available in the browser
        net: require.resolve("net-browserify"),
        tls: require.resolve("tls-browserify"),
        zlib: require.resolve("browserify-zlib"),
        process: require.resolve("process/browser"),
    };

    // Add alias for process/browser
    config.resolve.alias = {
        ...config.resolve.alias,
        'process/browser': require.resolve('process/browser'),
    };

    // Remove URL from ProvidePlugin
    config.plugins.push(
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer'], // Provide Buffer globally
        })
    );

    return config;
});