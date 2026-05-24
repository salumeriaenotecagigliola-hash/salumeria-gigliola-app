import ts from "typescript";
import fs from "fs";

const sourceCode = fs.readFileSync("src/components/CustomerInterface.tsx", "utf8");
const sourceFile = ts.createSourceFile("CustomerInterface.tsx", sourceCode, ts.ScriptTarget.Latest, true);

let topLevelVars = [];

function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "CustomerInterface") {
        node.body.statements.forEach(stmt => {
            if (ts.isVariableStatement(stmt)) {
                stmt.declarationList.declarations.forEach(decl => {
                    if (ts.isIdentifier(decl.name)) {
                        topLevelVars.push(decl.name.text);
                    } else if (ts.isArrayBindingPattern(decl.name) || ts.isObjectBindingPattern(decl.name)) {
                        decl.name.elements.forEach(element => {
                            if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
                                topLevelVars.push(element.name.text);
                            }
                        });
                    }
                });
            } else if (ts.isFunctionDeclaration(stmt) && stmt.name) {
                topLevelVars.push(stmt.name.text);
            }
        });
    }
    ts.forEachChild(node, visit);
}

visit(sourceFile);

console.log("Found variables:", topLevelVars.join(","));
fs.writeFileSync("found-vars.txt", topLevelVars.join(","));
