'use strict';

const EXPORTS_VALUES_BY_DEFINITION = {
  amd: '__WEBPACK_AMD_DEFINE_RESULT__',
  commonjs: 'module.exports'
};

const DEFINE_PATTERN = (name, definition, extra) =>
`\n\ndefine('${name}', function () {\n` +
  extra +
` return ${EXPORTS_VALUES_BY_DEFINITION[definition]};
});`;

const DEPRECATION_PATTERN = (methodName, message) =>
`\twindow.${methodName} && window.${methodName}('${message}');\n`;

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
      compilation.plugin('succeed-module', (module) => {
        const modulePath = module.resource && this._getRelativePath(module.resource);
        if (!modulePath) { return; }

        const moduleToExpose = this.modulesToExpose[modulePath];
        if (!moduleToExpose) { return; }

        moduleToExpose.definition = this._detectModuleDefinition(module);

        this._appendDefine(module, moduleToExpose);
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

  _detectModuleDefinition (module) {
    let isAMD = module.dependencies.some((dependency) => dependency.constructor.name === 'AMDDefineDependency');
    return isAMD ? 'amd' : 'commonjs';
  }

  _prepareStatement (moduleToExpose, name) {
    let extra = '';

    if (moduleToExpose.deprecated) {
      let deprecationMessage = `Deprecated module usage: "${name}"`;
      extra += DEPRECATION_PATTERN(this.options.deprecationMethodName, deprecationMessage);
    } else if (moduleToExpose.name !== name) {
      let deprecationMessage = `Deprecated module alias "${name}" used. Please use real module name "${moduleToExpose.name}"`;
      extra += DEPRECATION_PATTERN(this.options.deprecationMethodName, deprecationMessage);
    }

    return DEFINE_PATTERN(name, moduleToExpose.definition, extra);
  }

  _appendDefine (module, moduleToExpose) {
    let appendix = [];

    appendix.push(this._prepareStatement(moduleToExpose, moduleToExpose.name));

    if (moduleToExpose.aliases) {
      moduleToExpose.aliases.forEach((alias) => {
        appendix.push(this._prepareStatement(moduleToExpose, alias));
      });
    }

    module._source._value += appendix.join('');
  }
}

module.exports = MultidefineLibraryWebpacklugin;
