import {
  Transfer,
  Remove,
  Add,
  Block,
  Token,
  User,
  Pool,
  Proxy,
  TransferNFT
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
  compoundIdToSortableDecimal,
  getAndUpdateAccountTokenBalanceDailyData,
  getAndUpdateAccountTokenBalanceWeeklyData,
  getOrCreateAccountNFTSlot
} from "../index";
import {
  TRANSACTION_TRANSFER_TYPENAME,
  TRANSACTION_ADD_TYPENAME,
  TRANSACTION_REMOVE_TYPENAME,
  TRANSACTION_TRANSFER_NFT_TYPENAME,
  USER_ACCOUNT_THRESHOLD,
  BIGINT_ONE,
  BIGINT_ZERO,
  isNFT
} from "../../constants";

// interface Transfer {
//   accountFromID?: number;
//   accountToID?: number;
//   tokenID?: number;
//   amount?: BN;
//   feeTokenID?: number;
//   fee?: BN;
//   validUntil?: number;
//   storageID?: number;
//   from?: string;
//   to?: string;
//   data?: string;
//   toTokenID?: number;
// }
//
// /**
//  * Processes transfer requests.
//  */
// export class TransferProcessor {
//   public static process(
//     state: ExchangeState,
//     block: BlockContext,
//     txData: Bitstream
//   ) {
//     const transfer = this.extractData(txData);
//
//     const from = state.getAccount(transfer.accountFromID);
//     const to = state.getAccount(transfer.accountToID);
//     if (transfer.to !== Constants.zeroAddress) {
//       to.owner = transfer.to;
//     }
//
//     from.getBalance(transfer.tokenID).balance.isub(transfer.amount);
//     if (Constants.isNFT(transfer.tokenID)) {
//       const nftData = from.getBalance(transfer.tokenID).weightAMM;
//       if (from.getBalance(transfer.tokenID).balance.eq(new BN(0))) {
//         from.getBalance(transfer.tokenID).weightAMM = new BN(0);
//       }
//       to.getBalance(transfer.toTokenID).weightAMM = nftData;
//     }
//
//     to.getBalance(transfer.toTokenID).balance.iadd(transfer.amount);
//
//     from.getBalance(transfer.feeTokenID).balance.isub(transfer.fee);
//
//     // Nonce
//     const storage = from
//       .getBalance(transfer.tokenID)
//       .getStorage(transfer.storageID);
//     storage.storageID = transfer.storageID;
//     storage.data = new BN(1);
//
//     const operator = state.getAccount(block.operatorAccountID);
//     operator.getBalance(transfer.feeTokenID).balance.iadd(transfer.fee);
//
//     return transfer;
//   }
//
//   public static extractData(data: Bitstream) {
//     const transfer: Transfer = {};
//     let offset = 1;
//
//     // Check that this is a conditional update
//     const transferType = data.extractUint8(offset);
//     offset += 1;
//
//     transfer.accountFromID = data.extractUint32(offset);
//     offset += 4;
//     transfer.accountToID = data.extractUint32(offset);
//     offset += 4;
//     transfer.tokenID = data.extractUint16(offset);
//     offset += 2;
//     transfer.amount = fromFloat(
//       data.extractUint24(offset),
//       Constants.Float24Encoding
//     );
//     offset += 3;
//     transfer.feeTokenID = data.extractUint16(offset);
//     offset += 2;
//     transfer.fee = fromFloat(
//       data.extractUint16(offset),
//       Constants.Float16Encoding
//     );
//     offset += 2;
//     transfer.storageID = data.extractUint32(offset);
//     offset += 4;
//     transfer.to = data.extractAddress(offset);
//     offset += 20;
//     transfer.from = data.extractAddress(offset);
//     offset += 20;
//     transfer.toTokenID = data.extractUint16(offset);
//     offset += 2;
//
//     transfer.toTokenID =
//       transfer.toTokenID !== 0 ? transfer.toTokenID : transfer.tokenID;
//
//     return transfer;
//   }
// }

