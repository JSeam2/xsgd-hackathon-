import React from 'react';
import Web3 from "web3";
import Web3Modal from "web3modal";

import {
  Button,
  Grid,
  Typography,
  TextField,
  Card,
  CardContent,
  CardActions,
} from '@material-ui/core';

import { withStyles } from '@material-ui/core/styles';

import { ERC20_HTLC_ABI, ERC20_XSGD_ABI } from '../data/ABI';
import { ERC20_HTLC, ERC20_XSGD } from '../data/addresses';

const styles = theme => ({
  card: {
    minWidth: 450,
    maxWidth: 450,
    marginTop: "2rem"
  },
  pos: {
    marginBottom: 12,
  }
});

const INITIAL_STATE = {
  fetching: false,
  address: "",
  web3: null,
  provider: null,
  connected: false,
  htlcContract: null,
  xsgdContract: null,
  chainId: 4,
  networkId: 4,
  xsgdBalance: null,
  showModal: false,

  newContract: false,
  newContract_timelock: 0,
  newContract_passcode: "",
  newContract_hashlock: "",
  newContract_amount: 0,
  newContract_receiver: "",
  newContractResult: null,

  newContractSuccess: false,
  newContractSuccess_contractId: "",
  newContractSuccess_timelock: 0,
  newContractSuccess_hashlock: "",
  newContractSuccess_sender: "",
  newContractSuccess_receiver: "",
  newContractSuccess_amount: "",

  getContract: false,
  getContractSuccess_withdrawn: false,
  getContractSuccess_refunded: false,
  getContract_contractId: "",
  getContractSuccess_contractId: "",
  getContractSuccess_passcode: "",
  getContractSuccess_timelock: 0,
  getContractSuccess_hashlock: "",
  getContractSuccess_sender: "",
  getContractSuccess_receiver: "",
  getContractSuccess_amount: "",

  withdraw_passcode: "",

  pendingRequest: false,
  result: null,
};

function initWeb3(provider) {
  const web3 = new Web3(provider);

  web3.eth.extend({
    methods: [
      {
        name: "chainId",
        call: "eth_chainId",
        outputFormatter: web3.utils.hexToNumber
      }
    ]
  });

  return web3;
}

class Ethereum extends React.Component {
  constructor(props){
    super(props);

    this.state = {
      ...INITIAL_STATE
    }
    this.web3Modal = new Web3Modal({
      network: "rinkeby",
      cacheProvider: true,
      disableInjectedProvider: false,
      providerOptions: this.getProviderOptions
    });
  }

  componentDidMount() {
    if (this.web3Modal.cachedProvider) {
      this.onConnect();
    }
  }

  onConnect = async () => {
    const provider = await this.web3Modal.connect();

    await this.subscribeProvider(provider);

    const web3 = initWeb3(provider);

    const accounts = await web3.eth.getAccounts();

    const address = accounts[0];

    const networkId = await web3.eth.net.getId();

    const chainId = await web3.eth.chainId();

    const xsgdContract = new web3.eth.Contract(
      ERC20_XSGD_ABI, 
      ERC20_XSGD,
    )

    const htlcContract = new web3.eth.Contract(
      ERC20_HTLC_ABI,
      ERC20_HTLC
    )

    await this.setState({
      web3,
      provider,
      connected: true,
      address,
      chainId,
      networkId,
      xsgdContract,
      htlcContract
    });
    await this.getXSGDBalance();
  };

  subscribeProvider = async (provider) => {
    if (!provider.on) {
      return;
    }
    provider.on("close", () => this.resetApp());
    provider.on("accountsChanged", async (accounts) => {
      await this.setState({ address: accounts[0] });
      await this.getXSGDBalance();
    });
    provider.on("chainChanged", async (chainId) => {
      const { web3 } = this.state;
      const networkId = await web3.eth.net.getId();
      await this.setState({ chainId, networkId });
      await this.getXSGDBalance();
    });

    provider.on("networkChanged", async (networkId) => {
      const { web3 } = this.state;
      const chainId = await web3.eth.chainId();
      await this.setState({ chainId, networkId });
      await this.getXSGDBalance();
    });
  };

