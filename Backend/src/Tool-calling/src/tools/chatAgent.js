//basic opetaions: add, subtract, multiply, divide, mod, power

import { complete } from './llmEngine.js';
const chatHistory = [];

const chatSystemPrompt = `You are a helpful AI assistant with access to external tools.

Follow these rules:
1. For arithmetic calculations, ALWAYS use the calculator tool.
2. Always use calculator tool for even trivial calculation
3. For current weather, ALWAYS use the currentWeather tool.
4. For currency conversion or exchange rates, ALWAYS use the convertCurrency tool.
5. You may call multiple tools when solving a multi-step request.
6. CRITICAL: When returning calculation results, ONLY output the raw final number. Do not add any extra sentences, explanations, or LaTeX formatting.
7. Never invent current weather or exchange-rate information.`;

function calculate({ operation, a, b }) {
  console.log(`Calculator tool called: ${a} ${operation} ${b}`);

  try {
    // Agar number normal limits me hai (ya decimal hai), toh normal Number use karo
    if (
      Math.abs(Number(a)) < Number.MAX_SAFE_INTEGER &&
      Math.abs(Number(b)) < Number.MAX_SAFE_INTEGER &&
      (String(a).includes('.') || String(b).includes('.'))
    ) {
      const numA = Number(a);
      const numB = Number(b);
      if (operation === 'add') return String(numA + numB);
      if (operation === 'subtract') return String(numA - numB);
      if (operation === 'multiply') return String(numA * numB);
      if (operation === 'divide')
        return numB === 0 ? 'Error: Cannot divide by 0' : String(numA / numB);
      if (operation === 'mod')
        return numB === 0
          ? 'Error: Cannot calculate mod by 0'
          : String(numA % numB);
      if (operation === 'power') return String(numA ** numB);
    }

    // Warna bohot bade numbers ke liye safely BigInt use karo
    const numA = BigInt(Math.floor(Number(a) || a));
    const numB = BigInt(Math.floor(Number(b) || b));

    if (operation === 'add') return String(numA + numB);
    if (operation === 'subtract') return String(numA - numB);
    if (operation === 'multiply') return String(numA * numB);
    if (operation === 'divide')
      return numB === 0n ? 'Error: Cannot divide by 0' : String(numA / numB);
    if (operation === 'mod')
      return numB === 0n ? 'Error: Cannot mod by 0' : String(numA % numB);
    if (operation === 'power') return String(numA ** numB);

    return `Error: Unsupported operation ${operation}`;
  } catch (error) {
    return `Error in calculation: ${error.message}`;
  }
}

// Current weather tool
async function currentWeather({ city }) {
  console.log('Weather tool called for:', city);
  const url = new URL('https://api.weatherapi.com/v1/current.json');
  url.searchParams.set('key', process.env.WEATHER_API_KEY);
  url.searchParams.set('q', city);
  const response = await fetch(url);

  if (!response.ok) {
    return `Error: Could not find weather for ${city}. API response: ${await response.text()}`;
  }
  return response.text();
}

// Currency exchange tool
async function getExchangeRate({ from, to }) {
  console.log('Currency Exchange tool called');
  const response = await fetch(
    `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(from)}/${encodeURIComponent(to)}`
  );
  if (!response.ok) throw new Error(await response.text());
  return response.text();
}

// Tool definitions
const chatTools = [
  {
    type: 'function',
    function: {
      name: 'calculate',
      description:
        'Performs arithmetic calculations. Supported operations: add, subtract, multiply, divide, mod, power.',
      parameters: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            description:
              'Operation: add, subtract, multiply, divide, mod, power',
          },
          a: { type: 'string', description: 'First number' },
          b: { type: 'string', description: 'Second number' },
        },
        required: ['operation', 'a', 'b'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'currentWeather',
      description: 'Get the current weather of a city.',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'Name of the city' },
        },
        required: ['city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getExchangeRate',
      description: 'Gets the latest exchange rate between two currencies.',
      parameters: {
        type: 'object',
        properties: {
          from: {
            type: 'string',
            description: 'Source currency code, for example USD',
          },
          to: {
            type: 'string',
            description: 'Target currency code, for example INR',
          },
        },
        required: ['from', 'to'],
      },
    },
  },
];

export async function chat(message) {
  // isko export karna mat bhulna
  return complete(
    chatSystemPrompt,
    chatHistory,
    chatTools,
    { calculate, currentWeather, getExchangeRate },
    message
  );
}
