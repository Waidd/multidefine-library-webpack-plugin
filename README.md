# Multidefine Library Webpack Plugin

This <s>hack</s> plugin allow webpack 2 to bundle your code to a named amd library with multiple entries in a same asset.

## Requirements

- node >= 6.9.4
- webpack >= 2.2.0

## Installation

```bash
npm install multidefine-library-webpack-plugin --save
```

Or add it to your package.json

## Usage

### Phase 1: config

Add the plugin in your `webpack.config.js`:

```javascript
'use strict';

const MultidefineLibraryWebpackPlugin = require('multidefine-library-webpack-plugin');

module.exports = {
  entry: ['a.js', 'b.js'],
  output: {
    path: './build',
    filename: '[name].js'
  },
  plugins: [
    new MultidefineLibraryWebpackPlugin([{
      path: 'a.js',
      name: 'A'
    }, {
      path: 'b.js',
      name: 'B'
    }])
  ]
};
```

###Phase 2:

???

###Phase 3: profit

Now, you can requirejs your modules:

```javascript
require(['A', 'B'], function (A, B) {
  // A and B are available !
});
```

This plugin support `amd`, `umd` and `commonjs` source module.

## Configuration

### First parameter: modules to expose

The plugin take an array of objects as first parameter. Each object will represent an entry point of your asset:
```json
[{
  path: "a.js", // path to the file that you want to make requireable
  name: "A", // Define name of the module
  [aliases: ["alias1", "alias2"]] // alternate deprecated names exposed for this module
  [deprecated: true/false] // If deprecated, a global method "deprecated" is called is this module is used
}]
```

This plugin can also take an object as parameter. Each key will represent an entry point of your asset:
```json
{
  "a.js": { // path to the file that you want to make requireable 
    name: "A", // Define name of the module
    [aliases: ["alias1", "alias2"]] // alternate deprecated names exposed for this module
    [deprecated: true/false] // If deprecated, a global method "deprecated" is called is this module is used
  }
}
```

### Second parameter: options

The plugin take an options object as second parameter.
```javascript
    new MultidefineLibraryWebpackPlugin(modulesToExpose, {
      deprecationMethodName: 'deprecated' // global method name to call to notify deprecated usage
    })

```
