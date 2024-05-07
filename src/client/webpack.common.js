const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
    entry: './src/client/threeClient.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif|envmap)$/i,
                type: 'asset/resource',
            },
            {
                test: /\.(glsl|vs|fs|vert|frag)$/,
                use: [
                  'raw-loader',
                ]
            }
        ],
    },
    resolve: {
        alias: {
            three: path.resolve('./node_modules/three'),
            "three-gpu-pathtracer": path.resolve('./node_modules/three-gpu-pathtracer'),
            "three-mesh-bvh": path.resolve('./node_modules/three-mesh-bvh')
        },
        extensions: ['.tsx', '.ts', '.js'],
        fallback: { 
            "fs": false,
            "path": false 
        }
    },
    output: {
        filename: '[id].bundle.js',
        path: path.resolve(__dirname, '../../dist/client'),
    },
    plugins:
    [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.resolve('./node_modules/roomle-core-hsc/wasm_modern/ConfiguratorKernel.wasm'),
                    to: '.',
                },
            ]
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.resolve('./node_modules/three/examples/jsm/libs/draco/'),
                    to: './draco',
                },
            ]
        }),
    ],
};