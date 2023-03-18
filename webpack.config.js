const nodeExternals = require('webpack-node-externals')
const rules = [
  {
    test: /\.css$/,
    use: 'null-loader'
  }
]
const acknowledgerConfig = {
  entry: './app/acknowledger/index.js',
  target: 'node',
  externals: [nodeExternals()],
  output: {
    libraryTarget: 'commonjs',
    path: __dirname + '/dist',
    filename: 'acknowledger.js'
  },
  module: { rules },
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development'
};

const botConfig = {
  entry: './app/bot/index.js',
  target: 'node',
  externals: [nodeExternals()],
  output: {
    libraryTarget: 'commonjs',
    path: __dirname + '/dist',
    filename: 'bot.js'
  },
  module: { rules },
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development'
};

module.exports = [
  acknowledgerConfig,
  botConfig,
];
