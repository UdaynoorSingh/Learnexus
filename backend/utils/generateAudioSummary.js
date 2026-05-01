

const cloudinary = require("cloudinary").v2;

if (!cloudinary.config().cloud_name) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

const MAX_INPUT_CHARS = 24000;

/**
 * Summarize text content into a TikTok-style script using Groq Llama 70B.
 * @param {string} text - The truncated text content
 * @returns {Promise<string>} - The summary text (100-120 words)
 */
async function summarizeWithGroq(text) {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a viral content creator. Summarize the following post into a highly engaging, TikTok-style audio script of EXACTLY 100-120 words (roughly 1 minute of speech). 
Rules:
- Start with a hook that grabs attention immediately
- Use conversational, energetic language
- Include key insights from the original content
- End with a memorable takeaway or call-to-action
- Do NOT include any stage directions, emojis, or formatting — just pure spoken text
- Output ONLY the script, nothing else`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        max_tokens: 256,
        temperature: 0.7,
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const summary = data.choices?.[0]?.message?.content?.trim();

  if (!summary) {
    throw new Error("Groq returned an empty summary.");
  }

  return summary;
}

/**
 * Convert text to speech using Sarvam TTS API.
 * @param {string} text - The summary text to convert
 * @returns {Promise<string>} - Base64-encoded audio data
 */
async function textToSpeechSarvam(text) {
  const response = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: {
      "api-subscription-key": SARVAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: "en-IN",
      speaker: "anushka",
      model: "bulbul:v2",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Sarvam TTS error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const audioBase64 = data.audios?.[0];

  if (!audioBase64) {
    throw new Error("Sarvam TTS returned no audio data.");
  }

  return audioBase64;
}

/**
 * Upload a base64-encoded audio buffer to Cloudinary.
 * @param {string} base64Audio - Base64-encoded audio data
 * @returns {Promise<string>} - Cloudinary secure URL
 */
async function uploadToCloudinary(base64Audio) {
  const dataUri = `data:audio/wav;base64,${base64Audio}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    resource_type: "video",
    folder: "learnexus_audio_summaries",
    format: "mp3",
    timeout: 120000,
  });

  if (!result?.secure_url) {
    throw new Error("Cloudinary upload did not return a secure_url.");
  }

  return result.secure_url;
}

/**
 * Full pipeline: Summarize → TTS → Upload → Return URL
 * @param {string} textContent - Raw post/note content
 * @returns {Promise<string|null>} - Cloudinary audio URL, or null on failure
 */
async function generateAudioSummary(textContent) {
  if (!textContent || typeof textContent !== "string" || !textContent.trim()) {
    console.warn("[AudioSummary] Skipped: empty content.");
    return null;
  }

  if (!GROQ_API_KEY) {
    console.warn("[AudioSummary] Skipped: GROQ_API_KEY not set.");
    return null;
  }

  if (!SARVAM_API_KEY) {
    console.warn("[AudioSummary] Skipped: SARVAM_API_KEY not set.");
    return null;
  }

  try {
    const truncated = textContent.slice(0, MAX_INPUT_CHARS);

    console.log(
      `[AudioSummary] Starting pipeline (${truncated.length} chars)...`,
    );

    const summary = await summarizeWithGroq(truncated);
    console.log(
      `[AudioSummary] Groq summary generated (${summary.split(/\s+/).length} words).`,
    );

    const audioBase64 = await textToSpeechSarvam(summary);
    console.log(
      `[AudioSummary] Sarvam TTS complete (${Math.round(audioBase64.length / 1024)}KB base64).`,
    );

    const audioUrl = await uploadToCloudinary(audioBase64);
    console.log(`[AudioSummary] Cloudinary upload complete: ${audioUrl}`);

    return audioUrl;
  } catch (error) {
    console.error("[AudioSummary] Pipeline failed:", error.message || error);
    return null;
  }
}

/**
 * Direct pipeline (no Groq): TTS → Upload → Return URL
 * Used when the text IS the script (e.g. user-written description).
 * @param {string} scriptText - Text to convert directly to speech
 * @returns {Promise<string|null>} - Cloudinary audio URL, or null on failure
 */
async function generateAudioDirect(scriptText) {
  if (!scriptText || typeof scriptText !== 'string' || !scriptText.trim()) {
    console.warn('[AudioDirect] Skipped: empty content.');
    return null;
  }

  if (!SARVAM_API_KEY) {
    console.warn('[AudioDirect] Skipped: SARVAM_API_KEY not set.');
    return null;
  }

  try {
    const trimmed = scriptText.trim().slice(0, 500);

    console.log(`[AudioDirect] Starting TTS (${trimmed.length} chars)...`);

    const audioBase64 = await textToSpeechSarvam(trimmed);
    console.log(`[AudioDirect] Sarvam TTS complete (${Math.round(audioBase64.length / 1024)}KB base64).`);

  
    const audioUrl = await uploadToCloudinary(audioBase64);
    console.log(`[AudioDirect] Cloudinary upload complete: ${audioUrl}`);

    return audioUrl;
  } catch (error) {
    console.error('[AudioDirect] Pipeline failed:', error.message || error);
    return null;
  }
}

module.exports = generateAudioSummary;
module.exports.generateAudioSummary = generateAudioSummary;
module.exports.generateAudioDirect = generateAudioDirect;
