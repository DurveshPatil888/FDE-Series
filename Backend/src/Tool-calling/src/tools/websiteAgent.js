import fs from 'node:fs/promises';
import path from 'node:path';
import { complete } from './llmEngine.js';

const websiteWorkspace = path.join(process.cwd(), 'generated-sites');
const websiteHistory = [];

const websiteSystemPrompt = `You are an expert frontend website developer.

Your job is to create complete static websites using the available tools.

Follow these rules:
1. Create a separate directory for every website.
2. Create index.html.
3. Create style.css.
4. Create script.js when JavaScript is useful.
5. Build modern, beautiful and responsive websites.
6. Use only HTML, CSS and vanilla JavaScript.
7. Do not just return website code in your response. Actually create the files using tools.
8. After creating the website, list the project files.
9. Read important files again if needed and fix obvious problems.
10. Finish only when the complete website has been created.`;

function tool(name, description, properties) {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: {
        type: 'object',
        properties,
        required: Object.keys(properties),
      },
    },
  };
}
const websiteTools = [
  tool(
    'createDirectory',
    'Creates a new directory inside the website workspace.',
    {
      path: {
        type: 'string',
        description: 'Relative directory path, for example brewlab',
      },
    }
  ),
  tool(
    'writeFile',
    'Creates or overwrites a text file inside the website workspace. Use this to create HTML, CSS and JavaScript files.',
    {
      path: {
        type: 'string',
        description: 'Relative file path, for example brewlab/index.html',
      },
      content: {
        type: 'string',
        description: 'Complete content that should be written into the file',
      },
    }
  ),
  tool(
    'readFile',
    'Reads the contents of an existing file from the website workspace.',
    {
      path: { type: 'string', description: 'Relative file path' },
    }
  ),
  tool(
    'listFiles',
    'Lists all files and directories inside a website project.',
    {
      path: {
        type: 'string',
        description: 'Relative directory path, for example brewlab',
      },
    }
  ),
];

function safePath(relativePath) {
  const resolved = path.resolve(websiteWorkspace, relativePath);
  if (
    resolved !== websiteWorkspace &&
    !resolved.startsWith(`${websiteWorkspace}${path.sep}`)
  ) {
    throw new Error('Access outside generated-sites is not allowed');
  }
  return resolved;
}

async function createDirectory({ path: relativePath }) {
  try {
    await fs.mkdir(safePath(relativePath), { recursive: true });
    return `Directory created successfully: ${relativePath}`;
  } catch (error) {
    return `Failed to create directory: ${error.message}`;
  }
}

async function writeFile({ path: relativePath, content }) {
  try {
    const file = safePath(relativePath);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content, 'utf8');
    return `File written successfully: ${relativePath}`;
  } catch (error) {
    return `Failed to write file: ${error.message}`;
  }
}

async function readFile({ path: relativePath }) {
  try {
    return await fs.readFile(safePath(relativePath), 'utf8');
  } catch (error) {
    return `Failed to read file: ${error.message}`;
  }
}

async function listFiles({ path: relativePath }) {
  try {
    const directory = safePath(relativePath);
    try {
      await fs.access(directory);
    } catch {
      return `Directory does not exist: ${relativePath}`;
    }

    const files = [];
    async function walk(current) {
      for (const entry of await fs.readdir(current, { withFileTypes: true })) {
        const item = path.join(current, entry.name);
        files.push(path.relative(websiteWorkspace, item));
        if (entry.isDirectory()) await walk(item);
      }
    }
    await walk(directory);
    return files.join('\n');
  } catch (error) {
    return `Failed to list files: ${error.message}`;
  }
}

export async function generateWebsite(message) {
  await fs.mkdir(websiteWorkspace, { recursive: true });
  return complete(
    websiteSystemPrompt,
    websiteHistory,
    websiteTools,
    { createDirectory, writeFile, readFile, listFiles },
    message
  );
}
