const cors = require('cors');
const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const SYSTEM_PROMPT = `You are a customer-support executive for our electronics e-commerce app named GizmoCart.
Your job is to identify the customer's main problem and urgency. 
Answer them related to their query.
Use professional language. 
If the user has an issue, use words like "I understand your frustration", "I am really sorry for your trouble" etc.
Do not answer any other question which is not related to order tracking, refund queries, product warranty, or return policy.`;

const app = express();
const client = new GoogleGenAI();
const model = process.env.GENAI_MODEL ?? 'gemini-3.5-flash-lite';

const history = [];

let historyQueue = Promise.resolve();
function useHistory(operation) {
  const result = historyQueue.then(operation);
  historyQueue = result.catch(() => {});
  return result;
}

app.use(cors());
app.use(express.text({ type: '*/*' }));

app.post('/api/chat', async (req, res, next) => {
  if (typeof req.body !== 'string') {
    res.status(400).type('text/plain').send('Request body must be text');
    return;
  }

  try {
    const answer = await useHistory(async () => {
      const userMessage = { role: 'user', parts: [{ text: req.body }] };

      const apiResponse = await client.models.generateContent({
        model: model,
        contents: [...history, userMessage],
        config: {
          systemInstruction: SYSTEM_PROMPT,
        },
      });

      const replyText = apiResponse.text;

      history.push(userMessage);
      history.push({ role: 'model', parts: [{ text: replyText }] });

      return replyText;
    });

    res.type('text/plain').send(answer);
  } catch (error) {
    next(error);
  }
});

app.delete('/api', async (_req, res, next) => {
  try {
    await useHistory(async () => {
      history.length = 0;
    });
    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).type('text/plain').send('Unable to process the chat request');
});

// Exporting the app using CommonJS syntax
module.exports = app;
