const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// OCR - Extract text from image
exports.extractText = async (req, res) => {
  try {
    const { image, mimeType } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image data provided.' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: image
        }
      },
      'Extract all the text from this image. If it contains handwritten notes, do your best to read and transcribe them accurately. Return only the extracted text, nothing else.'
    ]);

    const response = await result.response;
    const text = response.text();

    res.json({ text });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({ error: 'OCR processing failed.', details: error.message });
  }
};

// Summarize text
exports.summarize = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided.' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(
      `Summarize the following academic text in a clear, concise manner. 
       Keep the summary informative and well-structured. 
       Maximum 200 words.
       
       Text: ${text}`
    );

    const response = await result.response;
    const summary = response.text();

    res.json({ summary });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: 'Summarization failed.' });
  }
};

// Extract key points
exports.extractKeyPoints = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided.' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(
      `Extract the key points from the following academic text.
       Return them as a JSON array of strings. 
       Each key point should be a concise, informative statement.
       Return ONLY the JSON array, no other text.
       Example: ["Point 1", "Point 2", "Point 3"]
       
       Text: ${text}`
    );

    const response = await result.response;
    let keyPointsText = response.text().trim();
    
    // Clean up markdown code block if present
    keyPointsText = keyPointsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let keyPoints;
    try {
      keyPoints = JSON.parse(keyPointsText);
    } catch {
      keyPoints = keyPointsText.split('\n').filter(line => line.trim()).map(line => line.replace(/^[-*•]\s*/, ''));
    }

    res.json({ keyPoints });
  } catch (error) {
    console.error('Key points error:', error);
    res.status(500).json({ error: 'Key point extraction failed.' });
  }
};

// Classify topic
exports.classifyTopic = async (req, res) => {
  try {
    const { text, availableTopics } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided.' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const topicsList = availableTopics ? availableTopics.join(', ') : 'general';

    const result = await model.generateContent(
      `Given this academic text, classify it into the most appropriate topic.
       Available topics: ${topicsList}
       
       Return ONLY the topic name, nothing else.
       
       Text: ${text.substring(0, 1000)}`
    );

    const response = await result.response;
    const topic = response.text().trim();

    res.json({ topic });
  } catch (error) {
    console.error('Classify error:', error);
    res.status(500).json({ error: 'Classification failed.' });
  }
};

// Generate lecture ("Teach Me")
exports.generateLecture = async (req, res) => {
  try {
    const { topicName, context } = req.body;

    if (!topicName) {
      return res.status(400).json({ error: 'Topic name is required.' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Generate a comprehensive, well-structured lecture on "${topicName}" for a university-level student.
    ${context ? `Additional context: ${context}` : ''}
    
    Structure the lecture with the following sections. Use markdown formatting:
    
    ## Introduction
    A brief introduction to the topic, its importance, and where it fits in the broader subject.
    
    ## Core Concepts
    Explain the fundamental concepts, definitions, and theories related to this topic.
    
    ## Detailed Explanation
    Provide an in-depth, step-by-step explanation of the topic with clear reasoning.
    
    ## Examples
    Give 2-3 worked-out examples that demonstrate the concepts.
    
    ## Key Takeaways
    Summarize the most important points.
    
    ## Practice Questions
    Provide 3-5 practice questions for self-assessment.
    
    Make the lecture engaging, clear, and educational. Use analogies where helpful.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const lecture = response.text();

    res.json({ lecture });
  } catch (error) {
    console.error('Lecture generation error:', error);
    res.status(500).json({ error: 'Lecture generation failed.' });
  }
};
