import React, { useState } from 'react';

// Main App component for the AI Study Assistant
const App = () => {
  // State to store the user's text question
  const [question, setQuestion] = useState('');
  // State to store the selected image file
  const [imageFile, setImageFile] = useState(null);
  // State to store the AI's generated response
  const [response, setResponse] = useState('');
  // State to manage loading status during API calls
  const [loading, setLoading] = useState(false);
  // State to store any error messages
  const [error, setError] = useState('');
  // State to store the base64 representation of the image for preview/API
  const [imagePreview, setImagePreview] = useState(null);
  // State to store the selected subject
  const [subject, setSubject] = useState('General'); // Default subject
  // State to store the word/concept to be explained
  const [conceptToExplain, setConceptToExplain] = useState('');

  /**
   * Handles changes in the text input field.
   * @param {Object} e - The event object from the textarea.
   */
  const handleTextChange = (e) => {
    setQuestion(e.target.value);
  };

  /**
   * Handles changes in the subject dropdown.
   * @param {Object} e - The event object from the select element.
   */
  const handleSubjectChange = (e) => {
    setSubject(e.target.value);
  };

  /**
   * Handles changes in the concept to explain input field.
   * @param {Object} e - The event object from the input field.
   */
  const handleConceptChange = (e) => {
    setConceptToExplain(e.target.value);
  };

  /**
   * Handles changes in the image file input.
   * Converts the selected image to a base64 string for preview and API submission.
   * @param {Object} e - The event object from the file input.
   */
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        // Store the base64 string for preview and API
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  /**
   * Converts a File object to a base64 string.
   * @param {File} file - The image file to convert.
   * @returns {Promise<string>} A promise that resolves with the base64 string.
   */
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]); // Get base64 part
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  /**
   * Handles the submission of the question (text and/or image) to the LLM.
   * Constructs the API payload and makes the fetch call to the Gemini API.
   */
  const handleSubmit = async () => {
    setLoading(true);
    setResponse('');
    setError('');

    // Check if at least one input is provided
    if (!question && !imageFile && !conceptToExplain) {
      setError('Please enter a question, upload an image, or enter a concept to explain.');
      setLoading(false);
      console.log('Error: No input provided.'); // Debugging log
      return;
    }

    let promptText = '';

    // Determine the prompt based on whether a concept needs explanation or a problem needs solving
    if (conceptToExplain) {
      promptText = `Explain the concept of '${conceptToExplain}' in the context of ${subject}. Provide a detailed explanation suitable for competitive exam preparation.`;
      if (question) {
        promptText += ` Additionally, if related, please address the following question: ${question}`;
      }
    } else if (question) {
      promptText = `Please provide a detailed, step-by-step solution and explanation for the following problem in ${subject}. Focus on clarity and educational value, suitable for competitive exam preparation. If this is a math problem, show all calculations. If it's a physics or chemistry problem, explain the concepts involved and the reasoning.`;
      promptText += `\n\nQuestion: ${question}`;
    }

    console.log('Generated Prompt:', promptText); // Debugging log

    let payload = {};

    try {
      if (imageFile) {
        // Convert image to base64 if an image is provided
        const base64ImageData = await fileToBase64(imageFile);
        payload = {
          contents: [
            {
              role: 'user',
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    mimeType: imageFile.type,
                    data: base64ImageData,
                  },
                },
              ],
            },
          ],
        };
      } else {
        // Only text input (or text + concept)
        payload = {
          contents: [
            {
              role: 'user',
              parts: [{ text: promptText }],
            },
          ],
        };
      }

      console.log('API Payload:', JSON.stringify(payload, null, 2)); // Debugging log

      // API key is left as an empty string; Canvas will provide it at runtime.
      const apiKey = '';
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('API Raw Response:', apiResponse); // Debugging log

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        console.error('API Error Data:', errorData); // Debugging log
        throw new Error(`API error: ${errorData.error.message || apiResponse.statusText}`);
      }

      const result = await apiResponse.json();
      console.log('API Parsed Result:', result); // Debugging log

      // Check for valid response structure
      if (
        result.candidates &&
        result.candidates.length > 0 &&
        result.candidates[0].content &&
        result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0
      ) {
        const text = result.candidates[0].content.parts[0].text;
        setResponse(text);
        console.log('AI Response Set:', text); // Debugging log
      } else {
        setError('No valid response received from the AI. Please try again.');
        console.log('Error: Invalid AI response structure.'); // Debugging log
      }
    } catch (err) {
      console.error('Error fetching AI response:', err); // Debugging log
      setError(`Failed to get response: ${err.message}`);
    } finally {
      setLoading(false);
      console.log('Loading finished.'); // Debugging log
    }
  };

  /**
   * Clears all input fields and the AI response.
   */
  const handleClear = () => {
    setQuestion('');
    setImageFile(null);
    setImagePreview(null);
    setResponse('');
    setError('');
    setSubject('General'); // Reset subject to default
    setConceptToExplain(''); // Reset concept to explain
    console.log('All fields cleared.'); // Debugging log
  };

  /**
   * Converts basic Markdown (bold, bullet points) to HTML.
   * This is a simplified parser and may not handle all Markdown complexities.
   * @param {string} markdownText - The text containing Markdown.
   * @returns {Object} An object with __html property for dangerouslySetInnerHTML.
   */
  const formatMarkdownToHtml = (markdownText) => {
    if (!markdownText) return { __html: '' };

    let htmlContent = '';
    const lines = markdownText.split('\n');
    let inList = false;

    lines.forEach(line => {
      // Trim leading/trailing whitespace for processing
      const trimmedLine = line.trim();

      // Check for bullet points (supports '*' and '-' as bullets)
      if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
        if (!inList) {
          htmlContent += '<ul>';
          inList = true;
        }
        // Remove the bullet and trim, then apply bold formatting
        let listItemContent = trimmedLine.substring(2).trim();
        listItemContent = listItemContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        htmlContent += `<li>${listItemContent}</li>`;
      } else {
        // If we were in a list, close it
        if (inList) {
          htmlContent += '</ul>';
          inList = false;
        }
        // Handle non-list lines (paragraphs or empty lines)
        if (trimmedLine) {
          // Apply bold formatting to the paragraph content
          let paragraphContent = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          htmlContent += `<p>${paragraphContent}</p>`;
        } else {
          // Preserve empty lines as breaks, but avoid adding <br> right after a list closing tag
          if (!htmlContent.endsWith('</ul>')) {
              htmlContent += '<br />';
          }
        }
      }
    });

    // Close list if still in one at the end of the text
    if (inList) {
      htmlContent += '</ul>';
    }

    return { __html: htmlContent };
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-3xl border border-gray-200 transform transition-all duration-300 hover:scale-[1.01]">
        <h1 className="text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-8 tracking-tight drop-shadow-lg">
          AI Study Assistant
        </h1>

        <div className="space-y-6 mb-8">
          {/* Subject Selection */}
          <div>
            <label htmlFor="subject" className="block text-lg font-semibold text-purple-700 mb-2">
              Select Subject:
            </label>
            <select
              id="subject"
              className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200 ease-in-out bg-purple-50 text-purple-800"
              value={subject}
              onChange={handleSubjectChange}
            >
              <option value="General">General</option>
              <option value="Math">Math</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
              <option value="Computer Science">Computer Science</option>
            </select>
          </div>

          {/* Text Input Area with its own button */}
          <div>
            <label htmlFor="question" className="block text-lg font-semibold text-pink-700 mb-2">
              Enter your question:
            </label>
            <div className="flex gap-2">
              <textarea
                id="question"
                className="flex-1 p-4 border border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition duration-200 ease-in-out resize-y min-h-[100px]"
                placeholder="e.g., 'Solve for x: 2x + 5 = 11' or 'What is the formula for kinetic energy?'"
                value={question}
                onChange={handleTextChange}
              ></textarea>
              <button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:from-pink-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !question} // Disable if loading or question is empty
              >
                Solve
              </button>
            </div>
          </div>

          {/* Concept to Explain Input with its own button */}
          <div>
            <label htmlFor="concept" className="block text-lg font-semibold text-blue-700 mb-2">
              Or enter a concept to explain:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="concept"
                className="flex-1 p-4 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out bg-blue-50 text-blue-800"
                placeholder="e.g., 'Thermodynamics', 'Quadratic Equation', 'Photosynthesis'"
                value={conceptToExplain}
                onChange={handleConceptChange}
              />
              <button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !conceptToExplain} // Disable if loading or concept is empty
              >
                Explain
              </button>
            </div>
          </div>

          {/* Image Input Area (no separate button needed as it's part of problem submission) */}
          <div>
            <label htmlFor="imageUpload" className="block text-lg font-semibold text-green-700 mb-2">
              Or upload an image of the problem:
            </label>
            <input
              type="file"
              id="imageUpload"
              accept="image/*"
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200 cursor-pointer"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <div className="mt-4 border border-green-300 rounded-lg p-2">
                <img src={imagePreview} alt="Problem Preview" className="max-w-full h-auto rounded-md" />
              </div>
            )}
          </div>

          {/* Global Action Buttons (Get Solution / Explanation and Clear) */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:from-teal-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || (!question && !imageFile && !conceptToExplain)} // Disable if no input
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Get Solution / Explanation'
              )}
            </button>
            <button
              onClick={handleClear}
              className="flex-1 bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-xl shadow-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition duration-300 ease-in-out transform hover:scale-105"
              disabled={loading}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Error Message Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {/* AI Response Display */}
        {response && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-indigo-700 mb-4">Solution & Explanation:</h2>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-inner overflow-auto max-h-96">
              {/* Use dangerouslySetInnerHTML to render parsed HTML */}
              <div className="text-gray-800 leading-relaxed" dangerouslySetInnerHTML={formatMarkdownToHtml(response)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;