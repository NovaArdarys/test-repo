// generateRelations.ts - Final Version
import fs from 'fs';
import path from 'path';
import * as ts from 'typescript';

interface ColumnInfo {
  key: string;
  type: string;
  enum?: string;
}

interface RelationInfo {
  type: 'hasMany' | 'hasOne' | 'belongsTo';
  foreignKey: string;
  references: string;
}

interface TableOutput {
  columns: Record<string, ColumnInfo>;
  relations: Record<string, RelationInfo>;
}

type RelationsOutput = Record<string, TableOutput>;

// ========== EDIT CONFIG DI SINI ==========
const CONFIG = {
  relationsFile: './relations.ts',  // Path ke file relations Anda
  schemaPattern: '../*.schema.ts',         // Pattern untuk schema files
  outputFile: 'relations-output.json'
};
// =========================================

console.log('🚀 Starting relation extraction...\n');

// Parse relations file
function parseRelationsFile(filePath: string): { output: RelationsOutput, tableMapping: Record<string, string>; } {
  console.log('📖 Step 1: Parsing relations file...');
  console.log(`   File: ${filePath}\n`);

  const sourceCode = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);

  const result: RelationsOutput = {};
  const tableMapping: Record<string, string> = {};

  function visit(node: ts.Node) {
    if (ts.isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0];
      if (declaration && ts.isVariableDeclaration(declaration)) {
        const name = declaration.name.getText(sourceFile);

        if (name.endsWith('Relations')) {
          const tableName = name.replace('Relations', '');

          if (!result[tableName]) {
            result[tableName] = { columns: {}, relations: {} };
          }

          if (declaration.initializer && ts.isCallExpression(declaration.initializer)) {
            const args = declaration.initializer.arguments;
            if (args.length >= 2) {
              const tableRef = args[0].getText(sourceFile);
              tableMapping[tableName] = tableRef;

              const arrowFunc = args[1];
              if (ts.isArrowFunction(arrowFunc) && ts.isParenthesizedExpression(arrowFunc.body)) {
                const objLiteral = arrowFunc.body.expression;
                if (ts.isObjectLiteralExpression(objLiteral)) {
                  result[tableName].relations = parseRelations(objLiteral, tableName, sourceFile);
                }
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  function parseRelations(obj: ts.ObjectLiteralExpression, tableName: string, sourceFile: ts.SourceFile): Record<string, RelationInfo> {
    const relations: Record<string, RelationInfo> = {};

    obj.properties.forEach((prop) => {
      if (ts.isPropertyAssignment(prop)) {
        const relationName = prop.name.getText(sourceFile);
        const initializer = prop.initializer;

        if (ts.isCallExpression(initializer)) {
          const funcName = initializer.expression.getText(sourceFile);
          const args = initializer.arguments;

          if (funcName === 'one' && args.length >= 2) {
            const refTable = args[0].getText(sourceFile);
            const config = args[1];

            if (ts.isObjectLiteralExpression(config)) {
              let foreignKey = '';
              let refColumn = 'id';

              config.properties.forEach((configProp) => {
                if (ts.isPropertyAssignment(configProp)) {
                  const propName = configProp.name.getText(sourceFile);

                  if (propName === 'fields' && ts.isArrayLiteralExpression(configProp.initializer)) {
                    const fieldExpr = configProp.initializer.elements[0]?.getText(sourceFile);
                    const match = fieldExpr?.match(/\.(\w+)/);
                    foreignKey = match ? match[1] : '';
                  }

                  if (propName === 'references' && ts.isArrayLiteralExpression(configProp.initializer)) {
                    const refExpr = configProp.initializer.elements[0]?.getText(sourceFile);
                    const match = refExpr?.match(/\.(\w+)/);
                    refColumn = match ? match[1] : 'id';
                  }
                }
              });

              relations[relationName] = {
                type: 'belongsTo',
                foreignKey: foreignKey || relationName + 'Id',
                references: `${refTable}.${refColumn}`,
              };
            }
          } else if (funcName === 'many' && args.length >= 1) {
            const refTable = args[0].getText(sourceFile);
            relations[relationName] = {
              type: 'hasMany',
              foreignKey: `${tableName}Id`,
              references: `${tableName}.id`,
            };
          }
        }
      }
    });

    return relations;
  }

  visit(sourceFile);

  console.log(`   ✅ Found ${Object.keys(result).length} relation definitions`);
  console.log(`   ✅ Created ${Object.keys(tableMapping).length} table mappings\n`);

  return { output: result, tableMapping };
}

// Parse schema file
function parseSchemaFile(filePath: string): { tableName: string, columns: Record<string, ColumnInfo>; } | null {
  const sourceCode = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);

  let detectedTableName: string | null = null;
  const columns: Record<string, ColumnInfo> = {};

  function visit(node: ts.Node) {
    if (ts.isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0];
      if (declaration && ts.isVariableDeclaration(declaration)) {
        const varName = declaration.name.getText(sourceFile);

        if (declaration.initializer && ts.isCallExpression(declaration.initializer)) {
          const funcName = declaration.initializer.expression.getText(sourceFile);

          if (funcName === 'pgTable') {
            detectedTableName = varName;
            const args = declaration.initializer.arguments;
            if (args.length >= 2 && ts.isObjectLiteralExpression(args[1])) {
              parseColumns(args[1], sourceFile, columns);
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  function parseColumns(obj: ts.ObjectLiteralExpression, sourceFile: ts.SourceFile, columns: Record<string, ColumnInfo>) {
    obj.properties.forEach((prop) => {
      if (ts.isPropertyAssignment(prop)) {
        const columnKey = prop.name.getText(sourceFile);
        const initializer = prop.initializer;

        if (ts.isCallExpression(initializer)) {
          const typeFunc = initializer.expression.getText(sourceFile);
          let baseType = typeFunc;
          let enumName: string | undefined;

          // Detect enum pattern
          if (typeFunc.match(/Enum$/) || typeFunc.match(/enum$/i)) {
            enumName = typeFunc;
            baseType = 'enum';
          } else if (typeFunc.includes('.')) {
            baseType = typeFunc.split('.').pop() || typeFunc;
          }

          const columnInfo: ColumnInfo = { key: columnKey, type: baseType };
          if (enumName) columnInfo.enum = enumName;

          columns[columnKey] = columnInfo;
        }
      }
    });
  }

  visit(sourceFile);
  return detectedTableName ? { tableName: detectedTableName, columns } : null;
}

// Find schema files
function findSchemaFiles(pattern: string): string[] {
  const dirPath = path.dirname(pattern);
  const dir = dirPath === '.' ? process.cwd() : path.resolve(dirPath);

  try {
    const files = fs.readdirSync(dir);
    return files
      .filter(file => file.endsWith('.schema.ts'))
      .map(file => path.join(dirPath, file));
  } catch (error) {
    console.error(`❌ Error reading directory: ${dir}`);
    return [];
  }
}

// Main execution
const { output, tableMapping } = parseRelationsFile(CONFIG.relationsFile);

console.log('📖 Step 2: Finding schema files...\n');
const schemaFiles = findSchemaFiles(CONFIG.schemaPattern);

if (schemaFiles.length === 0) {
  console.warn('⚠️  No schema files found!');
  console.warn(`   Pattern: ${CONFIG.schemaPattern}`);
  console.warn(`   Directory: ${path.dirname(CONFIG.schemaPattern)}\n`);
} else {
  console.log(`   ✅ Found ${schemaFiles.length} schema file(s)\n`);
}

console.log('📖 Step 3: Parsing schemas and merging...\n');

let matched = 0;
let unmatched = 0;

schemaFiles.forEach(schemaFile => {
  const fileName = path.basename(schemaFile);
  const schemaData = parseSchemaFile(schemaFile);

  if (schemaData) {
    const { tableName, columns } = schemaData;
    const relationName = Object.entries(tableMapping).find(([_, schemaVar]) => schemaVar === tableName)?.[0];

    if (relationName) {
      output[relationName].columns = columns;
      const enumCount = Object.values(columns).filter(c => c.enum).length;
      console.log(`   ✅ ${fileName}: ${tableName} → ${relationName} (${Object.keys(columns).length} cols${enumCount > 0 ? `, ${enumCount} enums` : ''})`);
      matched++;
    } else {
      output[tableName] = { columns, relations: {} };
      console.log(`   ℹ️  ${fileName}: ${tableName} (no relation)`);
      unmatched++;
    }
  }
});

// Save output
const jsonOutput = JSON.stringify(output, null, 2);
fs.writeFileSync(CONFIG.outputFile, jsonOutput);

console.log('\n' + '='.repeat(60));
console.log('✅ Complete!\n');
console.log(`📊 Summary:`);
console.log(`   Relations defined: ${Object.keys(tableMapping).length}`);
console.log(`   Schemas found: ${schemaFiles.length}`);
console.log(`   Matched: ${matched}`);
console.log(`   Unmatched: ${unmatched}`);
console.log(`   Total in output: ${Object.keys(output).length}`);
console.log(`\n💾 Saved to: ${CONFIG.outputFile}`);
console.log(`📏 Size: ${(jsonOutput.length / 1024).toFixed(2)} KB\n`);