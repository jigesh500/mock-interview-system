import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { logout } from '../redux/reducers/auth/authSlice';

const Header = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  if (!isAuthenticated) return null; 

  return (
    <AppBar position="static" className="bg-blue-600">
      <Toolbar>
        <Typography variant="h6" className="flex-grow">
          HireIn - {user?.role === 'hr' ? 'HR Dashboard' : 'Interview Portal'}
        </Typography>
        
        <Box className="flex items-center space-x-4">
          <Typography variant="body2">
            Welcome, {user?.name}
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
