const nodeExternals = require('webpack-node-externals')
const rules = [
  {
    test: /\.css$/,
    use: 'null-loader'
  }
]

module.exports = {
  entry: './app/index.js',
  target: 'node',
  externals: [nodeExternals()],
  output: {
    libraryTarget: 'commonjs',
    path: __dirname + '/dist/tmp',
    filename: 'index.js'
  },
  module: { rules },
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development'
}