  getProviderOptions = () => {
    // Only set up for injected
    const providerOptions = {
      // walletconnect: {
      //   package: WalletConnectProvider,
      //   options: {
      //     infuraId: process.env.REACT_APP_INFURA_ID
      //   }
      // },
      // torus: {
      //   package: Torus
      // },
      // fortmatic: {
      //   package: Fortmatic,
      //   options: {
      //     key: process.env.REACT_APP_FORTMATIC_KEY
      //   }
      // },
      // authereum: {
      //   package: Authereum
      // },
      // bitski: {
      //   package: Bitski,
      //   options: {
      //     clientId: process.env.REACT_APP_BITSKI_CLIENT_ID,
      //     callbackUrl: window.location.href + "bitski-callback.html"
      //   }
      // }
    };
    return providerOptions;
  };

  toggleModal = () => {
    this.setState({ showModal: !this.state.showModal});
  } 

  getXSGDBalance = async () => { 
    const { address, chainId, xsgdContract } = this.state;
    this.setState({ fetching: true });

    console.log(xsgdContract);

    const xsgdBalance = xsgdContract.methods.balanceOf(address).call({from: address})
    .then((res) => {
      console.log(res);
      this.setState({ xsgdBalance: res / 1e6, fetching: false})
    })
    .catch((err) => {
      console.error(err);
      this.setState({ fetching : false });
    })
  }

