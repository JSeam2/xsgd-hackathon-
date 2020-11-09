import React from 'react';
import { BN, Long, bytes, units } from '@zilliqa-js/util';
import { Zilliqa } from '@zilliqa-js/zilliqa';
import {
  toBech32Address,
  fromBech32Address,
  getAddressFromPrivateKey,
} from '@zilliqa-js/crypto';
import Web3 from 'web3';

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

import { ZRC2_HTLC_CODE, ZRC2_XSGD_CODE } from '../data/ScillaCode';
import { ZRC2_HTLC, ZRC2_XSGD } from '../data/addresses';

const chainId = 333;
const msgVersion = 1;
const VERSION = bytes.pack(chainId, msgVersion);

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
  web3: null,
  addressBase16: "",
  addressBech32: "",
  provider: null,
  connected: false,
  htlcContract: null,
  xsgdContract: null,
  xsgdBalance: null,
  showModal: false,
  minGasPrice: 0,

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


class ZilliqaComp extends React.Component {
  constructor(props){
    super(props);

    this.state = {
      ...INITIAL_STATE
    }

    this.getTransaction = this.getTransaction.bind(this);
    this.getTransactionCaller = this.getTransactionCaller.bind(this);
    this.getHTLCContractState = this.getHTLCContractState.bind(this);
  }

  componentDidMount() {
    this.onConnect();
  }

  onConnect = () => {
    if (window.zilPay) {
      const provider = window.zilPay;
      console.log(provider);
      provider.wallet.connect().then(res => {
        if (res) {
          const addressBase16 = provider.wallet.defaultAccount.base16;
          const addressBech32 = provider.wallet.defaultAccount.bech32;

          const xsgdContract = provider.contracts.at(
            ZRC2_XSGD, 
            ZRC2_XSGD_CODE,
          );

          const htlcContract = provider.contracts.at(
            ZRC2_HTLC,
            ZRC2_HTLC_CODE
          );

          const minGasPrice = provider.blockchain.getMinimumGasPrice()
          .then(res => {
            this.setState({
              web3: new Web3(),
              provider,
              connected: true,
              addressBase16,
              addressBech32,
              xsgdContract,
              htlcContract,
              minGasPrice: res.result
            });
            this.getXSGDBalance();

          })
        }
        else {
          alert("Cannot connect to Zilpay");
        }
      })
    } else {
      alert("Zilpay is not installed")
    }
  };

  toggleModal = () => {
    this.setState({ showModal: !this.state.showModal});
  } 

  getXSGDBalance = async () => { 
    const { xsgdContract, addressBase16 } = this.state;
    this.setState({ fetching: true });

    const xsgdBalance = xsgdContract.getState()
    .then((res) => {
      let balance = res.balances[addressBase16.toLowerCase()] || 0
      if (balance > 0) {
        balance = balance / 1e6;
      }
      this.setState({ xsgdBalance: balance, fetching: false})
    })
    .catch((err) => {
      console.error(err);
      this.setState({ fetching : false });
    })
  }

  getHTLCContractState = () => {
    const { htlcContract, getContract_contractId} = this.state;
    this.setState({ fetching: true});
    const contractData = htlcContract.getState()
    .then((res) => {
      console.log(res);
      this.setState({
        getContractSuccess: true,
        getContractSuccess_amount: res.contract_amount[getContract_contractId],
        getContractSuccess_withdrawn: res.contract_withdrawn[getContract_contractId].constructor === "True",
        getContractSuccess_refunded: res.contract_refunded[getContract_contractId].constructor === "True",
        getContractSuccess_contractId: getContract_contractId,
        getContractSuccess_passcode: res.contract_preimage[getContract_contractId],
        getContractSuccess_timelock: res.contract_timelock[getContract_contractId],
        getContractSuccess_hashlock: res.contract_hashlock[getContract_contractId],
        getContractSuccess_sender: res.contract_sender[getContract_contractId],
        getContractSuccess_receiver: res.contract_receiver[getContract_contractId],
      });
    })
    .catch((err) => {
      console.error(err);
      this.setState({ fetching: false });
    })
  }

