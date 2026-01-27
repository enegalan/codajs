const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/utility/utility.ts',
  target: 'electron-main',
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
    path: path.resolve(__dirname, 'dist/utility'),
    filename: 'utility.js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@utility': path.resolve(__dirname, 'src/utility'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};
