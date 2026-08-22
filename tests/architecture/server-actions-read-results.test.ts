import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Server actions that perform writes must check their results.
 * 
 * Dropping the result hides rejections inside what appears to be a successful
 * page reload. This has bitten us multiple times.
 */

// Actions that genuinely have no meaningful result to check.
const WHITELIST: Record<string, string> = {
  // Disconnect removes the token and that's it. There's no status to branch on.
  'app/api/auth/battlegrid/disconnect/route.ts': 'app.disconnect.execute',
};

function findDroppedWrites(dir: string): Array<{ file: string; statement: string }> {
  const dropped: Array<{ file: string; statement: string }> = [];

  function walkDir(currentDir: string) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
        checkFile(fullPath);
      }
    }
  }

  function checkFile(fullPath: string) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const sourceFile = ts.createSourceFile(fullPath, content, ts.ScriptTarget.Latest, true);
    
    // Normalize path to posix for whitelist checking
    const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');

    function walkAst(node: ts.Node) {
      if (ts.isCallExpression(node)) {
        const expr = node.expression;
        if (ts.isPropertyAccessExpression(expr) && expr.name.text === 'execute') {
          // Check if it's app.<something>.execute
          if (ts.isPropertyAccessExpression(expr.expression) && ts.isIdentifier(expr.expression.expression) && expr.expression.expression.text === 'app') {
            const fullCall = `app.${expr.expression.name.text}.execute`;
            
            // Allow whitelisted calls
            if (WHITELIST[relativePath] === fullCall) return;

            let parent = node.parent;
            if (ts.isAwaitExpression(parent)) {
              parent = parent.parent;
            }
            
            // If the parent is an ExpressionStatement, the value is just dropped.
            if (ts.isExpressionStatement(parent)) {
              dropped.push({
                file: relativePath,
                statement: parent.getText(sourceFile).split('\n')[0].trim()
              });
            }
          }
        }
      }
      ts.forEachChild(node, child => walkAst(child));
    }
    
    walkAst(sourceFile);
  }

  walkDir(dir);
  return dropped;
}

describe('no action may discard a write result', () => {
  it('every app.*.execute call must have its result assigned or branched on', () => {
    const dropped = findDroppedWrites(path.join(process.cwd(), 'app'));
    
    expect(dropped, 'these execute calls drop their results').toEqual([]);
  });
});
