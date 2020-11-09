export const ZRC2_XSGD_CODE = `
scilla_version 0


import BoolUtils IntUtils

library ProxyContract

let zero = Uint128 0

let one_msg =
fun (msg : Message) =>
let nil_msg = Nil {Message} in
Cons {Message} msg nil_msg

let deconstruct_option_uint128 =
fun (option_uint128 : Option Uint128) =>
match option_uint128 with
| Some a => a
| _ => zero
end

type Error =
| CodeNotAdmin
| CodeNotCurrImpl
let make_error =
fun (result : Error) =>
let result_code = 
match result with
| CodeNotAdmin                  => Int32 -1
| CodeNotCurrImpl               => Int32 -2
end
in
{ _exception : "Error"; code : result_code }



contract ProxyContract
(
contract_owner: ByStr20,
name :    String,
symbol :  String,
decimals : Uint32,
init_supply : Uint128,
init_implementation : ByStr20,
init_admin : ByStr20
)
with
let string_is_not_empty =
fun (s : String) =>
let zero = Uint32 0 in
let s_length = builtin strlen s in
let s_empty = builtin eq s_length zero in
negb s_empty
in
let name_ok = string_is_not_empty name in
let symbol_ok = string_is_not_empty symbol in
let name_symbol_ok = andb name_ok symbol_ok in
let decimals_ok =
let six = Uint32 6 in
let eighteen = Uint32 18 in
let decimals_at_least_6 = uint32_le six decimals in
let decimals_no_more_than_18 = uint32_le decimals eighteen in
andb decimals_at_least_6 decimals_no_more_than_18 in
andb name_symbol_ok decimals_ok
=>

field implementation : ByStr20 = init_implementation
field admin : ByStr20 = init_admin
field balances : Map ByStr20 Uint128
= let emp_map = Emp ByStr20 Uint128 in
builtin put emp_map contract_owner init_supply
field total_supply : Uint128 = init_supply
field allowances : Map ByStr20 (Map ByStr20 Uint128) = Emp ByStr20 (Map ByStr20 Uint128)

procedure ThrowError(err : Error)
e = make_error err;
throw e
end

procedure isAdmin(address: ByStr20)
current_admin <- admin;
is_admin = builtin eq current_admin address;
match is_admin with
| True =>
| False =>
err = CodeNotAdmin;
ThrowError err
end
end

procedure isCurrImpl(address: ByStr20)
current_impl <- implementation;
is_curr_imp = builtin eq current_impl address;
match is_curr_imp with
| True => 
| False =>
err = CodeNotCurrImpl;
ThrowError err
end
end

transition UpgradeTo(newImplementation : ByStr20)
isAdmin _sender;

implementation := newImplementation;
e = {_eventname : "Upgraded"; implementation_address : newImplementation};
event e
end

transition ChangeAdmin(newAdmin : ByStr20)
isAdmin _sender;

currentAdmin <- admin;
admin := newAdmin;
e = {_eventname : "AdminChanged"; oldAdmin : currentAdmin; newAdmin : newAdmin};
event e
end

transition TransferOwnership(newOwner : ByStr20)
current_impl <- implementation;
msg = {_tag : "TransferOwnership"; _recipient : current_impl; _amount : zero;
newOwner : newOwner; initiator : _sender};
msgs = one_msg msg;
send msgs
end

transition Pause()
current_impl <- implementation;
msg = {_tag : "Pause"; _recipient : current_impl; _amount : zero; initiator : _sender};
msgs = one_msg msg;
send msgs
end

transition Unpause()
current_impl <- implementation;
msg = {_tag : "Unpause"; _recipient : current_impl; _amount : zero; initiator : _sender};
msgs = one_msg msg;
send msgs
end

transition UpdatePauser(newPauser : ByStr20)
current_impl <- implementation;
msg = {_tag : "UpdatePauser"; _recipient : current_impl; _amount : zero;
newPauser : newPauser; initiator : _sender};
msgs = one_msg msg;
send msgs
end

transition Blacklist(address : ByStr20)
current_impl <- implementation;
msg = {_tag : "Blacklist"; _recipient : current_impl; _amount : zero;
address : address; initiator : _sender};
msgs = one_msg msg;
send msgs
end

transition Unblacklist(address : ByStr20)
current_impl <- implementation;
msg = {_tag : "Unblacklist"; _recipient : current_impl; _amount : zero;
address : address; initiator : _sender};
msgs = one_msg msg;
send msgs
end

transition UpdateBlacklister(newBlacklister : ByStr20)
current_impl <- implementation;
msg = {_tag : "UpdateBlacklister"; _recipient : current_impl; _amount : zero;
newBlacklister : newBlacklister; initiator : _sender};
msgs = one_msg msg;
send msgs
end

transition Mint(recipient: ByStr20, amount : Uint128)
current_impl <- implementation;
current_supply <- total_supply;
get_to_bal <- balances[recipient];
to_bal = deconstruct_option_uint128 get_to_bal;
msg = {_tag : "Mint"; _recipient : current_impl; _amount : zero; to : recipient;
amount : amount; initiator : _sender; to_bal : to_bal; current_supply : current_supply};
msgs = one_msg msg;
send msgs
end

transition MintCallBack(to: ByStr20, new_to_bal: Uint128, new_supply : Uint128)
isCurrImpl _sender;

balances[to] := new_to_bal;
total_supply := new_supply
end

transition IncreaseAllowance (spender : ByStr20, amount : Uint128)
current_impl <- implementation;

option_allowance <- allowances[_sender][spender];
allowance = deconstruct_option_uint128 option_allowance;

msg = {_tag : "IncreaseAllowance"; _recipient : current_impl; _amount : zero;
spender : spender; amount : amount; initiator : _sender; current_allowance : allowance};
msgs = one_msg msg;
send msgs
end

transition DecreaseAllowance (spender : ByStr20, amount : Uint128)
current_impl <- implementation;

option_allowance <- allowances[_sender][spender];
allowance = deconstruct_option_uint128 option_allowance;

msg = {_tag : "DecreaseAllowance"; _recipient : current_impl; _amount : zero;
spender : spender; amount : amount; initiator : _sender; current_allowance : allowance};
msgs = one_msg msg;
send msgs
end

transition AllowanceCallBack(initiator : ByStr20, spender : ByStr20, new_allowance : Uint128)
isCurrImpl _sender;

allowances[initiator][spender] := new_allowance
end

transition TransferFrom (from : ByStr20, to : ByStr20, amount : Uint128)
current_impl <- implementation;
get_to_bal <- balances[to];
to_bal = deconstruct_option_uint128 get_to_bal;

get_from_bal <- balances[from];
from_bal = deconstruct_option_uint128 get_from_bal;

option_allowance <- allowances[from][_sender];
spender_allowance = deconstruct_option_uint128 option_allowance;

msg = {_tag : "TransferFrom"; _recipient : current_impl; _amount : zero;
from : from; to : to; amount : amount; initiator : _sender; to_bal : to_bal; from_bal : from_bal; spender_allowance : spender_allowance};
msgs = one_msg msg;
send msgs
end

transition TransferFromCallBack(from : ByStr20, to : ByStr20, new_from_bal : Uint128, new_to_bal : Uint128)
isCurrImpl _sender;

balances[to] := new_to_bal;
balances[from] := new_from_bal
end

transition Transfer (to : ByStr20, amount : Uint128)
current_impl <- implementation;
get_to_bal <- balances[to];
to_bal = deconstruct_option_uint128 get_to_bal;
get_init_bal <- balances[_sender];
init_bal = deconstruct_option_uint128 get_init_bal;
msg = {_tag : "Transfer"; _recipient : current_impl; _amount : zero; to : to;
amount : amount; initiator : _sender; to_bal : to_bal; init_bal : init_bal};
msgs = one_msg msg;
send msgs
end

transition TransferCallBack(to : ByStr20, initiator : ByStr20, new_to_bal : Uint128, new_init_bal : Uint128)
isCurrImpl _sender;

balances[to] := new_to_bal;
balances[initiator] := new_init_bal
end

transition Burn(amount : Uint128)
current_impl <- implementation;
current_supply <- total_supply;
get_burn_bal <- balances[_sender];
burn_bal = deconstruct_option_uint128 get_burn_bal;
msg = {_tag : "Burn"; _recipient : current_impl; _amount : zero; amount : amount; initiator : _sender; initiator_balance : burn_bal; current_supply : current_supply};
msgs = one_msg msg;
send msgs
end

transition BurnCallBack(initiator : ByStr20, new_burn_balance : Uint128, new_supply : Uint128)
isCurrImpl _sender;

balances[initiator] := new_burn_balance;
total_supply := new_supply
end

transition LawEnforcementWipingBurn(address : ByStr20)
current_impl <- implementation;
current_supply <- total_supply;
get_addr_bal <- balances[address];
addr_bal = deconstruct_option_uint128 get_addr_bal;
msg = {_tag : "LawEnforcementWipingBurn"; _recipient : current_impl; _amount : zero; address : address; initiator : _sender; addr_bal : addr_bal; current_supply : current_supply};
msgs = one_msg msg;
send msgs
end

transition LawEnforcementWipingBurnCallBack(address : ByStr20, new_supply : Uint128)
isCurrImpl _sender;

balances[address] := zero;
total_supply := new_supply
end

transition IncreaseMinterAllowance(minter : ByStr20, amount : Uint128)
current_impl <- implementation;
msg = {_tag : "IncreaseMinterAllowance"; _recipient : current_impl; _amount : zero; minter : minter;
amount : amount; initiator : _sender};
msgs = one_msg msg;
send msgs
end

transition DecreaseMinterAllowance(minter : ByStr20, amount : Uint128)
current_impl <- implementation;
msg = {_tag : "DecreaseMinterAllowance"; _recipient : current_impl; _amount : zero; minter : minter;
amount : amount; initiator : _sender};
msgs = one_msg msg;
send msgs
end

transition UpdateMasterMinter(newMasterMinter : ByStr20)
current_impl <- implementation;
msg = {_tag : "UpdateMasterMinter"; _recipient : current_impl; _amount : zero; newMasterMinter : newMasterMinter;
initiator : _sender};
msgs = one_msg msg;
send msgs
end

`;

