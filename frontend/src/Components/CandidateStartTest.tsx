import React, { useEffect,useState } from 'react';
import axios from 'axios';
function CandidateStartTest() {
  const [questions, setQuestions] = useState([]);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    axios.get("http://localhost:8081/interview/start", { withCredentials: true })
      .then(res => {
        setQuestions(res.data.questions);
        setUserId(res.data.userId);
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h2>Interview for: {userId}</h2>
      <ul>
        {questions.map((q, i) => (
          <li key={i}>{q.text}</li>
        ))}
      </ul>
    </div>
  );
}

export default CandidateStartTest;