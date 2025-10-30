// src/services/codeExecution.ts

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const API_KEY = '202a26cab0msh57f8c26da186112p1253f4jsn3b5a757df470'; // Be careful with API keys in production

const languageMap: { [key: string]: number } = {
  'javascript': 63,
  'python': 71,
  'java': 62,
  'cpp': 54,
  'c': 50
};

// ✅ UPDATED: Function signature now includes an optional 'className' parameter.
export const executeCode = async (code: string, language: string, className?: string, input: string = '') => {
  // NOTE: The 'className' is not directly used in the API call.
  // The Judge0 API infers the filename from the 'public class' name within the source code.
  // We include it in the signature for clarity and to match the function call from the component.

  try {
    const response = await fetch(`${JUDGE0_API_URL}/submissions?wait=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageMap[language] || 63,
        stdin: input
      })
    });

    const result = await response.json();
    
    return {
      output: result.stdout || 'No output',
      error: result.stderr || result.compile_output || '',
      status: result.status?.description || 'Unknown'
    };
  } catch (error) {
    return {
      output: '',
      error: 'Execution failed. Please try again.',
      status: 'Error'
    };
  }
};