const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/renderer/index.tsx',
  target: 'electron-renderer',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: /src/,
        exclude: [/__tests__/, /\.test\.tsx?$/, /\.spec\.tsx?$/],
        use: [{
          loader: 'ts-loader',
          options: {
            onlyCompileBundledFiles: true,
          },
        }],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.ttf$/,
        type: 'asset/resource',
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: 'renderer.js',
    globalObject: 'self',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
    fallback: {
      'path': false,
      'fs': false,
      'crypto': false,
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
    }),
    new webpack.DefinePlugin({
      'global': 'globalThis',
    }),
    new webpack.ProvidePlugin({
      global: 'globalThis',
    }),
    new MonacoWebpackPlugin({
      languages: ['javascript', 'typescript'],
      features: [
        'bracketMatching',
        'clipboard',
        'coreCommands',
        'cursorUndo',
        'find',
        'folding',
        'hover',
        'indentation',
        'inlineCompletions',
        'linesOperations',
        'multicursor',
        'parameterHints',
        'smartSelect',
        'suggest',
        'wordHighlighter',
        'wordOperations',
      ],
    }),
  ],
  node: {
    __dirname: false,
    __filename: false,
    global: true,
  },
};
