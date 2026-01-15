/**
 * Generiert VitePress Example-Dateien aus TSDoc @example Blöcken in Testdateien
 *
 * Usage: npx tsx scripts/generate-examples.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Example {
  description: string;
  code: string;
  testName: string;
  sectionName: string;
}

interface Section {
  name: string;
  description: string;
  examples: Example[];
}

/**
 * Extrahiert TSDoc-Kommentare und @example Blöcke aus einer Datei
 */
function extractExamples(filePath: string): Section[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sections: Section[] = [];

  // Regex für JSDoc/TSDoc Kommentare
  const commentRegex = /\/\*\*[\s\S]*?\*\//g;
  const comments = content.match(commentRegex) || [];

  let currentSection: Section | null = null;

  for (const comment of comments) {
    // @description extrahieren
    const descMatch = comment.match(/@description\s+([\s\S]*?)(?=@|\*\/)/);
    const description = descMatch
      ? descMatch[1].replace(/\s*\*\s*/g, ' ').trim()
      : '';

    // @example Blöcke extrahieren
    const exampleMatches = comment.matchAll(/@example\s*\n\s*\*\s*```typescript\n([\s\S]*?)```/g);

    const examples: string[] = [];
    for (const match of exampleMatches) {
      // Entferne die führenden " * " von jeder Zeile
      const code = match[1]
        .split('\n')
        .map(line => line.replace(/^\s*\*\s?/, ''))
        .join('\n')
        .trim();
      examples.push(code);
    }

    // Prüfe ob es ein describe() oder it() Block folgt
    const afterComment = content.slice(content.indexOf(comment) + comment.length, content.indexOf(comment) + comment.length + 200);

    const describeMatch = afterComment.match(/describe\s*\(\s*['"`]([^'"`]+)['"`]/);
    const itMatch = afterComment.match(/it\s*\(\s*['"`]([^'"`]+)['"`]/);

    if (describeMatch && description) {
      currentSection = {
        name: describeMatch[1],
        description: description,
        examples: []
      };
      sections.push(currentSection);

      // Füge describe-level examples hinzu
      for (const code of examples) {
        currentSection.examples.push({
          description: description,
          code: code,
          testName: '',
          sectionName: describeMatch[1]
        });
      }
    } else if (itMatch && currentSection && examples.length > 0) {
      for (const code of examples) {
        currentSection.examples.push({
          description: description,
          code: code,
          testName: itMatch[1],
          sectionName: currentSection.name
        });
      }
    }
  }

  return sections;
}

/**
 * Generiert Markdown aus den extrahierten Sections
 */
function generateMarkdown(sections: Section[], title: string): string {
  let md = `# ${title}\n\n`;

  for (const section of sections) {
    md += `## ${section.name}\n\n`;

    if (section.description) {
      md += `${section.description}\n\n`;
    }

    for (const example of section.examples) {
      if (example.testName) {
        md += `### ${example.testName}\n\n`;
      }
      if (example.description && example.testName) {
        md += `${example.description}\n\n`;
      }
      md += '```typescript\n';
      md += example.code;
      md += '\n```\n\n';
    }
  }

  return md;
}

/**
 * Hauptfunktion
 */
function main() {
  const testsDir = path.join(__dirname, '..', 'tests');
  const docsDir = path.join(__dirname, '..', 'docs', 'examples');

  // Erstelle docs/examples Verzeichnis
  fs.mkdirSync(docsDir, { recursive: true });

  // Finde alle Test-Dateien
  const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.ts'));

  console.log('Gefundene Test-Dateien:', testFiles);

  for (const testFile of testFiles) {
    const filePath = path.join(testsDir, testFile);
    const sections = extractExamples(filePath);

    if (sections.length === 0) {
      console.log(`  ${testFile}: Keine @example Blöcke gefunden`);
      continue;
    }

    // Generiere Markdown
    const baseName = testFile.replace('.test.ts', '');
    const title = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    const markdown = generateMarkdown(sections, title);

    // Schreibe Datei
    const outPath = path.join(docsDir, `${baseName}.md`);
    fs.writeFileSync(outPath, markdown);
    console.log(`  ${testFile} -> ${baseName}.md (${sections.length} sections, ${sections.reduce((a, s) => a + s.examples.length, 0)} examples)`);
  }

  // Generiere Index
  const indexContent = `# Examples

Diese Beispiele wurden automatisch aus den TSDoc-Kommentaren der Testdateien generiert.

## Verfügbare Beispiele

${testFiles
  .map(f => f.replace('.test.ts', ''))
  .map(name => `- [${name.charAt(0).toUpperCase() + name.slice(1)}](./${name})`)
  .join('\n')}
`;

  fs.writeFileSync(path.join(docsDir, 'index.md'), indexContent);
  console.log('\nIndex generiert: docs/examples/index.md');
}

main();
