// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

/**
 * @title Cross Chain Hash Timelock Atomic Swap Agreements for ERC20 to ZRC2 on Zilliqa
 * 
 * The key purpose of this contract is to swap ERC20 XSGD tokens to ZRC2 XSGD tokens
 * The ethereum side of the timelock handles the hashlock part
 * 
 * implementation adapted from: https://github.com/chatch/hashed-timelock-contract-ethereum/blob/master/contracts/HashedTimelockERC20.sol 
 */
 
contract XSGDHashTimelock {
    // This is the token address for the ERC20 XSGD contract.
    // As this contract would be needed to interface with the Zilliqa chain
    // a generic tokenAddress for all contracts should be prohibited.
    address public tokenAddress;

    constructor(address _tokenAddress) public {
        tokenAddress = _tokenAddress;
    }

    event NewContract(
        // Ethereum parameters
        bytes32 indexed contractId,
        address indexed sender, 
        address indexed receiver,

        // Agreement params
        uint256 amount,
        bytes32 hashlock,
        uint256 timelock  // using block number
    );

    event Withdraw(bytes32 indexed contractId);
    event Refund(bytes32 indexed contractId);

    struct Contract {
        address sender;
        address receiver;
        uint256 amount;
        bytes32 hashlock;
        uint256 timelock;
        bool withdrawn;
        bool refunded;
        bytes32 preimage;
    }

    modifier tokensTransferable(address _sender, uint256 _amount) {
        require(_amount > 0, "token amount must be > 0");
        require(
            ERC20(tokenAddress).allowance(_sender, address(this)) >= _amount,
            "token allowance must be >= amount"
        );
        _;
    }

    modifier futureTimelock(uint256 _blocknum) {
        require(_blocknum > block.number, "Timelock must be in the future");
        _;
    }

    modifier contractExists(bytes32 _contractId) {
        require(haveContract(_contractId), "contractId does not exist");
        _;
    }

    modifier hashlockMatches(bytes32 _contractId, bytes32 preimage) {
        require(
            contracts[_contractId].hashlock == keccak256(abi.encodePacked(preimage)),
            "preimage does not match hash"
        );
        _;
    }
    
    // allow withdrawal when timelock has passed
    // timelock is meant to prevent sender from withdrawing prematurely
    modifier withdrawable(bytes32 _contractId) {
        require(
            contracts[_contractId].receiver == msg.sender,
            "Not receiver"
        );
        require(
            contracts[_contractId].refunded == false,
            "Already refunded"
        );
        require(
            contracts[_contractId].withdrawn == false,
            "Already withdrawn"
        );
        _;
    }

    modifier refundable(bytes32 _contractId) {
        require(
            contracts[_contractId].sender == msg.sender,
            "Not sender"
        );
        require(
            contracts[_contractId].refunded == false,
            "Already refunded"
        );
        require(
            contracts[_contractId].withdrawn == false,
            "Already withdrawn"
        );
        require(
            contracts[_contractId].timelock <= block.number,
            "Timelock not yet passed"
        );
        _;
    }

    mapping (bytes32 => Contract) contracts;

     /**
     * @dev Sender / Payer sets up a new hash time lock contract depositing the
     * funds and providing the reciever and terms.
     *
     * NOTE: _receiver must first call approve() on the token contract.
     *       See allowance check in tokensTransferable modifier.
     * @param _receiver Receiver of the tokens.
     * @param _hashlock keccak256 hash hashlock.
     * @param _timelock Block number the contract expires
     *                  Refunds can be made after this time.
     * @param _amount Amount of the token to lock up.
     * @return contractId Id of the new HTLC. This is needed for subsequent
     *                    calls.
     */
    function newContract(
        address _receiver,
        bytes32 _hashlock,
        uint256 _timelock,
        uint256 _amount
    )
        external
        tokensTransferable(msg.sender, _amount)
        futureTimelock(_timelock)
        returns (bytes32 contractId)
    {
        contractId = keccak256(
            abi.encodePacked(
                msg.sender,
                _receiver,
                tokenAddress,
                _amount,
                _hashlock,
                _timelock
            )
        );

        // Reject if a contract already exists with the same parameters. The
        // sender must change one of these parameters (ideally providing a
        // different _hashlock).
        if (haveContract(contractId))
            revert("Contract already exists");

        // This contract becomes the temporary owner of the tokens
        if (!ERC20(tokenAddress).transferFrom(msg.sender, address(this), _amount))
            revert("transferFrom sender to this failed");

        contracts[contractId] = Contract(
            msg.sender,
            _receiver,
            _amount,
            _hashlock,
            _timelock,
            false,
            false,
            0x0
        );

        emit NewContract(
            contractId,
            msg.sender,
            _receiver,
            _amount,
            _hashlock,
            _timelock
        );
    }

    /**
    * @dev Called by the receiver once they know the preimage of the hashlock.
    * This will transfer ownership of the locked tokens to their address.
    *
    * @param _contractId Id of the HTLC.
    * @param _preimage sha256(_preimage) should equal the contract hashlock.
    * @return bool true on success
     */
    function withdraw(bytes32 _contractId, bytes32 _preimage)
        external
        contractExists(_contractId)
        hashlockMatches(_contractId, _preimage)
        withdrawable(_contractId)
        returns (bool)
    {
        Contract storage c = contracts[_contractId];
        c.preimage = _preimage;
        c.withdrawn = true;
        ERC20(tokenAddress).transfer(c.receiver, c.amount);
        emit Withdraw(_contractId);
        return true;
    }

    /**
     * @dev Called by the sender if there was no withdraw AND the time lock has
     * expired. This will restore ownership of the tokens to the sender.
     *
     * @param _contractId Id of HTLC to refund from.
     * @return bool true on success
     */
    function refund(bytes32 _contractId)
        external
        contractExists(_contractId)
        refundable(_contractId)
        returns (bool)
    {
        Contract storage c = contracts[_contractId];
        c.refunded = true;
        ERC20(tokenAddress).transfer(c.sender, c.amount);
        emit Refund(_contractId);
        return true;
    }

    /**
     * @dev Get contract details.
     * @param _contractId HTLC contract id
     */
    function getContract(bytes32 _contractId)
        public
        view
        returns (
            address sender,
            address receiver,
            uint256 amount,
            bytes32 hashlock,
            uint256 timelock,
            bool withdrawn,
            bool refunded,
            bytes32 preimage
        )
    {
        if (haveContract(_contractId) == false)
            return (address(0), address(0), 0, 0, 0, false, false, 0);
        Contract storage c = contracts[_contractId];
        return (
            c.sender,
            c.receiver,
            c.amount,
            c.hashlock,
            c.timelock,
            c.withdrawn,
            c.refunded,
            c.preimage
        );
    }

    function haveContract(bytes32 _contractId) 
        internal
        view
        returns (bool exists)
    {
        exists = (contracts[_contractId].sender != address(0));
    }

}