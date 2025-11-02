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
  try {
    const requestBody: any = {
      source_code: code,
      language_id: languageMap[language] || 63,
      stdin: input
    };

    // For Java, set the filename to match the class name
    if (language === 'java' && className) {
      requestBody.filename = `${className}.java`;
    }

    const response = await fetch(`${JUDGE0_API_URL}/submissions?wait=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
      },
      body: JSON.stringify(requestBody)
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