export const ZRC2_HTLC_CODE = `
scilla_version 0

(* XSGDHashTimelock contract *)

(***************************************************)
(*               Associated library                *)
(***************************************************)
import BoolUtils

library XSGDHashTimelock

let one_msg =
  fun (msg : Message) =>
  let nil_msg = Nil {Message} in
  Cons {Message} msg nil_msg

let zero_amount = Uint128 0
let true = True

(* Use a keccak256 hash *)
let hashlockMatches =
  fun (hashlock : Option ByStr32) => fun (preimage : ByStr32) =>
  match hashlock with
  | None => False
  | Some hashlock =>
    let computeHash = builtin keccak256hash preimage in
    builtin eq hashlock computeHash
  end

let realBoolValue =
  fun (boolValue : Option Bool) =>
  match boolValue with
  | None => False
  | Some value =>
    value
  end

let futureTimelock =
  fun (timelock : Uint128) =>
  fun (current_block : BNum) =>
  let zero_block = BNum 0 in
  let timelock_block = builtin badd zero_block timelock in
  builtin blt current_block timelock_block

let already_refunded                      = Uint32 1
let already_withdrawn                     = Uint32 2
let contract_id_does_not_exist            = Uint32 3
let contract_id_exists                    = Uint32 4
let amount_not_positive                   = Uint32 5
let timelock_not_in_future                = Uint32 6
let timelock_in_progress                  = Uint32 7
let preimage_does_not_match               = Uint32 8
let not_receiver                          = Uint32 9
let not_sender                            = Uint32 10
let receiver_does_not_exist               = Uint32 11
let sender_does_not_exist                 = Uint32 12
let timelock_does_not_exist               = Uint32 13
let amount_does_not_exist                 = Uint32 14
let hashlock_does_not_exist               = Uint32 15
let refunded_does_not_exist               = Uint32 16
let withdrawn_does_not_exist              = Uint32 17


(***************************************************)
(*             The contract definition             *)
(***************************************************)

contract XSGDHashTimelock (tokenAddress : ByStr20)

(* Map the hash of contract which serves as id -> params *)
(* This is equivalent to solidity *)
(* mapping (bytes32 => Contract) contracts *)
field contract_sender       : Map ByStr32 ByStr20 = Emp ByStr32 ByStr20
field contract_receiver     : Map ByStr32 ByStr20 = Emp ByStr32 ByStr20
field contract_amount       : Map ByStr32 Uint128 = Emp ByStr32 Uint128
field contract_hashlock     : Map ByStr32 ByStr32 = Emp ByStr32 ByStr32
field contract_timelock     : Map ByStr32 Uint128 = Emp ByStr32 Uint128
field contract_withdrawn    : Map ByStr32 Bool = Emp ByStr32 Bool
field contract_refunded     : Map ByStr32 Bool = Emp ByStr32 Bool
field contract_preimage     : Map ByStr32 ByStr32 = Emp ByStr32 ByStr32


transition newContract (
  receiver : ByStr20, 
  hashlock : ByStr32, 
  timelock : Uint128,
  amount : Uint128
)
  (* Checks *)
  (* Skip tokens transferrable check as it is not possible to query field values in current scilla*)
  (* Rely on failure to execute on XSGD smart conntract *)
  is_amount_valid = builtin lt zero_amount amount;

  current_block <- & BLOCKNUMBER;
  is_future_timelock = futureTimelock timelock current_block;

  match is_future_timelock with
  | True =>
    match is_amount_valid with
    | True =>
      (* Generate contractId *)
      sender_str = builtin to_string _sender;
      timelock_str = builtin to_string timelock;
      amount_str = builtin to_string amount;

      merge1 = builtin concat amount_str timelock_str;
      merge2 = builtin concat receiver hashlock;
      merge2_str = builtin to_string merge2;
      merge =  builtin concat merge2_str merge1;
      final = builtin concat sender_str merge;
      contractId = builtin keccak256hash final;

      is_contract_id_exists <- exists contract_sender[contractId];

      match is_contract_id_exists with
      | True =>
        e = { _eventname : "error"; code : contract_id_exists};
        event e
      | False =>
        (* set up contractId mapping *)
        contract_sender[contractId] :=  _sender;
        contract_receiver[contractId] := receiver;
        contract_amount[contractId] :=  amount;
        contract_hashlock[contractId] := hashlock;
        contract_timelock[contractId] := timelock;
        is_withdrawn = False;
        contract_withdrawn[contractId] := is_withdrawn;
        is_refunded = False;
        contract_refunded[contractId] := is_refunded;

        e = { 
          _eventname : "NewContract"; 
          contractId : contractId; 
          sender : _sender; 
          receiver : receiver; 
          amount : amount; 
          hashlock : hashlock;  
          timelock : timelock
        };
        event e;

        (* Call TransferFrom on XSGD Proxy Contract to transfer XSGD to contract *)
        msg = {
          _tag : "TransferFrom"; 
          _recipient : tokenAddress;
          _amount : zero_amount;
          from : _sender;
          to : _this_address;
          amount: amount
        };
        msgs = one_msg msg;
        send msgs
      end
    | False =>
      e = { _eventname : "error"; code : amount_not_positive};
      event e
    end
  | False =>
    e = { _eventname : "error"; code : timelock_not_in_future};
    event e
  end
end


(* Convenience function *)
transition getContract (contractId : ByStr32)
  is_contract_id_exists <- exists contract_sender[contractId];

  (* Check if contract exists *)
  match is_contract_id_exists with
  | True =>
    sender <- contract_sender[contractId];
    
    match sender with
    | Some sender =>
      receiver <- contract_receiver[contractId];
      
      match receiver with
      | Some receiver =>
        amount <- contract_amount[contractId];
        
        match amount with 
        | Some amount =>
          hashlock <- contract_hashlock[contractId];
          
          match hashlock with
          | Some hashlock =>
            timelock <- contract_timelock[contractId];
            
            match timelock with
            | Some timelock =>
              withdrawn <- contract_withdrawn[contractId];
              
              match withdrawn with
              | Some withdrawn =>
                refunded <- contract_refunded[contractId];
                
                match refunded with
                | Some refunded =>
                  preimage <- contract_preimage[contractId];
                  
                  match preimage with
                  | Some preimage =>
                    e = {
                      _eventname: "getContractWithPreimage";
                      sender: sender;
                      receiver: receiver;
                      amount: amount;
                      hashlock: hashlock;
                      timelock : timelock;
                      withdrawn : withdrawn;
                      refunded : refunded;
                      preimage : preimage
                    };
                    event e
                  
                  | None =>
                    e = {
                      _eventname: "getContractWithoutPreimage";
                      contractId: contractId;
                      sender: sender;
                      receiver: receiver;
                      amount: amount;
                      hashlock: hashlock;
                      timelock : timelock;
                      withdrawn : withdrawn;
                      refunded : refunded
                    };
                    event e                          
                  end
                | None =>
                  e = {_eventname: "error"; code: refunded_does_not_exist};
                  event e
                end
              | None =>
                e = {_eventname: "error"; code: withdrawn_does_not_exist};
                event e
              end
            | None =>
              e = {_eventname: "error"; code: timelock_does_not_exist};
              event e
            end
          | None =>
            e = {_eventname: "error"; code: hashlock_does_not_exist};
            event e
          end
        | None =>
          e = {_eventname : "error"; code: amount_does_not_exist};
          event e
        end
      | None =>
        e = {_eventname : "error"; code: receiver_does_not_exist};
        event e
      end
    | None =>
      e = {_eventname : "error"; code: sender_does_not_exist};
      event e
    end
  | False =>
    e = {_eventname : "error"; code: contract_id_does_not_exist};
    event e
  end
end


transition withdraw (contractId : ByStr32, preimage : ByStr32)
    is_contract_id_exists <- exists contract_sender[contractId];

    (* Check if contract exists *)
    match is_contract_id_exists with
    | True =>
      (* Check if receiver *)
      receiver <- contract_receiver[contractId];
      
      match receiver with
      | Some receiver => 
        is_receiver = builtin eq receiver _sender;

        match is_receiver with
        | True =>
          (* Check if refunded *)
          refunded <- contract_refunded[contractId];
          is_refunded = realBoolValue refunded;
          is_not_refunded = negb is_refunded;

          match is_not_refunded with 
          | True =>
            (* Check if withdrawn *)
            withdrawn <- contract_withdrawn[contractId];
            is_withdrawn = realBoolValue withdrawn;
            is_not_withdrawn = negb is_withdrawn;

            match is_not_withdrawn with
            | True =>
              (* Check if hashlock matches *)
              hashlock <- contract_hashlock[contractId];
              is_preimage_match = hashlockMatches hashlock preimage;

              match is_preimage_match with
              | True =>
                (* Good to go *)
                (* Update contract details *)
                contract_withdrawn[contractId] := true;
                contract_preimage[contractId] := preimage;

                amount <- contract_amount[contractId];
                match amount with
                  
                | Some amount =>
                  e = {
                    _eventname: "Withdraw";
                    contractId: contractId
                  };
                  event e;

                  (* Transfer tokens *)
                  msg = {
                    _tag : "Transfer"; 
                    _recipient : tokenAddress;
                    _amount : zero_amount;
                    to : receiver;
                    amount: amount
                  };
                  msgs = one_msg msg;
                  send msgs
                | None =>
                  e = {_eventname: "error"; code: amount_does_not_exist};
                  event e
                end
              | False =>
                e = { _eventname : "error"; code : preimage_does_not_match};
                event e
              end 
            | False =>
              e = { _eventname: "error"; code : already_withdrawn};
              event e
            end
          | False =>
            e = { _eventname: "error"; code: already_refunded};
            event e
          end
        | False =>
          e = { _eventname: "error"; code : not_receiver};
          event e
        end          
      | None =>
        e = { _eventname : "error"; code : receiver_does_not_exist};
        event e
        end
    | False =>
        e = { _eventname : "error"; code : contract_id_does_not_exist};
        event e
    end
end


transition refund (contractId : ByStr32)
  is_contract_id_exists <- exists contract_sender[contractId];

  (* Check if contract exists *)
  match is_contract_id_exists with
  | True =>
    (* Check if sender *)
    sender <- contract_sender[contractId];
    
    match sender with
    | Some sender =>
      is_sender = builtin eq sender _sender;

      match is_sender with
      | True =>
        (* Check if refunded *)
        refunded <- contract_refunded[contractId];
        is_refunded = realBoolValue refunded;
        is_not_refunded = negb is_refunded;

        match is_not_refunded with 
        | True =>
          (* Check if withdrawn *)
          withdrawn <- contract_withdrawn[contractId];
          is_withdrawn = realBoolValue withdrawn;
          is_not_withdrawn = negb is_withdrawn;

          match is_not_withdrawn with
          | True =>
            (* Check if timelock has passed *)
            current_block <- & BLOCKNUMBER;
            timelock <- contract_timelock[contractId];
            
            match timelock with
            | Some timelock =>
              is_timelocked = futureTimelock timelock current_block;
              is_not_timelocked = negb is_timelocked;

              match is_not_timelocked with
              | True =>
                (* Good to go *)
                (* Update contract details *)
                contract_refunded[contractId] := true;

                amount <- contract_amount[contractId];
                
                match amount with
                | Some amount =>
                  e = {
                    _eventname: "Refund";
                    contractId: contractId
                  };
                  event e;
    
                  (* Transfer tokens *)
                  msg = {
                    _tag : "Transfer"; 
                    _recipient : tokenAddress;
                    _amount : zero_amount;
                    to : sender;
                    amount: amount
                  };
                  msgs = one_msg msg;
                  send msgs
  
                | None =>
                  e = {_eventname: "error"; code: amount_does_not_exist};
                  event e
                end

              | False =>
                e = { _eventname : "error"; code : timelock_in_progress};
                event e
              end 
            | None =>
              e = { _eventname : "error"; code : timelock_does_not_exist};
              event e
            end
          | False =>
            e = { _eventname: "error"; code : already_withdrawn};
            event e
          end
        | False =>
          e = { _eventname: "error"; code: already_refunded};
          event e
        end
      | False =>
          e = { _eventname: "error"; code : not_receiver};
          event e
      end
    | None =>
      e = { _eventname : "error"; code : sender_does_not_exist};
      event e
    end
  | False =>
    e = { _eventname : "error"; code : contract_id_does_not_exist};
    event e
  end
end


(* ZRC-2 callbacks *)

transition RecipientAcceptTransferFrom (initiator : ByStr20, sender : ByStr20, recipient : ByStr20, amount : Uint128)
end

transition TransferFromSuccessCallBack (initiator : ByStr20, sender : ByStr20, recipient : ByStr20, amount : Uint128)
end

transition TransferSuccessCallBack (sender : ByStr20, recipient : ByStr20, amount : Uint128)
end
`