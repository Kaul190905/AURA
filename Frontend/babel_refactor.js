const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {results.push(file);}
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  if (file.includes('AppContext.ts') || file.includes('theme.ts') || file.includes('data.ts') || file.includes('utils.ts') || file.includes('types.ts')) {return;}

  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('StyleSheet.create')) {return;}

  const out = babel.transformSync(content, {
    presets: ['@babel/preset-typescript', '@babel/preset-react'],
    plugins: [
      function myCustomPlugin(babelCore) {
        const { types: t } = babelCore;
        return {
          visitor: {
            VariableDeclaration(varPath) {
              if (varPath.node.declarations.length === 1) {
                const dec = varPath.node.declarations[0];
                if (t.isIdentifier(dec.id, { name: 'styles' }) && dec.init && t.isCallExpression(dec.init)) {
                  if (t.isMemberExpression(dec.init.callee) && t.isIdentifier(dec.init.callee.object, { name: 'StyleSheet' }) && t.isIdentifier(dec.init.callee.property, { name: 'create' })) {
                    // Turn it into: const useStyles = () => StyleSheet.create(...)
                    const arrowFunc = t.arrowFunctionExpression([], dec.init);
                    const newDec = t.variableDeclaration('const', [
                      t.variableDeclarator(t.identifier('useStyles'), arrowFunc),
                    ]);
                    varPath.replaceWith(newDec);
                  }
                }
              }
            },
            FunctionDeclaration(funcPath) {
              // Inject const styles = useStyles(); at the top of the function
              if (funcPath.node.body && funcPath.node.body.type === 'BlockStatement') {
                // Check if it returns JSX (simplistic check)
                let returnsJSX = false;
                funcPath.traverse({
                  ReturnStatement(retPath) {
                    if (retPath.node.argument && (retPath.node.argument.type === 'JSXElement' || retPath.node.argument.type === 'JSXFragment')) {
                      returnsJSX = true;
                    }
                  },
                });
                if (returnsJSX || funcPath.node.id?.name.endsWith('Screen')) {
                  const inject = t.variableDeclaration('const', [
                    t.variableDeclarator(
                      t.identifier('styles'),
                      t.callExpression(t.identifier('useStyles'), [])
                    ),
                  ]);
                  path.node.body.body.unshift(inject);
                }
              }
            },
          },
        };
      },
    ],
    filename: file,
  });

  if (out && out.code) {
    fs.writeFileSync(file, out.code, 'utf8');
    console.log('Transformed ' + file);
  }
});
