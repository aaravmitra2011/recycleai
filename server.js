const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use(express.static(path.join(__dirname)));

app.post('/api/chat', async (req, res) => {
  try {
    // Extract messages and system from the Anthropic-style request body
    const { messages, system, max_tokens } = req.body;

    // Convert to Groq format
    const groqMessages = [];
    if (system) {
      groqMessages.push({ role: 'system', content: system });
    }
    for (const msg of messages) {
      if (Array.isArray(msg.content)) {
        // Flatten content blocks to text only (Groq doesn't support images on free tier)
        const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
        groqMessages.push({ role: msg.role, content: text });
      } else {
        groqMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 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'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        max_tokens: max_tokens || 1000
      })
    });

    const data = await response.json();
    console.log('Groq response:', JSON.stringify(data));

    if (data.error) {
      console.error('Groq error:', data.error);
      return res.status(500).json({ error: data.error.message });
    }

    // Convert Groq response back to Anthropic-style format the frontend expects
    const text = data.choices?.[0]?.message?.content || 'Sorry, no response received.';
    res.json({ content: [{ type: 'text', text }] });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('RecycleAI running!');
});
