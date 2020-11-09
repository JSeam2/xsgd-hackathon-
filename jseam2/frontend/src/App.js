import React from 'react';
import './App.css';
import {
  Typography,
  Grid,
  AppBar,
  Tab,
  Tabs,
  Box
} from '@material-ui/core';

import { makeStyles } from '@material-ui/core/styles';

import Ethereum from './components/ethereum';
import Zilliqa from './components/zilliqa';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
  },
  title: {
    fontSize: 46,
    textAlign: 'center',
    marginTop: "2rem",
  },
  subtitle: {
    fontSize: 20,
    textAlign: 'center',
  },
  content: {
    marginTop: '3rem',
    minWidth: 400,
  }
}));

function a11yProps(index) {
  return {
    id: `tab-${index}`,
    'aria-controls': `tabpanel-${index}`,
  };
}

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          {children}
        </Box>
      )}
    </div>
  );
}

function App() {
  const classes = useStyles();
  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Grid 
      container 
      spacing={0}
      direction="column"
      alignItems="center"
      justify="center"
      className={classes.root}
    >
      <Grid items xs={12}>
        <Typography variant="h1" className={classes.title}>
          <strong>
            XSGDBridge
          </strong>
        </Typography>
      </Grid>
      <Grid items xs={12}>
        <Typography variant="subtitle" className={classes.subtitle}>
          {`XSGD ERC20 <-> XSGD ZRC2`}
        </Typography>
      </Grid>

      <Grid items xs={12} className={classes.content}>
        <AppBar position="static">
          <Tabs centered value={value} onChange={handleChange} aria-label="ZilBridge">
            <Tab label="ERC20" {...a11yProps(0)} />
            <Tab label="ZRC2" {...a11yProps(1)} />
          </Tabs>
        </AppBar>

        <TabPanel value={value} index={0}>
          <Ethereum />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <Zilliqa />
        </TabPanel>
      </Grid>
    </Grid>

  );
}

export default App;
