import {
  SignatureVerification,
  Block,
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
  compoundIdToSortableDecimal
} from "../index";
import {
  TRANSACTION_SIGNATURE_VERIFICATION_TYPENAME,
  BIGINT_ONE
} from "../../constants";

// interface SignatureVerification {
//   owner?: string;
//   accountID?: number;
//   data?: string;
// }
//
// /**
//  * Processes signature verification requests.
//  */
// export class SignatureVerificationProcessor {
//   public static process(
//     state: ExchangeState,
//     block: BlockContext,
//     txData: Bitstream
//   ) {
//     const verification = this.extractData(txData);
//     return verification;
//   }
//
//   public static extractData(data: Bitstream) {
//     const verification: SignatureVerification = {};
//     let offset = 1;
//
//     verification.owner = data.extractAddress(offset);
//     offset += 20;
//     verification.accountID = data.extractUint32(offset);
//     offset += 4;
//     verification.data = data.extractBytes32(offset).toString("hex");
//     offset += 32;
//
//     return verification;
//   }
// }

export function processSignatureVerification(
  id: String,
  data: String,
  block: Block,
  proxy: Proxy
): void {
  proxy.signatureVerificationCount = proxy.signatureVerificationCount.plus(
    BIGINT_ONE
  );
  block.signatureVerificationCount = block.signatureVerificationCount.plus(
    BIGINT_ONE
  );
  proxy.transactionCount = proxy.transactionCount + BIGINT_ONE;
  block.transactionCount = block.transactionCount + BIGINT_ONE;

  let transaction = new SignatureVerification(id);
  transaction.typename = TRANSACTION_SIGNATURE_VERIFICATION_TYPENAME;
  transaction.internalID = compoundIdToSortableDecimal(id);
  transaction.data = data;
  transaction.block = block.id;

  let offset = 1;

  transaction.owner = "0x" + extractData(data, offset, 20);
  offset += 20;
  transaction.accountID = extractInt(data, offset, 4);
  offset += 4;
  transaction.verificationData = extractData(data, offset, 32);
  offset += 32;

  let accountId = intToString(transaction.accountID);

  createIfNewAccount(
    transaction.accountID,
    transaction.id,
    transaction.owner,
    proxy
  );

  let accounts = new Array<String>();
  accounts.push(accountId);

  transaction.account = accountId;
  transaction.accounts = accounts;
  transaction.save();
}
