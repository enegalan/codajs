const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/main/main.ts',
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
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'main.js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@main': path.resolve(__dirname, 'src/main'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@runtimes': path.resolve(__dirname, 'src/runtimes'),
      '@execution': path.resolve(__dirname, 'src/execution'),
      '@vfs': path.resolve(__dirname, 'src/vfs'),
      '@dependencies': path.resolve(__dirname, 'src/dependencies'),
      '@inspector': path.resolve(__dirname, 'src/inspector'),
    },
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  externals: {
    'isolated-vm': 'commonjs isolated-vm',
  },
  ignoreWarnings: [
    {
      module: /isolated-vm/,
    },
  ],
};
