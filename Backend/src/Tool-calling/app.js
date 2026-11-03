// import express from 'express';
// import cors from 'cors';
// import { chat } from '../Tool-calling/src/chatAgent.js';
// import { generateWebsite } from '../Tool-calling/src/websiteAgent.js';

// const app = express();

// let historyQueue = Promise.resolve();
// function useQueue(operation) {
//   const result = historyQueue.then(operation);
//   historyQueue = result.catch(() => {});
//   return result;
// }

// app.use(cors());
// app.use(express.text({ type: '*/*' }));

// // 1. Normal Chat & Tools Route
// app.post('/api/chat', async (req, res, next) => {
//   if (typeof req.body !== 'string') return res.status(400).send('Need text');
//   try {
//     const answer = await useQueue(() => chat(req.body));
//     res.type('text/plain').send(answer);
//   } catch (error) {
//     next(error);
//   }
// });

// // 2. Website Builder Route
// app.post('/api/build', async (req, res, next) => {
//   if (typeof req.body !== 'string') return res.status(400).send('Need text');
//   try {
//     const answer = await useQueue(() => generateWebsite(req.body));
//     res.type('text/plain').send(answer);
//   } catch (error) {
//     next(error);
//   }
// });

// app.use((error, _req, res, _next) => {
//   console.error(error);
//   res.status(500).type('text/plain').send('Server par error aagaya bhai');
// });

// // // app.listen apne server.js ya yaha niche add kar lena
// // const PORT = process.env.PORT || 3000;
// // app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// export default app;

import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { chat } from '../Tool-calling/src/chatAgent.js';
import { generateWebsite } from '../Tool-calling/src/websiteAgent.js';

const app = express();
const client = new GoogleGenAI(); // Routing ke liye Gemini init kiya
const modelName = process.env.GENAI_MODEL ?? 'gemini-3.5-flash-lite';

let historyQueue = Promise.resolve();
function useQueue(operation) {
  const result = historyQueue.then(operation);
  historyQueue = result.catch((err) => console.error(err));
  return result;
}

// 🧠 Smart AI Router Function
async function determineIntent(message) {
  const routerPrompt = `Analyze the user's intent carefully.
Rule 1: If the user explicitly asks to BUILD, CREATE, GENERATE, or CODE a website, UI, or frontend project, return ONLY the word "WEBSITE".
Rule 2: If the user is just asking for information (even about HTML/CSS), asking for weather, math, or general chat, return ONLY the word "CHAT".
Do not output anything else.

User message: "${message}"`;

  try {
    const response = await client.models.generateContent({
      model: modelName,
      contents: routerPrompt,
    });
    return response.text.trim().toUpperCase();
  } catch (error) {
    console.error('❌ Router AI Error:', error.message || error);
    return 'CHAT';
  }
}

app.use(cors());
app.use(express.text({ type: '*/*' }));

app.post('/api/chat', async (req, res, next) => {
  if (typeof req.body !== 'string')
    return res.status(400).send('Request body must be text');

  try {
    const answer = await useQueue(async () => {
      // Pehle AI se pucho ki user chahta kya hai
      const intent = await determineIntent(req.body);
      console.log(`🤖 AI Router Decision: ${intent}`);

      if (intent.includes('WEBSITE')) {
        return await generateWebsite(req.body);
      } else {
        return await chat(req.body);
      }
    });

    res.type('text/plain').send(answer);
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).type('text/plain').send('Server error aagaya');
});

export default app;