  getTransactionCaller = (txID, provider) => {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        provider.blockchain.getTransaction(txID)
        .then(res => {
          console.log(res);
          resolve({done: true, result: res});
        })
        .catch(err => {
          // console.log(err);
          resolve({done: false});
        })
      }, 4000);
    });
  }

  getTransaction = (txID) => {
    const { provider } = this.state;
    let done = false;
    let that = this;

    return new Promise(function (resolve, reject) {
      const callInterval = setInterval(async () => {
        console.log("calling");
        that.getTransactionCaller(txID, provider).then(res => {
          if (res.done) {
            clearInterval(callInterval);
            resolve({result: res.result});
          }
        });
      }, 4000);
    });
  }

  render = () => {
    const {
      web3,
      xsgdBalance,
      xsgdContract,
      htlcContract,
      addressBase16,
      addressBech32,
      connected,
      chainId,
      fetching,
      showModal,
      pendingRequest,
      result,
      provider,
      minGasPrice,

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
                  {`Address :  ${addressBech32}`}
                </Typography>
                <Typography variant="body2" component="p">
                  {`XSGD ZRC2 Balance: ${'$'+xsgdBalance}`}
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
                  let passcode = Web3.utils.randomHex(32);
                  let hashlock = Web3.utils.soliditySha3(passcode);
                  let blockNum = provider.blockchain.getNumTxBlocks().then(blockNum => {
                    this.setState({
                      newContract_passcode: passcode,
                      newContract_hashlock: hashlock,
                      newContract_timelock: blockNum.result,
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
        <div>
          <Grid items xs={12}>
            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h5" component="h2">
                  Step 3
                </Typography>
                <Typography color="textSecondary" className={classes.pos}>
                  Approve Hash Timelock Contract
                </Typography>                          
              </CardContent>
              <CardActions>
                <Button
                  color="secondary"
                  variant="contained"
                  onClick={(e) => {
                    let final_amount = Web3.utils.toBN(newContract_amount).mul(new web3.utils.BN(1e6))
                    const tx = xsgdContract.call(
                      'IncreaseAllowance',
                      [
                        {
                          vname: 'spender',
                          type: 'ByStr20',
                          value: ZRC2_HTLC,
                        },
                        {
                          vname: 'amount',
                          type: 'Uint128',
                          value: Web3.utils.toBN(99999999999999).toString(),
                        }
                      ],
                      {
                        version: VERSION,
                        amount: new BN(0),
                        gasPrice: minGasPrice,
                        gasLimit: Long.fromNumber(25000),
                      },
                      33,
                      1000,
                      false
                    ).then(res => {
                      console.log("Approved");
                    })
                  }}
                >
                  Approve
                </Button> 
              </CardActions>
            </Card>          
          </Grid>        
          <Grid items xs={12}>
            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h5" component="h2">
                  Step 4
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
                    e.preventDefault();
                    let final_amount = Web3.utils.toBN(newContract_amount).mul(new web3.utils.BN(1e6));
                    htlcContract.call(
                      'newContract',
                      [
                        {
                          vname: 'receiver',
                          type: 'ByStr20',
                          value: fromBech32Address(newContract_receiver)
                        },
                        {
                          vname: 'hashlock',
                          type: 'ByStr32',
                          value: newContract_hashlock
                        },
                        {
                          vname: 'timelock',
                          type: 'Uint128',
                          value: newContract_timelock
                        },
                        {
                          vname: 'amount',
                          type: 'Uint128',
                          value: final_amount.toString()
                        },
                      ],
                      {
                        version: VERSION,
                        amount: new BN(0),
                        gasPrice: minGasPrice,
                        gasLimit: Long.fromNumber(25000),
                      },
                      33,
                      1000,
                      false                        
                    ).then(res => {
                      console.log(res);
                      this.getTransaction(res.ID).then(data => {
                        console.log(data);
                        const events = data.result.receipt.event_logs
                        if (events[0]._eventname === "error") {
                          alert("An error has occured error code: " + events[0].params[0].value);
                        }
                        else {
                          if (events[0]._eventname === "NewContract") {
                            let vals = events[0].params;
                            this.setState({
                              newContractSuccess: true,
                              newContractSuccess_contractId: vals[0].value,
                              newContractSuccess_sender: vals[1].value,
                              newContractSuccess_receiver: vals[2].value,
                              newContractSuccess_amount: vals[3].value,                              
                              newContractSuccess_hashlock: vals[4].value,
                              newContractSuccess_timelock: vals[5].value,
                            });
                          }
                        }
                      });
                    });
                  }}
                >
                  Create Contract
                </Button> 
              </CardActions>
            </Card>          
          </Grid>
        </div>
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
                  onClick={(e) => {this.getHTLCContractState()}}
                >
                  Get Contract Details
                </Button> 
              </CardActions>
            </Card>          
          </Grid>
        }
        { getContract && 
          getContractSuccess && 
          getContractSuccess_receiver == addressBase16.toLowerCase() &&
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
                    e.preventDefault()
                    htlcContract.call(
                      'withdraw',
                      [
                        {
                          vname: 'contractId',
                          type: 'ByStr32',
                          value: getContractSuccess_contractId
                        },
                        {
                          vname: 'preimage',
                          type: "ByStr32",
                          value: withdraw_passcode
                        }
                      ],
                      {
                        version: VERSION,
                        amount: new BN(0),
                        gasPrice: minGasPrice,
                        gasLimit: Long.fromNumber(25000),
                      },
                      33,
                      1000,
                      false                        
                    )
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
          getContractSuccess_sender == addressBase16.toLowerCase() &&
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
                    e.preventDefault();
                    htlcContract.call(
                      'refund',
                      [
                        {
                          vname: 'contractId',
                          type: 'ByStr32',
                          value: getContractSuccess_contractId
                        },
                      ],
                      {
                        version: VERSION,
                        amount: new BN(0),
                        gasPrice: minGasPrice,
                        gasLimit: Long.fromNumber(25000),
                      },
                      33,
                      1000,
                      false                        
                    )
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

export default withStyles(styles)(ZilliqaComp);