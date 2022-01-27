import {
  Deposit,
  Block,
  Token,
  User,
  Pool,
  Proxy
} from "../../../../generated/schema";
import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
import { extractData, extractBigInt, extractInt } from "../data";
import {
  createIfNewAccount,
  getToken,
  intToString,
  getOrCreateAccountTokenBalance,
  compoundIdToSortableDecimal,
  getAndUpdateAccountTokenBalanceDailyData,
  getAndUpdateAccountTokenBalanceWeeklyData
} from "../index";
import { TRANSACTION_DEPOSIT_TYPENAME, BIGINT_ONE } from "../../constants";

// interface Deposit {
//   to?: string;
//   toAccountID?: number;
//   tokenID?: number;
//   amount?: BN;
// }
//
// /**
//  * Processes deposit requests.
//  */
// export class DepositProcessor {
//   public static process(
//     state: ExchangeState,
//     block: BlockContext,
//     txData: Bitstream
//   ) {
//     const deposit = this.extractData(txData);
//
//     const account = state.getAccount(deposit.toAccountID);
//     account.owner = deposit.to;
//
//     const balance = account.getBalance(deposit.tokenID);
//     balance.balance.iadd(deposit.amount);
//
//     return deposit;
//   }
//
//   public static extractData(data: Bitstream) {
//     const deposit: Deposit = {};
//     let offset = 1;
//
//     // Read in the deposit data
//     deposit.to = data.extractAddress(offset);
//     offset += 20;
//     deposit.toAccountID = data.extractUint32(offset);
//     offset += 4;
//     deposit.tokenID = data.extractUint16(offset);
//     offset += 2;
//     deposit.amount = data.extractUint96(offset);
//     offset += 12;
//
//     return deposit;
//   }
// }

export function processDeposit(
  id: String,
  data: String,
  block: Block,
  proxy: Proxy
): void {
  proxy.depositCount = proxy.depositCount.plus(BIGINT_ONE);
  block.depositCount = block.depositCount.plus(BIGINT_ONE);
  proxy.transactionCount = proxy.transactionCount + BIGINT_ONE;
  block.transactionCount = block.transactionCount + BIGINT_ONE;

  let transaction = new Deposit(id);
  transaction.typename = TRANSACTION_DEPOSIT_TYPENAME;
  transaction.internalID = compoundIdToSortableDecimal(id);
  transaction.data = data;
  transaction.block = block.id;

  let offset = 1; // First byte is tx type

  transaction.to = "0x" + extractData(data, offset, 20);
  offset += 20;
  transaction.toAccountID = extractInt(data, offset, 4);
  offset += 4;
  transaction.tokenID = extractInt(data, offset, 2);
  offset += 2;
  transaction.amount = extractBigInt(data, offset, 12);
  offset += 12;

  let accountId = intToString(transaction.toAccountID);

  let token = getToken(intToString(transaction.tokenID)) as Token;
  let tokenBalances = new Array<String>();

  createIfNewAccount(
    transaction.toAccountID,
    transaction.id,
    transaction.to,
    proxy
  );

  let accounts = new Array<String>();
  accounts.push(accountId);

  let accountTokenBalance = getOrCreateAccountTokenBalance(accountId, token.id);
  accountTokenBalance.balance = accountTokenBalance.balance.plus(
    transaction.amount
  );

  tokenBalances.push(accountTokenBalance.id);

  transaction.toAccount = accountId;
  transaction.token = token.id;
  transaction.tokenBalances = tokenBalances;
  transaction.accounts = accounts;

  getAndUpdateAccountTokenBalanceDailyData(
    accountTokenBalance,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceWeeklyData(
    accountTokenBalance,
    block.timestamp
  );

  accountTokenBalance.save();
  transaction.save();
}
