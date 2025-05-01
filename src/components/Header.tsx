import React from 'react';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';

const Header: React.FC = () => {
  return (
    <AppBar position="static" sx={{ backgroundColor: '#4DB6AC' }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src="/static/images/app-logo.png" 
            alt="老鼠记账" 
            style={{ width: 40, height: 40, marginRight: 10 }}
          />
          <Typography variant="h6" component="div">
            老鼠记账
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 