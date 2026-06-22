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
You are a senior electrical estimator with 25+ years of experience pricing commercial, industrial, utility, water treatment, pump station, and infrastructure projects.

Project Name:
${projectName}

Client:
${clientName}

Estimator Notes:
${notes}

Create a realistic construction estimate.

Requirements:

1. Analyze the scope described in the notes.
2. Identify all major electrical systems.
3. Estimate labor hours by system.
4. Estimate material costs using realistic 2025 US construction pricing.
5. Estimate equipment and subcontractor costs.
6. Include overhead and profit.
7. Include contingency.
8. Provide a final estimated project value.
9. Show calculations and assumptions.
10. Output actual dollar values, not placeholders.

Format:

PROJECT OVERVIEW

SCOPE BREAKDOWN

LABOR COSTS
- Item
- Hours
- Rate
- Total

MATERIAL COSTS
- Item
- Quantity
- Unit Cost
- Total

EQUIPMENT COSTS

SUBCONTRACTOR COSTS

OVERHEAD

PROFIT

CONTINGENCY

TOTAL ESTIMATED COST

KEY ASSUMPTIONS

RISKS

RFIs
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
