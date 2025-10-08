import React from "react";

const ThankYou2: React.FC = () => {
  return (
    <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh'}}>
      <h2>You have been logged out successfully.</h2>
      <p>You may now close this tab.</p>
    </div>
  );
};

export default ThankYou2;
