// ThankYou.tsx
import React from "react";
import { Button } from "@mui/material";

const ThankYou: React.FC = () => {

  const logoutAndClose = () => {
    fetch('/logout', { method: 'POST' }).finally(() => {
      window.open('', '_self');
      window.close();
      setTimeout(() => {
        document.body.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;">
              <h2>You have been logged out successfully.</h2>
              <p>You may now close this tab.</p>
          </div>`;
      }, 500);
    });
  };

  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}>
      <div style={{ maxWidth: 650, padding: 45, textAlign: 'center', borderRadius: 12, background:'white', boxShadow:'0 6px 15px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: 55, color:'#198754' }}>✔</div>
        <h2>Interview Completed</h2>
        <p>Your interview has been successfully submitted. Our recruitment team will review your responses.</p>
        <p>Thank you for your time and participation.</p>
        <div style={{ marginTop: 20 }}>
          <Button variant="contained" color="primary" onClick={logoutAndClose}>
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;
