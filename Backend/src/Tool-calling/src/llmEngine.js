// This is a simple LLM engine that uses the Google Generative AI API.

import { GoogleGenAI } from '@google/genai';

const client = new GoogleGenAI(); // API key env se lega (.env me GEMINI_API_KEY rakhna)
const modelName = process.env.GENAI_MODEL ?? 'gemini-3.5-flash-lite';

export async function complete(
  systemPrompt,
  history,
  tools,
  functions,
  message
) {
  const geminiTools = [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    },
  ];

  history.push({ role: 'user', parts: [{ text: message }] });

  while (true) {
    const response = await client.models.generateContent({
      model: modelName,
      contents: history,
      config: {
        systemInstruction: systemPrompt,
        tools: geminiTools,
      },
    });

    const reply = response.candidates[0].content;
    const functionCalls = reply.parts?.filter((p) => p.functionCall) || [];

    if (functionCalls.length === 0) {
      history.push(reply);
      return response.text;
    }

    history.push(reply);

    const functionResponses = [];
    for (const part of functionCalls) {
      const call = part.functionCall;
      const result = await functions[call.name](call.args);

      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: {
            result:
              typeof result === 'string' ? result : JSON.stringify(result),
          },
        },
      });
    }

    history.push({ role: 'user', parts: functionResponses });
  }
}
