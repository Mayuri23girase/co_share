import { GoogleGenAI, Type } from '@google/genai';

/**
 * Polishes post title, description, and content using Google Gemini.
 * Supports structured JSON response and optional reference document attachments (PDF, text, markdown).
 *
 * @param {Object} params
 * @param {string} params.title - Original post title
 * @param {string} params.description - Original post description
 * @param {string} params.content - Original post content
 * @param {Object} [params.file] - Optional multer file object containing document context
 * @returns {Promise<{ title: string, description: string, content: string }>}
 */
export const geminiService = {
  improvePostContent: async ({ title, description, content, file = null }) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      const error = new Error('GEMINI_API_KEY is not configured or is using placeholder value. Please provide a valid Gemini API key in .env');
      error.statusCode = 500;
      throw error;
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

  const systemInstruction =
    'You are an expert AI editor and content strategist for "Akatsuki\'s Draft". ' +
    'Your task is to refine and improve the clarity, grammar, structure, and tone of the given post draft WITHOUT changing its core meaning. ' +
    'Make the title engaging, the description concise and compelling, and the content well-structured with clear paragraphs and headings where suitable. ' +
    'You MUST respond strictly with a valid JSON object matching the requested schema.';

  const promptText =
    `Please improve the following post draft:\n\n` +
    `ORIGINAL TITLE:\n${title}\n\n` +
    `ORIGINAL DESCRIPTION:\n${description}\n\n` +
    `ORIGINAL CONTENT:\n${content}\n\n` +
    (file
      ? `NOTE: An additional reference document (${file.originalname || 'document'}) has been attached. Use it as factual or contextual background to enrich and polish the draft where appropriate.`
      : '');

  const contents = [];

  // If an optional file (PDF or text/markdown) was provided, include it in contents
  if (file && file.buffer) {
    if (file.mimetype === 'application/pdf') {
      contents.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: file.buffer.toString('base64')
        }
      });
    } else if (
      file.mimetype?.startsWith('text/') ||
      file.originalname?.endsWith('.txt') ||
      file.originalname?.endsWith('.md')
    ) {
      const textContext = file.buffer.toString('utf-8');
      contents.push({
        text: `--- ADDITIONAL REFERENCE DOCUMENT CONTEXT (${file.originalname || 'document'}) ---\n${textContext}\n--- END OF REFERENCE DOCUMENT ---`
      });
    } else {
      // General binary fallback as base64 inlineData
      contents.push({
        inlineData: {
          mimeType: file.mimetype || 'application/octet-stream',
          data: file.buffer.toString('base64')
        }
      });
    }
  }

  contents.push({ text: promptText });

  let response;
  try {
    response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'The polished, engaging title of the post'
            },
            description: {
              type: Type.STRING,
              description: 'A refined, concise summary or description of the post'
            },
            content: {
              type: Type.STRING,
              description: 'The comprehensive, well-structured, grammatically polished content of the post'
            }
          },
          required: ['title', 'description', 'content']
        }
      }
    });
  } catch (apiError) {
    const error = new Error(`Gemini API call failed: ${apiError.message}`);
    error.statusCode = 502; // Bad Gateway / upstream error
    throw error;
  }

  const rawText = response?.text;
  if (!rawText) {
    const error = new Error('Gemini API returned an empty response');
    error.statusCode = 502;
    throw error;
  }

  // Parse structured JSON output
  try {
    const parsed = JSON.parse(rawText.trim());
    if (!parsed.title || !parsed.description || !parsed.content) {
      throw new Error('Gemini response missing one or more required fields (title, description, content)');
    }
    return {
      title: String(parsed.title).trim(),
      description: String(parsed.description).trim(),
      content: String(parsed.content).trim()
    };
  } catch (parseError) {
    // Fallback: look for JSON substring if fenced or slightly formatted
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const fallbackParsed = JSON.parse(jsonMatch[0]);
        if (fallbackParsed.title && fallbackParsed.description && fallbackParsed.content) {
          return {
            title: String(fallbackParsed.title).trim(),
            description: String(fallbackParsed.description).trim(),
            content: String(fallbackParsed.content).trim()
          };
        }
      } catch (innerError) {
        // Fall through to error
      }
    }

    const error = new Error(`Failed to parse structured JSON from Gemini response: ${parseError.message}`);
    error.statusCode = 500;
    throw error;
  }
}
};

export const improvePostContent = (params) => geminiService.improvePostContent(params);