export function processTransfer(
  id: String,
  data: String,
  block: Block,
  proxy: Proxy
): void {
  proxy.transactionCount = proxy.transactionCount + BIGINT_ONE;
  block.transactionCount = block.transactionCount + BIGINT_ONE;

  let transaction = new Transfer(id);
  let offset = 1;

  // Check that this is a conditional update
  transaction.type = extractInt(data, offset, 1);
  offset += 1;

  transaction.accountFromID = extractInt(data, offset, 4);
  offset += 4;
  transaction.accountToID = extractInt(data, offset, 4);
  offset += 4;
  transaction.tokenID = extractInt(data, offset, 2);
  offset += 2;
  transaction.amount = extractBigIntFromFloat(data, offset, 3, 5, 19, 10);
  offset += 3;
  transaction.feeTokenID = extractInt(data, offset, 2);
  offset += 2;
  transaction.fee = extractBigIntFromFloat(data, offset, 2, 5, 11, 10);
  offset += 2;
  transaction.storageID = extractInt(data, offset, 4);
  offset += 4;
  transaction.to = "0x" + extractData(data, offset, 20);
  offset += 20;
  transaction.from = "0x" + extractData(data, offset, 20);
  offset += 20;
  transaction.toTokenID = extractInt(data, offset, 2);
  offset += 2;

  // toTokenID is needed to enable NFT trading, since in case of NFT trading,
  // it will depict the slot on where the NFT is gonna be placed
  transaction.toTokenID =
    transaction.toTokenID != 0 ? transaction.toTokenID : transaction.tokenID;

  let fromAccountId = intToString(transaction.accountFromID);
  let toAccountId = intToString(transaction.accountToID);

  createIfNewAccount(
    transaction.accountFromID,
    transaction.id,
    transaction.from,
    proxy
  );
  createIfNewAccount(
    transaction.accountToID,
    transaction.id,
    transaction.to,
    proxy
  );

  transaction.internalID = compoundIdToSortableDecimal(id);
  transaction.data = data;
  transaction.block = block.id;

  let accounts = new Array<String>();
  accounts.push(fromAccountId);
  accounts.push(toAccountId);

  let feeToken = getToken(intToString(transaction.feeTokenID)) as Token;

  let tokenBalances = new Array<String>();

  if (isNFT(transaction.tokenID)) {
    let coercedTransaction = changetype<TransferNFT>(transaction);
    // NFT Transfer
    // Fee token balance calculation
    let fromAccountTokenFeeBalance = getOrCreateAccountTokenBalance(
      fromAccountId,
      feeToken.id
    );
    fromAccountTokenFeeBalance.balance = fromAccountTokenFeeBalance.balance.minus(
      coercedTransaction.fee
    );

    fromAccountTokenFeeBalance.save();
    tokenBalances.push(fromAccountTokenFeeBalance.id);

    getAndUpdateAccountTokenBalanceDailyData(
      fromAccountTokenFeeBalance,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceWeeklyData(
      fromAccountTokenFeeBalance,
      block.timestamp
    );

    // Operator update
    let operatorTokenFeeBalance = getOrCreateAccountTokenBalance(
      intToString(block.operatorAccountID),
      feeToken.id
    );
    operatorTokenFeeBalance.balance = operatorTokenFeeBalance.balance.plus(
      coercedTransaction.fee
    );
    tokenBalances.push(operatorTokenFeeBalance.id);

    operatorTokenFeeBalance.save();

    let nfts = new Array<String>();
    let slots = new Array<String>();

    // NFT transfer logic
    let fromSlot = getOrCreateAccountNFTSlot(
      coercedTransaction.accountFromID,
      coercedTransaction.tokenID,
      coercedTransaction.id
    );
    let toSlot = getOrCreateAccountNFTSlot(
      coercedTransaction.accountToID,
      coercedTransaction.toTokenID,
      coercedTransaction.id
    );

    slots.push(fromSlot.id);
    slots.push(toSlot.id);

    fromSlot.balance = fromSlot.balance.minus(coercedTransaction.amount);
    toSlot.balance = toSlot.balance.plus(coercedTransaction.amount);

    toSlot.nft = fromSlot.nft;

    if(toSlot.nft != null) {
      nfts.push(toSlot.nft as String);
    }

    if (fromSlot.balance <= BIGINT_ZERO) {
      fromSlot.nft = null;
    }

    toSlot.save();
    fromSlot.save();

    coercedTransaction.fromSlot = fromSlot.id;
    coercedTransaction.toSlot = toSlot.id;

    coercedTransaction.feeToken = feeToken.id;
    coercedTransaction.tokenBalances = tokenBalances;
    coercedTransaction.accounts = accounts;
    coercedTransaction.slots = slots;
    coercedTransaction.nfts = nfts;

    coercedTransaction.fromAccount = fromAccountId;
    coercedTransaction.toAccount = toAccountId;
    coercedTransaction.typename = TRANSACTION_TRANSFER_NFT_TYPENAME;
    coercedTransaction.save();

    proxy.transferNFTCount = proxy.transferNFTCount.plus(BIGINT_ONE);
    block.transferNFTCount = block.transferNFTCount.plus(BIGINT_ONE);
  } else {
    // ERC20 Transfer
    let token = getToken(intToString(transaction.tokenID)) as Token;

    // Token transfer balance calculations
    // Avoid overwriting balance entities
    if (token.id == feeToken.id) {
      let fromAccountTokenBalance = getOrCreateAccountTokenBalance(
        fromAccountId,
        token.id
      );
      fromAccountTokenBalance.balance = fromAccountTokenBalance.balance
        .minus(transaction.amount)
        .minus(transaction.fee);

      fromAccountTokenBalance.save();
      tokenBalances.push(fromAccountTokenBalance.id);

      getAndUpdateAccountTokenBalanceDailyData(
        fromAccountTokenBalance,
        block.timestamp
      );
      getAndUpdateAccountTokenBalanceWeeklyData(
        fromAccountTokenBalance,
        block.timestamp
      );
    } else {
      let fromAccountTokenBalance = getOrCreateAccountTokenBalance(
        fromAccountId,
        token.id
      );
      fromAccountTokenBalance.balance = fromAccountTokenBalance.balance.minus(
        transaction.amount
      );
      fromAccountTokenBalance.save();

      // Fee token balance calculation
      let fromAccountTokenFeeBalance = getOrCreateAccountTokenBalance(
        fromAccountId,
        feeToken.id
      );
      fromAccountTokenFeeBalance.balance = fromAccountTokenFeeBalance.balance.minus(
        transaction.fee
      );

      fromAccountTokenFeeBalance.save();
      tokenBalances.push(fromAccountTokenBalance.id);
      tokenBalances.push(fromAccountTokenFeeBalance.id);

      getAndUpdateAccountTokenBalanceDailyData(
        fromAccountTokenBalance,
        block.timestamp
      );
      getAndUpdateAccountTokenBalanceWeeklyData(
        fromAccountTokenBalance,
        block.timestamp
      );
      getAndUpdateAccountTokenBalanceDailyData(
        fromAccountTokenFeeBalance,
        block.timestamp
      );
      getAndUpdateAccountTokenBalanceWeeklyData(
        fromAccountTokenFeeBalance,
        block.timestamp
      );
    }

    let toAccountTokenBalance = getOrCreateAccountTokenBalance(
      toAccountId,
      token.id
    );
    toAccountTokenBalance.balance = toAccountTokenBalance.balance.plus(
      transaction.amount
    );
    toAccountTokenBalance.save();
    tokenBalances.push(toAccountTokenBalance.id);

    // Operator update
    let operatorTokenFeeBalance = getOrCreateAccountTokenBalance(
      intToString(block.operatorAccountID),
      feeToken.id
    );
    operatorTokenFeeBalance.balance = operatorTokenFeeBalance.balance.plus(
      transaction.fee
    );
    tokenBalances.push(operatorTokenFeeBalance.id);

    transaction.token = token.id;
    transaction.feeToken = feeToken.id;
    transaction.tokenBalances = tokenBalances;
    transaction.accounts = accounts;

    operatorTokenFeeBalance.save();

    getAndUpdateAccountTokenBalanceDailyData(
      operatorTokenFeeBalance,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceWeeklyData(
      operatorTokenFeeBalance,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceDailyData(
      toAccountTokenBalance,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceWeeklyData(
      toAccountTokenBalance,
      block.timestamp
    );

    // Coerce the type of the Transfer at the end, so we can reuse most of the code with no changes.
    // This could be a lot cleaner if we could use interfaces in AssemblyScript
    if (
      transaction.accountToID > USER_ACCOUNT_THRESHOLD &&
      transaction.accountFromID > USER_ACCOUNT_THRESHOLD
    ) {
      proxy.transferCount = proxy.transferCount.plus(BIGINT_ONE);
      block.transferCount = block.transferCount.plus(BIGINT_ONE);

      transaction.fromAccount = fromAccountId;
      transaction.toAccount = toAccountId;
      transaction.typename = TRANSACTION_TRANSFER_TYPENAME;
      transaction.save();
    } else if (transaction.accountToID < USER_ACCOUNT_THRESHOLD) {
      proxy.addCount = proxy.addCount.plus(BIGINT_ONE);
      block.addCount = block.addCount.plus(BIGINT_ONE);

      let coercedTransaction = changetype<Add>(transaction);
      coercedTransaction.account = fromAccountId;
      coercedTransaction.pool = toAccountId;
      coercedTransaction.typename = TRANSACTION_ADD_TYPENAME;
      coercedTransaction.save();
    } else if (transaction.accountFromID < USER_ACCOUNT_THRESHOLD) {
      proxy.removeCount = proxy.removeCount.plus(BIGINT_ONE);
      block.removeCount = block.removeCount.plus(BIGINT_ONE);

      let coercedTransaction = changetype<Remove>(transaction);
      coercedTransaction.account = toAccountId;
      coercedTransaction.pool = fromAccountId;
      coercedTransaction.typename = TRANSACTION_REMOVE_TYPENAME;
      coercedTransaction.save();
    }
  }
}
