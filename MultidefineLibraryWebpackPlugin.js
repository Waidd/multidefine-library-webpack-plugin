'use strict';

const DEFINE_EXPORTS_VALUES = {
  amd: '__WEBPACK_AMD_DEFINE_RESULT__',
  commonjs: 'module.exports'
};

class MultidefineLibraryWebpacklugin {
  constructor (targets) {
    if (!Array.isArray(targets)) { throw new Error('Array of targets should be provided'); }

    this.targets = targets.reduce((computedTargets, target) => {
      let type = target.type || 'commonjs';
      if (!DEFINE_EXPORTS_VALUES[type]) { throw new Error('Unsupported module type.'); }

      computedTargets[target.path] = {name: target.name, type};
      return computedTargets;
    }, {});
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

    let target = this.targets[modulePath];
    if (!target) { return; }

    module._source._value += `\ndefine('${target.name}', function () { return ${DEFINE_EXPORTS_VALUES[target.type]}; });\n`;
  }
}

module.exports = MultidefineLibraryWebpacklugin;