  render = () => {
    const {
      web3,
      xsgdBalance,
      xsgdContract,
      htlcContract,
      address,
      connected,
      chainId,
      fetching,
      showModal,
      pendingRequest,
      result,

      newContract,
      newContract_receiver,
      newContract_passcode,
      newContract_hashlock,
      newContract_timelock,
      newContract_amount,

      newContractSuccess,
      newContractSuccess_receiver,
      newContractSuccess_sender,
      newContractSuccess_amount,
      newContractSuccess_hashlock,
      newContractSuccess_timelock,
      newContractSuccess_contractId,

      getContract,
      getContract_contractId,

      getContractSuccess,
      getContractSuccess_withdrawn,
      getContractSuccess_refunded,
      getContractSuccess_receiver,
      getContractSuccess_sender,
      getContractSuccess_amount,
      getContractSuccess_hashlock,
      getContractSuccess_timelock,
      getContractSuccess_contractId,
      getContractSuccess_passcode,
      
      withdraw_passcode,
    } = this.state;

    const {
      classes
    } = this.props;

    return (
      <Grid container
        spacing={0}
        direction="column"
        alignItems="center"
        justify="center"
      >
        <Grid items xs={12}>
          <Card className={classes.card}>
            <CardContent>
              <Typography variant="h5" component="h2">
                Step 1
              </Typography>
              <Typography color="textSecondary" className={classes.pos}>
                Connect your wallet
              </Typography>

              { connected &&
                <div>
                <Typography variant="body2" component="p">
                  {`Address :  ${address}`}
                </Typography>
                <Typography variant="body2" component="p">
                  {`XSGD ERC20 Balance: ${'$'+xsgdBalance}`}
                </Typography>
                </div>
              }
            
            </CardContent>
            
            <CardActions>
              <Button 
                variant="contained"
                disabled={connected ? true : false}
                color={"secondary"}
                onClick={(e) => {
                  e.preventDefault();
                  this.onConnect();
                }}
              >
                { connected ? "Connected" : "Connect Wallet" }
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid items xs={12}>
          <Card className={classes.card}>
            <CardContent>
              <Typography variant="h5" component="h2">
                Step 2
              </Typography>
              <Typography color="textSecondary" className={classes.pos}>
                Select Option
              </Typography>            
            </CardContent>
            <CardActions>
              <Button
                color="secondary"
                variant="contained"
                onClick={(e) => {
                  let passcode = web3.utils.randomHex(32);
                  let hashlock = web3.utils.soliditySha3(passcode);
                  let blockNum = web3.eth.getBlockNumber().then(blockNum => {
                    this.setState({
                      newContract_passcode: passcode,
                      newContract_hashlock: hashlock,
                      newContract_timelock: blockNum,
                      newContract: true,
                      newContractSuccess: false,
                      getContract: false
                    })
                  })
                }}
              >
                New Contract
              </Button> 

              <Button
                color="secondary"
                variant="outlined"
                onClick={(e) => {
                  this.setState({
                    newContract: false,
                    newContractSuccess: false,
                    getContract: true,
                  })
                }}
              >
                Get Contract
              </Button>               
            </CardActions>
          </Card>
        </Grid> 
        { newContract &&
          <Grid items xs={12}>
            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h5" component="h2">
                  Step 3
                </Typography>
                <Typography color="textSecondary" className={classes.pos}>
                  Create A New Contract. Copy the Passcode
                </Typography>

                <TextField 
                  label="Receiver Address" 
                  variant="filled"
                  value={newContract_receiver}
                  onChange={(e) => {
                    this.setState({
                      newContract_receiver: e.target.value
                    })
                  }}
                  fullWidth
                />
                <TextField
                  label="Amount"
                  variant="filled"
                  value={newContract_amount}
                  onChange={(e) => {
                    this.setState({
                      newContract_amount : e.target.value
                    })
                  }}
                  fullWidth
                />
                <TextField
                  label="Timelock (Modify Current Block Num)"
                  variant="filled"
                  value={newContract_timelock}
                  onChange={(e) => {
                    this.setState({
                      newContract_timelock: e.target.value
                    })
                  }}
                  fullWidth
                />
                <TextField 
                  label="Passcode" 
                  variant="filled"
                  disabled
                  value={newContract_passcode}
                  onChange={(e) => {
                    // generate hashlock

                    this.setState({
                      newContract_passcode: e.target.value
                    })
                  }}
                  fullWidth
                />
                <TextField 
                  label="Hashlock"
                  variant="filled" 
                  value={newContract_hashlock}
                  onChange={(e) => {
                    this.setState({
                      newContract_hashlock: e.target.value
                    })
                  }}
                  fullWidth
                />                                    
              </CardContent>
              <CardActions>
                <Button
                  color="secondary"
                  variant="contained"
                  onClick={(e) => {
                    xsgdContract.methods.increaseAllowance(ERC20_HTLC, 99999999999999)
                    .send({from: address})
                    .then((res) => {
                      htlcContract.methods.newContract(
                        newContract_receiver,
                        newContract_hashlock,
                        newContract_timelock,
                        web3.utils.toBN(newContract_amount).mul(new web3.utils.BN(1e6))
                      )
                      .send({ from: address })
                      .then((res) => {
                        console.log(res);
                        let vals = res.events.NewContract.returnValues
                        this.setState({
                          newContractSuccess: true,
                          newContractSuccess_contractId: vals.contractId,
                          newContractSuccess_sender: vals.sender,
                          newContractSuccess_receiver: vals.receiver,
                          newContractSuccess_timelock: vals.timelock,
                          newContractSuccess_hashlock: vals.hashlock,
                          newContractSuccess_amount: vals.amount
                        })
                      })

                    })
                  }}
                >
                  Create Contract
                </Button> 
              </CardActions>
            </Card>          
          </Grid>
        }
        { newContract && newContractSuccess && 
          <Grid items xs={12}>
            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h5" component="h2">
                  Step 4:
                </Typography>
                <Typography color="textSecondary" className={classes.pos}>
                  Success! Save the Contract Id
                </Typography>
                <Typography variant="body2" component="p">
                  {`Contract Id :  ${newContractSuccess_contractId}`}
                </Typography>
                <Typography variant="body2" component="p">
                  {`Sender: ${newContractSuccess_sender}`}
                </Typography>
                <Typography variant="body2" component="p">
                  {`Receiver: ${newContractSuccess_receiver}`}
                </Typography>
                <Typography variant="body2" component="p">
                  {`Amount: $${newContractSuccess_amount / 1e6}`}
                </Typography>
                <Typography variant="body2" component="p">
                  {`Timelock: ${newContractSuccess_timelock}`}
                </Typography>
                <Typography variant="body2" component="p">
                  {`Hashlock: ${newContractSuccess_hashlock}`}
                </Typography>                                                                                          
              </CardContent>
            </Card>          
          </Grid>        
        }
        { getContract &&
          <Grid items xs={12}>
            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h5" component="h2">
                  Step 3
                </Typography>
                <Typography color="textSecondary" className={classes.pos}>
                  Get Contract Details
                </Typography>
                <TextField 
                  label="Contract Id" 
                  variant="filled"
                  value={getContract_contractId}
                  onChange={(e) => {
                    this.setState({
                      getContract_contractId: e.target.value
                    })
                  }}
                  fullWidth
                />
                { getContractSuccess &&
                <div>
                  <Typography variant="body2" component="p">
                    {`Contract Id :  ${getContractSuccess_contractId}`}
                  </Typography>
                  <Typography variant="body2" component="p">
                    {`Sender: ${getContractSuccess_sender}`}
                  </Typography>
                  <Typography variant="body2" component="p">
                    {`Receiver: ${getContractSuccess_receiver}`}
                  </Typography>
                  <Typography variant="body2" component="p">
                    {`Amount: $${getContractSuccess_amount / 1e6}`}
                  </Typography>
                  <Typography variant="body2" component="p">
                    {`Timelock: ${getContractSuccess_timelock}`}
                  </Typography>
                  <Typography variant="body2" component="p">
                    {`Hashlock: ${getContractSuccess_hashlock}`}
                  </Typography>
                  <Typography variant="body2" component="p">
                    {`Passcode: ${getContractSuccess_passcode}`}
                  </Typography>      
                </div>            
                }

              </CardContent>
              <CardActions>
                <Button
                  color="secondary"
                  variant="contained"
                  onClick={(e) => {
                    htlcContract.methods.getContract(
                      getContract_contractId
                    )
                    .call({from: address})
                    .then((res) => {
                      console.log(res.receiver);
                      console.log(address);
                      this.setState({
                        getContractSuccess: true,
                        getContractSuccess_amount: res.amount,
                        getContractSuccess_hashlock: res.hashlock,
                        getContractSuccess_passcode: res.preimage,
                        getContractSuccess_receiver: res.receiver,
                        getContractSuccess_sender: res.sender,
                        getContractSuccess_timelock: res.timelock,
                        getContractSuccess_refunded: res.refunded,
                        getContractSuccess_withdrawn: res.withdrawn,
                      })
                    })                  
                  }}
                >
                  Get Contract Details
                </Button> 
              </CardActions>
            </Card>          
          </Grid>
        }
        { getContract && 
          getContractSuccess && 
          getContractSuccess_receiver == address &&
          !getContractSuccess_refunded &&
          !getContractSuccess_withdrawn &&

          <Grid items xs={12}>
            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h5" component="h2">
                  Step 4
                </Typography>
                <Typography color="textSecondary" className={classes.pos}>
                  Withdraw
                </Typography>
                <TextField 
                  label="Passcode" 
                  variant="filled"
                  value={withdraw_passcode}
                  onChange={(e) => {
                    this.setState({
                      withdraw_passcode: e.target.value
                    })
                  }}
                  fullWidth
                />                                    
              </CardContent>
              <CardActions>
                <Button
                  color="secondary"
                  variant="contained"
                  onClick={(e) => {
                    htlcContract.methods.withdraw(
                      getContract_contractId,
                      withdraw_passcode
                    )
                    .send({from: address})
                    .then(res => {
                      console.log(res);
                    })
                  }}
                >
                  Withdraw
                </Button> 
              </CardActions>
            </Card>          
          </Grid>
        }
        { getContract && 
          getContractSuccess && 
          getContractSuccess_sender == address &&
          !getContractSuccess_refunded &&
          !getContractSuccess_withdrawn &&

          <Grid items xs={12}>
            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h5" component="h2">
                  Step 4
                </Typography>
                <Typography color="textSecondary" className={classes.pos}>
                  Refund
                </Typography>            
              </CardContent>
              <CardActions>
                <Button
                  color="secondary"
                  variant="contained"
                  onClick={(e) => {
                    htlcContract.methods.refund(
                      getContract_contractId,
                    )
                    .send({from: address})
                    .then(res => {
                      console.log(res);
                    })
                  }}
                >
                  Refund
                </Button> 
              </CardActions>
            </Card>          
          </Grid>          
        }        
      </Grid>
    )
  };
}

export default withStyles(styles)(Ethereum);