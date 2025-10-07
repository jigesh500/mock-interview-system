import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { Warning, Block } from '@mui/icons-material';

const ViolationPage: React.FC = () => {
  return (
    <Box className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-lg">
        <CardContent className="text-center p-8">
          <Block sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
          
          <Typography variant="h3" className="text-red-600 font-bold mb-4">
            Interview Terminated
          </Typography>
          
          {/*<Typography variant="h6" className="text-gray-700 mb-6">
            Your interview has been automatically terminated due to multiple  violations policy.
          </Typography>*/}

          <Box className="bg-red-100 p-4 rounded-lg mb-6">
            <Warning sx={{ color: 'error.main', mr: 1 }} />
            <Typography variant="body1" className="text-red-800">
              <strong>Violation Detected:</strong> Your interview has been automatically terminated due to multiple policy violations .
            </Typography>
          </Box>
          
          {/*<Typography variant="body2" className="text-gray-600 mb-6">
            Our monitoring system detected multiple individuals in your camera view on 4 separate occasions. 
            To maintain the integrity of the examination process, your interview has been terminated and 
            your responses have been automatically submitted for review.
          </Typography>*/}
          
          <Typography variant="body2" className="text-gray-600 mb-8">
            If you believe this was an error or have technical concerns, please contact our support team 
            with your session details for further assistance.
          </Typography>
          
          <Box className="flex gap-4 mt-5 justify-center">
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => {
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
              }}
            >
              Logout
            </Button>
            
            <Button 
              variant="outlined" 
              color="secondary"
              onClick={() => window.location.href = '/contact-support'}
            >
              Contact Support
            </Button>
          </Box>
          
          <Typography variant="caption" className="text-gray-500 mt-6 block">
            Interview terminated at: {new Date().toLocaleString()}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ViolationPage;