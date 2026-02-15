import "dotenv/config";
import express from "express";

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.OPENAI_API_KEY;

app.use(express.json());
app.use(express.static("."));

app.post("/api/insights", async (req, res) => {
  if (!apiKey) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  const { score, input } = req.body || {};

  const prompt = `You are a productivity coach. Given the daily log, provide:
1) time leak analysis (1-2 sentences)
2) behavioral insight (1-2 sentences)
3) 3 concise, actionable suggestions
Return JSON with keys: leaks, behavior, suggestions (array).
\nScore: ${score}\nInput: ${JSON.stringify(input)}`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: prompt,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({ error: "OpenAI request failed", details: errorText });
    }

    const data = await response.json();
    const content = data?.output?.[0]?.content?.[0]?.text || "{}";
    const parsed = JSON.parse(content);

    return res.json({ insights: parsed });
  } catch (error) {
    return res.status(500).json({ error: "Proxy error" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
