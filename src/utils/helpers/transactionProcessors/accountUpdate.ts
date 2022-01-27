import {
  AccountUpdate,
  Block,
  Token,
  Proxy
} from "../../../../generated/schema";
import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
import {
  extractData,
  extractBigInt,
  extractInt,
  extractBigIntFromFloat
} from "../data";
import {
  getOrCreateUser,
  getToken,
  intToString,
  getOrCreateAccountTokenBalance,
  compoundIdToSortableDecimal,
  getAndUpdateAccountTokenBalanceDailyData,
  getAndUpdateAccountTokenBalanceWeeklyData
} from "../index";
import {
  TRANSACTION_ACCOUNT_UPDATE_TYPENAME,
  BIGINT_ONE
} from "../../constants";

// interface AccountUpdate {
//   owner?: string;
//   accountID?: number;
//   feeTokenID?: number;
//   fee?: BN;
//   publicKeyX?: string;
//   publicKeyY?: string;
//   validUntil?: number;
//   nonce?: number;
// }
//
// /**
//  * Processes account update requests.
//  */
// export class AccountUpdateProcessor {
//   public static process(
//     state: ExchangeState,
//     block: BlockContext,
//     txData: Bitstream
//   ) {
//     const update = AccountUpdateProcessor.extractData(txData);
//
//     const account = state.getAccount(update.accountID);
//     account.owner = update.owner;
//     account.publicKeyX = update.publicKeyX;
//     account.publicKeyY = update.publicKeyY;
//     account.nonce++;
//
//     const balance = account.getBalance(update.feeTokenID);
//     balance.balance.isub(update.fee);
//
//     const operator = state.getAccount(block.operatorAccountID);
//     const balanceO = operator.getBalance(update.feeTokenID);
//     balanceO.balance.iadd(update.fee);
//
//     return update;
//   }
//
//   public static extractData(data: Bitstream) {
//     const update: AccountUpdate = {};
//     let offset = 1;
//
//     const updateType = data.extractUint8(offset);
//     offset += 1;
//     update.owner = data.extractAddress(offset);
//     offset += 20;
//     update.accountID = data.extractUint32(offset);
//     offset += 4;
//     update.feeTokenID = data.extractUint16(offset);
//     offset += 2;
//     update.fee = fromFloat(
//       data.extractUint16(offset),
//       Constants.Float16Encoding
//     );
//     offset += 2;
//     const publicKey = data.extractData(offset, 32);
//     offset += 32;
//     update.nonce = data.extractUint32(offset);
//     offset += 4;
//
//     // Unpack the public key
//     const unpacked = EdDSA.unpack(publicKey);
//     update.publicKeyX = unpacked.publicKeyX;
//     update.publicKeyY = unpacked.publicKeyY;
//
//     return update;
//   }
// }

export function processAccountUpdate(
  id: String,
  data: String,
  block: Block,
  proxy: Proxy
): void {
  proxy.accountUpdateCount = proxy.accountUpdateCount.plus(BIGINT_ONE);
  block.accountUpdateCount = block.accountUpdateCount.plus(BIGINT_ONE);
  proxy.transactionCount = proxy.transactionCount + BIGINT_ONE;
  block.transactionCount = block.transactionCount + BIGINT_ONE;

  let transaction = new AccountUpdate(id);
  transaction.typename = TRANSACTION_ACCOUNT_UPDATE_TYPENAME;
  transaction.internalID = compoundIdToSortableDecimal(id);
  transaction.data = data;
  transaction.block = block.id;

  let offset = 1;

  transaction.updateType = extractInt(data, offset, 1);
  offset += 1;
  transaction.owner = extractData(data, offset, 20);
  offset += 20;
  transaction.accountID = extractInt(data, offset, 4);
  offset += 4;
  transaction.feeTokenID = extractInt(data, offset, 2);
  offset += 2;
  transaction.fee = extractBigIntFromFloat(data, offset, 2, 5, 11, 10);
  offset += 2;
  transaction.publicKey = extractData(data, offset, 32);
  offset += 32;
  transaction.nonce = extractInt(data, offset, 4);
  offset += 4;

  let user = getOrCreateUser(
    intToString(transaction.accountID),
    transaction.id,
    transaction.owner,
    proxy
  );
  user.publicKey = transaction.publicKey;
  user.lastUpdatedAt = transaction.internalID;
  user.lastUpdatedAtTransaction = transaction.id;

  let tokenBalances = new Array<String>();
  let accounts = new Array<String>();
  accounts.push(user.id);

  let feeToken = getToken(intToString(transaction.feeTokenID)) as Token;

  let accountTokenFeeBalance = getOrCreateAccountTokenBalance(
    user.id,
    feeToken.id
  );
  accountTokenFeeBalance.balance = accountTokenFeeBalance.balance.minus(
    transaction.fee
  );
  accountTokenFeeBalance.save();
  tokenBalances.push(accountTokenFeeBalance.id);

  let operatorTokenFeeBalance = getOrCreateAccountTokenBalance(
    intToString(block.operatorAccountID),
    feeToken.id
  );
  operatorTokenFeeBalance.balance = operatorTokenFeeBalance.balance.plus(
    transaction.fee
  );
  operatorTokenFeeBalance.save();
  tokenBalances.push(operatorTokenFeeBalance.id);

  transaction.user = user.id;
  transaction.feeToken = feeToken.id;
  transaction.tokenBalances = tokenBalances;
  transaction.accounts = accounts;

  getAndUpdateAccountTokenBalanceDailyData(
    accountTokenFeeBalance,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceWeeklyData(
    accountTokenFeeBalance,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceDailyData(
    operatorTokenFeeBalance,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceWeeklyData(
    operatorTokenFeeBalance,
    block.timestamp
  );

  user.save();
  transaction.save();
}
