'use strict';

const DEFINE_EXPORTS_VALUES = {
  amd: '__WEBPACK_AMD_DEFINE_RESULT__',
  commonjs: 'module.exports'
};

class MultidefineLibraryWebpacklugin {
  constructor (exposeList) {
    if (!exposeList) {
      throw new Error('List of modules to expose should be provided');
    }

    if (Array.isArray(exposeList)) {
      let namesIndex = {};
      this.exposeList = exposeList.reduce((computedList, module) => {
        if (computedList[module.path]) {
          throw new Error('Duplicated exposed module path "' + module.path + '"');
        }

        if (namesIndex[module.name]) {
          throw new Error('Conflict on exposed module name "' + module.name + '"');
        }

        namesIndex[module.name] = module.name;
        computedList[module.path] = {
          name: module.name,
          type: module.type
        };
        return computedList;
      }, {});
    }
  }

  apply (compiler) {
    this.context = compiler.context;
    compiler.plugin('compilation', (compilation, data) => {
      compilation.plugin('after-optimize-modules', (modules) => {
        modules.forEach(this._appendDefine.bind(this));
      });
    });
  }

  _getRelativePath (resource) {
    resource = resource.slice(this.context.length);
    if (resource.startsWith('/')) { resource = resource.slice(1); }

    return resource;
  }

  _appendDefine (module) {
    let modulePath = module.resource && this._getRelativePath(module.resource);
    if (!modulePath) { return; }

    let expose = this.exposeList[modulePath];
    if (!expose) { return; }

    let isAMD = module._source._value.indexOf('define(') !== -1;
    let isCommonJS = module._source._value.indexOf('module.exports') !== -1 && !isAMD;

    if (!expose.type) {
      expose.type = isCommonJS ? 'commonjs' : 'amd';
    } else if ((expose.type === 'commonjs') !== isCommonJS) {
      console.warn(`Provided module type does not match auto-detection result for module ${expose.name}`);
      console.warn('provided', expose.type);
      console.warn('detected', isCommonJS ? 'commonjs' : 'amd');
    }

    if (!DEFINE_EXPORTS_VALUES[expose.type]) {
      throw new Error(`Unsupported module type "${expose.type}"`);
    }

    module._source._value += `\ndefine('${expose.name}', function () { return ${DEFINE_EXPORTS_VALUES[expose.type]}; });\n`;
  }
}

module.exports = MultidefineLibraryWebpacklugin;
