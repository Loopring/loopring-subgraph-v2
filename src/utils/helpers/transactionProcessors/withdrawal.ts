import {
  Withdrawal,
  Block,
  Token,
  User,
  Pool
} from "../../../../generated/schema";
import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
import {
  extractData,
  extractBigInt,
  extractInt,
  extractBigIntFromFloat
} from "../data";
import {
  createIfNewAccount,
  getToken,
  intToString,
  getOrCreateAccountTokenBalance,
  compoundIdToSortableDecimal
} from "../index";

// interface Withdrawal {
//   type?: number;
//   from?: string;
//   fromAccountID?: number;
//   tokenID?: number;
//   amount?: BN;
//   feeTokenID?: number;
//   fee?: BN;
//   to?: string;
//   onchainDataHash?: string;
//   minGas?: number;
//   validUntil?: number;
//   storageID?: number;
// }
//
// /**
//  * Processes withdrawal requests.
//  */
// export class WithdrawalProcessor {
//   public static process(
//     state: ExchangeState,
//     block: BlockContext,
//     txData: Bitstream
//   ) {
//     const withdrawal = this.extractData(txData);
//
//     const account = state.getAccount(withdrawal.fromAccountID);
//     if (withdrawal.type === 2) {
//       account.getBalance(withdrawal.tokenID).weightAMM = new BN(0);
//     }
//     account.getBalance(withdrawal.tokenID).balance.isub(withdrawal.amount);
//     account.getBalance(withdrawal.feeTokenID).balance.isub(withdrawal.fee);
//
//     const operator = state.getAccount(block.operatorAccountID);
//     operator.getBalance(withdrawal.feeTokenID).balance.iadd(withdrawal.fee);
//
//     if (withdrawal.type === 0 || withdrawal.type === 1) {
//       // Nonce
//       const storage = account
//         .getBalance(withdrawal.tokenID)
//         .getStorage(withdrawal.storageID);
//       storage.storageID = withdrawal.storageID;
//       storage.data = new BN(1);
//     }
//
//     return withdrawal;
//   }
//
//   public static extractData(data: Bitstream) {
//     const withdrawal: Withdrawal = {};
//     let offset = 1;
//
//     withdrawal.type = data.extractUint8(offset);
//     offset += 1;
//     withdrawal.from = data.extractAddress(offset);
//     offset += 20;
//     withdrawal.fromAccountID = data.extractUint32(offset);
//     offset += 4;
//     withdrawal.tokenID = data.extractUint16(offset);
//     offset += 2;
//     withdrawal.amount = data.extractUint96(offset);
//     offset += 12;
//     withdrawal.feeTokenID = data.extractUint16(offset);
//     offset += 2;
//     withdrawal.fee = fromFloat(
//       data.extractUint16(offset),
//       Constants.Float16Encoding
//     );
//     offset += 2;
//     withdrawal.storageID = data.extractUint32(offset);
//     offset += 4;
//     withdrawal.onchainDataHash = data.extractData(offset, 20);
//     offset += 20;
//
//     return withdrawal;
//   }
// }

export function processWithdrawal(
  id: String,
  data: String,
  block: Block
): void {
  let transaction = new Withdrawal(id);
  transaction.internalID = compoundIdToSortableDecimal(id);
  transaction.data = data;
  transaction.block = block.id;

  let offset = 1;

  transaction.type = extractInt(data, offset, 1);
  offset += 1;
  transaction.from = extractData(data, offset, 20);
  offset += 20;
  transaction.fromAccountID = extractInt(data, offset, 4);
  offset += 4;
  transaction.tokenID = extractInt(data, offset, 2);
  offset += 2;
  transaction.amount = extractBigInt(data, offset, 12);
  offset += 12;
  transaction.feeTokenID = extractInt(data, offset, 2);
  offset += 2;
  transaction.fee = extractBigIntFromFloat(data, offset, 2, 5, 11, 10);
  offset += 2;
  transaction.storageID = extractInt(data, offset, 4);
  offset += 4;
  transaction.onchainDataHash = extractData(data, offset, 20);
  offset += 20;

  let accountId = intToString(transaction.fromAccountID);

  let token = getToken(intToString(transaction.tokenID)) as Token;
  let feeToken = getToken(intToString(transaction.feeTokenID)) as Token;

  createIfNewAccount(
    transaction.fromAccountID,
    transaction.id,
    transaction.from
  );

  let tokenBalances = new Array<String>();

  // Make sure we don't overwrite balance entities
  if (token.id == feeToken.id) {
    let accountTokenBalance = getOrCreateAccountTokenBalance(
      accountId,
      token.id
    );
    accountTokenBalance.balance = accountTokenBalance.balance.minus(
      transaction.amount.minus(transaction.fee)
    );

    accountTokenBalance.save();
    tokenBalances.push(accountTokenBalance.id);
  } else {
    let accountTokenBalance = getOrCreateAccountTokenBalance(
      accountId,
      token.id
    );
    accountTokenBalance.balance = accountTokenBalance.balance.minus(
      transaction.amount
    );
    accountTokenBalance.save();

    let accountTokenFeeBalance = getOrCreateAccountTokenBalance(
      accountId,
      feeToken.id
    );
    accountTokenFeeBalance.balance = accountTokenFeeBalance.balance.minus(
      transaction.fee
    );

    accountTokenFeeBalance.save();

    tokenBalances.push(accountTokenBalance.id);
    tokenBalances.push(accountTokenFeeBalance.id);
  }

  let operatorTokenFeeBalance = getOrCreateAccountTokenBalance(
    intToString(block.operatorAccountID),
    feeToken.id
  );
  operatorTokenFeeBalance.balance = operatorTokenFeeBalance.balance.plus(
    transaction.fee
  );
  tokenBalances.push(operatorTokenFeeBalance.id);

  transaction.fromAccount = accountId;
  transaction.token = token.id;
  transaction.feeToken = feeToken.id;
  transaction.tokenBalances = tokenBalances;

  operatorTokenFeeBalance.save();
  transaction.save();
}
