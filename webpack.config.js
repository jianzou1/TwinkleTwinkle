const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  // 获取所有页面文件名
  const pagesDir = path.resolve(__dirname, 'ejs/pages');
  const pageFiles = fs.readdirSync(pagesDir).filter(file => file.endsWith('.ejs'));
  const pageNames = pageFiles.map(file => path.basename(file, '.ejs'));


  // 为每个页面生成 HtmlWebpackPlugin 实例
  const htmlPlugins = pageNames.map(page => {
    const outputDir = page === 'index' ? '' : 'page';
    const templatePath = path.resolve(pagesDir, `${page}.ejs`);

    return new HtmlWebpackPlugin({
      filename: path.join(outputDir, `${page}.html`),
      template: templatePath,
      templateParameters: (compilation, assets, options) => {
        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        return {
          htmlWebpackPlugin: {
            tags: assets.tags,
            files: assets.files,
            options: options
          },
          titleId: `${page}_title`
        };
      },
      minify: isProduction ? {
        collapseWhitespace: true,
        removeComments: true
      } : false,
    });
  });

  return {
    entry: './js/index.js',
    output: {
      filename: 'main.js',
      path: path.resolve(__dirname, ''),
      publicPath: '/',
      // 禁用默认的资源处理
      assetModuleFilename: '[file]' 
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            {
              loader: 'css-loader',
              options: {
                // 禁用url解析
                url: false 
              }
            }
          ]
        },
        {
          // 匹配需要忽略的资源类型
          test: /\.(html|webmanifest)$/i,
          // 禁用资源处理
          type: 'javascript/auto',
          use: []
        },
        {
          test: /\.(png|jpe?g|gif|svg|webp|avif|webmanifest)$/i,
          // 阻止Webpack处理这些资源
          type: 'javascript/auto',
          use: []
        },
        {
          test: /\.ejs$/,
          use: {
            loader: 'html-loader',
            options: {
              preprocessor: (content, loaderContext) => {
                try {
                  return ejs.render(content, {
                    titleId: `${path.basename(loaderContext.resourcePath, '.ejs')}_title`
                  }, {
                    filename: loaderContext.resourcePath,
                    root: path.resolve(__dirname, 'ejs')
                  });
                } catch (error) {
                  loaderContext.emitError(error);
                  return content;
                }
              },
              // 禁用资源处理
              sources: false 
            }
          }
        }
      ]
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'styles.css',
        chunkFilename: '[id].css'
      }),
      ...htmlPlugins
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, ''),
        // 保留静态资源目录结构
        staticOptions: {
          watch: true
        }
      },
      hot: true,
      open: true,
      // 监听静态资源变化
      watchFiles: [
        path.resolve(__dirname, 'ejs/**/*.ejs'),
        path.resolve(__dirname, 'static/**/*')
      ]
    },
    mode: isProduction ? 'production' : 'development',
    optimization: {
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            compress: {
              drop_console: true
            }
          }
        }),
        new CssMinimizerPlugin()
      ]
    },
    // 完全禁用资源处理
    performance: {
      hints: false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    }
  };
};