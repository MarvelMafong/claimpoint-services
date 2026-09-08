import { getGeminiClient } from './gemini';

// Prompt design follows NIST/ICAO identity-proofing principles: evaluate
// only what's visibly checkable in an ordinary photo (layout consistency,
// typography, cropping/compositing artifacts, front/back consistency) —
// never asked to authenticate physical security features a photo can't
// show. Output is advisory only; a human reviewer makes the final call,
// per the spec's explicit requirement.
const ANALYSIS_PROMPT = `You are assisting a human reviewer in a document authenticity screening step, not making a final decision.

Examine the identity document image(s) provided and assess:
- Layout and typography consistency with the claimed document type
- Photo placement and any signs of substitution
- Signs of digital manipulation, compositing, or screenshot editing
- Cropping anomalies or missing/obscured information
- Whether the image quality is sufficient for review at all

Do not attempt to verify physical security features (holograms, watermarks, microprint) that cannot be assessed from a photograph. Do not claim certainty about authenticity — you are flagging patterns for human review, not authenticating the document.

Respond in this exact JSON format, nothing else:
{
  "result": "no_anomaly_detected" | "potential_anomaly" | "insufficient_evidence" | "manual_review_required",
  "risk_indicator": "low" | "medium" | "high",
  "notes": "one or two sentences describing what you observed, plainly"
}`;

export async function analyzeVerificationDocument(imageBase64, mimeType) {
  const client = getGeminiClient();
  if (!client) {
    return { result: 'manual_review_required', risk_indicator: 'medium', notes: 'AI screening unavailable — routed directly to manual review.' };
  }

  try {
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent([
      ANALYSIS_PROMPT,
      { inlineData: { data: imageBase64, mimeType } },
    ]);

    const text = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    return parsed;
  } catch (err) {
    console.error('Gemini analysis error:', err.message);
    // Conservative failure mode — if analysis fails for any reason, route
    // to manual review rather than silently skipping the check.
    return { result: 'manual_review_required', risk_indicator: 'medium', notes: 'Automated screening failed to complete — routed to manual review.' };
  }
}