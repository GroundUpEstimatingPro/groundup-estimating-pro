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

Rules:
- Do NOT use placeholders like $XX,XXX.
- Use actual dollar values.
- Use realistic 2025 US construction pricing assumptions.
- If exact quantities are missing, make reasonable estimating assumptions and clearly state them.
- Include labor hours, labor rates, material costs, equipment costs, overhead, profit, contingency, and total cost.
- Format all dollar amounts as currency.
- This is a conceptual estimate and must be reviewed by a qualified estimator.

Return this format:

PROJECT OVERVIEW

SCOPE BREAKDOWN

LABOR COSTS
- Item
- Estimated Hours
- Labor Rate
- Total Labor Cost

MATERIAL COSTS
- Item
- Quantity Assumption
- Unit Cost
- Total Material Cost

EQUIPMENT / RENTALS

SUBCONTRACTOR COSTS

OVERHEAD

PROFIT

CONTINGENCY

TOTAL ESTIMATED COST

KEY ASSUMPTIONS

RISKS / EXCLUSIONS

RFIs
`
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: result.error?.message || JSON.stringify(result)
      });
    }

    let text = result.output_text;

    if (!text && result.output) {
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
