function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function buildEstimateSummary(estimate = {}) {
  const settings = estimate.settings || {};
  const totals = estimate.totals || {};
  const lines = Array.isArray(estimate.lines) ? estimate.lines : [];

  const lineText = lines.map((line, index) => {
    return `${index + 1}. ${line.scope || "Scope item"} | Trade: ${line.trade || settings.tradeType || "N/A"} | Qty: ${line.qty || 0} ${line.unit || ""} | Labor Hours: ${line.laborHours || 0} | Material: ${formatMoney(line.material)} | Equipment/Subs: ${formatMoney(line.other)}`;
  }).join("\n");

  return `
Estimate Settings:
- Trade: ${settings.tradeType || "Not set"}
- Labor Rate: ${formatMoney(settings.laborRate)}/hr
- Markup: ${settings.markup || 0}%
- Contingency: ${settings.contingency || 0}%
- Material Tax: ${settings.tax || 0}%
- Bid Strategy: ${settings.strategy || "balanced"}

Calculated Totals:
- Direct Subtotal: ${formatMoney(totals.subtotal)}
- Labor Hours: ${Number(totals.laborHours || 0).toLocaleString()} hrs
- Material Tax: ${formatMoney(totals.tax)}
- Contingency: ${formatMoney(totals.contingency)}
- Markup: ${formatMoney(totals.markup)}
- Recommended Bid Total: ${formatMoney(totals.grand)}

Estimate Lines:
${lineText || "No estimate lines provided."}
`;
}

function buildPrompt({ mode, projectName, clientName, notes, estimate }) {
  const summary = buildEstimateSummary(estimate);
  const base = `
You are a senior electrical, utility, and civil estimating reviewer.

Important pricing rule:
- Do not invent a new bid total.
- Treat the provided estimate lines, labor hours, material costs, equipment/sub costs, and calculated total as the source of truth.
- If a cost looks unrealistic, flag it as a risk or recommended adjustment, but do not silently replace it.
- Keep language practical, contractor-grade, and bid-day useful.

Project Name:
${projectName || ""}

Client:
${clientName || ""}

Estimator Notes:
${notes || ""}

${summary}
`;

  if (mode === "rfi") {
    return `${base}
Generate RFIs only.

Return:
RFI #
Subject
Question
Why it matters to price/schedule
`;
  }

  if (mode === "proposal") {
    return `${base}
Create a professional proposal draft using the calculated bid total.

Return:
PROJECT
CLIENT
BASE BID
SCOPE INCLUDED
CLARIFICATIONS
EXCLUSIONS
ALLOWANCES
SCHEDULE / LEAD TIME NOTES
PAYMENT TERMS
ACCEPTANCE LINE
`;
  }

  if (mode === "analysis") {
    return `${base}
Analyze the project information.

Return:
SCOPE SUMMARY
MAJOR COST DRIVERS
MISSING INFORMATION
CONSTRUCTABILITY RISKS
LONG LEAD / MATERIAL RISKS
TOP RFIs
BID STRATEGY RECOMMENDATION
`;
  }

  return `${base}
Review this estimate.

Return:
ESTIMATE REVIEW
LABOR HOUR CHECK
MATERIAL / VENDOR QUOTE CHECK
EQUIPMENT / SUBCONTRACTOR CHECK
CONTINGENCY / MARKUP CHECK
RISKS AND EXCLUSIONS
RECOMMENDED ESTIMATOR ACTIONS BEFORE SUBMITTING
`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "Missing OPENAI_API_KEY environment variable in Vercel."
    });
  }

  try {
    const { mode = "review", projectName, clientName, notes, estimate } = req.body || {};
    const prompt = buildPrompt({ mode, projectName, clientName, notes, estimate });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
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
