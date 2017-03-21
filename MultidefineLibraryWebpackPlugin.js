'use strict';

const DEFINE_EXPORTS_VALUES = {
  amd: '__WEBPACK_AMD_DEFINE_RESULT__',
  commonjs: 'module.exports'
};

class MultidefineLibraryWebpacklugin {
  constructor (modulesToExpose, options) {
    this.options = Object.assign({
      deprecationMethodName: 'deprecated'
    }, options);

    if (!modulesToExpose) {
      throw new Error('List of modules to expose should be provided');
    }

    if (Array.isArray(modulesToExpose)) {
      modulesToExpose = this._convertArrayToObject(modulesToExpose);
    }

    this.modulesToExpose = modulesToExpose;
  }

  apply (compiler) {
    this.context = compiler.context;
    compiler.plugin('compilation', (compilation, data) => {
      compilation.plugin('after-optimize-modules', (modules) => {
        modules.forEach(this._appendDefine.bind(this));
      });
    });
  }

  _addModuleToList (module, list, namesIndex) {
    if (list[module.path]) {
      throw new Error('Duplicated exposed module path "' + module.path + '"');
    }

    if (namesIndex[module.name]) {
      throw new Error('Conflict on exposed module name "' + module.name + '"');
    }

    if (module.aliases) {
      // We use a temporary index here to avoid touching global names index
      // before we have checked all aliases
      let aliasesIndex = {};

      module.aliases.forEach((alias) => {
        if (namesIndex[alias]) {
          throw new Error('Conflict on exposed module alias "' + alias + '"');
        }

        aliasesIndex[alias] = module.name;
      });

      Object.assign(namesIndex, aliasesIndex);
    }

    namesIndex[module.name] = module.name;

    return Object.assign({}, list, { [module.path]: module });
  }

  _convertArrayToObject (modulesToExpose) {
    const namesIndex = {};
    return modulesToExpose.reduce((modulesList, module) =>
      this._addModuleToList(module, modulesList, namesIndex),
      {});
  }

  _getRelativePath (resource) {
    resource = resource.slice(this.context.length);
    if (resource.startsWith('/')) { resource = resource.slice(1); }

    return resource;
  }

  _appendDefine (module) {
    const modulePath = module.resource && this._getRelativePath(module.resource);
    if (!modulePath) { return; }

    const moduleToExpose = this.modulesToExpose[modulePath];
    if (!moduleToExpose) { return; }

    const isAMD = module._source._value.indexOf('define(') !== -1;
    const isCommonJS = module._source._value.indexOf('module.exports') !== -1 && !isAMD;

    if (!moduleToExpose.type) {
      moduleToExpose.type = isCommonJS ? 'commonjs' : 'amd';
    } else if ((moduleToExpose.type === 'commonjs') !== isCommonJS) {
      console.warn(`Provided module type does not match auto-detection result for module ${moduleToExpose.name}`);
      console.warn('provided', moduleToExpose.type);
      console.warn('detected', isCommonJS ? 'commonjs' : 'amd');
    }

    if (!DEFINE_EXPORTS_VALUES[moduleToExpose.type]) {
      throw new Error(`Unsupported module type "${moduleToExpose.type}"`);
    }

    const deprecationMethodName = this.options.deprecationMethodName;
    let deprecationCall = '';

    if (moduleToExpose.deprecated) {
      let deprecationMsg = `Deprecated module usage: "${moduleToExpose.name}"`;

      deprecationCall += `window.${deprecationMethodName} && ` +
        `window.${deprecationMethodName}('${deprecationMsg}');`;
    }

    module._source._value += `\ndefine('${moduleToExpose.name}', function () {` +
      ` ${deprecationCall}` +
      ` return ${DEFINE_EXPORTS_VALUES[moduleToExpose.type]};` +
      '});\n';

    if (moduleToExpose.aliases) {
      moduleToExpose.aliases.forEach((alias) => {
        const deprecationMsg = `Deprecated module alias "${alias}" used. ` +
          `Please use real module name "${moduleToExpose.name}"`;

        deprecationCall += `window.${deprecationMethodName} && ` +
          `window.${deprecationMethodName}('${deprecationMsg}');`;

        module._source._value += `\ndefine('${alias}', function () {` +
          ` ${deprecationCall}` +
          ` return ${DEFINE_EXPORTS_VALUES[moduleToExpose.type]};` +
          '});\n';
      });
    }
  }
}

module.exports = MultidefineLibraryWebpacklugin;
