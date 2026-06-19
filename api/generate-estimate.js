export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { projectName, clientName, notes } = req.body;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `
You are a construction estimating assistant.

Create a preliminary estimate outline for this project.

Project: ${projectName}
Client: ${clientName}
Notes: ${notes}

Return:
1. Scope Summary
2. Major Cost Categories
3. Labor Considerations
4. Material Considerations
5. Equipment Considerations
6. Risks / Exclusions
7. RFIs
8. Preliminary Estimate Format
`
      })
    });

    const result = await response.json();

if(!response.ok){
return res.status(500).json({
error: result.error?.message || JSON.stringify(result)
});
}

let text = result.output_text;

if(!text && result.output){
text = result.output
.flatMap(item => item.content || [])
.map(content => content.text || "")
.join("\n");
}

return res.status(200).json({
estimate: text || JSON.stringify(result, null, 2)
});

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
