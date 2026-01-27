const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/preload/preload.ts',
  target: 'electron-preload',
  module: {
    rules: [
      {
        test: /\.ts$/,
        include: /src/,
        exclude: [/__tests__/, /\.test\.ts$/, /\.spec\.ts$/],
        use: [{
          loader: 'ts-loader',
          options: {
            onlyCompileBundledFiles: true,
          },
        }],
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist/preload'),
    filename: 'preload.js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};
