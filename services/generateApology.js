import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateApology({ tone, userMessage }) {
  const prompt = `
you are writing a personal apology email on behalf of amogh.

tone: ${tone}

context (optional):
${userMessage || "no additional context provided."}

rules:
- write everything in lowercase
- keep it under 100 words
- the tone must be clearly felt within the first two lines
- be emotionally honest, not dramatic
- no guilt-tripping, no manipulation
- no unrealistic promises
- end gently, without pressure

write only the email body.
do not include a subject.
do not include explanations.
`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8
  });

  return response.choices[0].message.content.trim().toLowerCase();
}
