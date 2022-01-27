import { Proxy, Exchange } from "../../../generated/schema";
import { Address, log } from "@graphprotocol/graph-ts";
import { BIGINT_ZERO } from "../constants";

export function getProxy(): Proxy {
  let proxy = Proxy.load("0");

  if (proxy == null) {
    proxy = new Proxy("0");
    proxy.tokenCount = BIGINT_ZERO;
    proxy.blockCount = BIGINT_ZERO;
    proxy.transactionCount = BIGINT_ZERO;
    proxy.depositCount = BIGINT_ZERO;
    proxy.withdrawalCount = BIGINT_ZERO;
    proxy.withdrawalNFTCount = BIGINT_ZERO;
    proxy.transferCount = BIGINT_ZERO;
    proxy.transferNFTCount = BIGINT_ZERO;
    proxy.addCount = BIGINT_ZERO;
    proxy.removeCount = BIGINT_ZERO;
    proxy.orderbookTradeCount = BIGINT_ZERO;
    proxy.swapCount = BIGINT_ZERO;
    proxy.swapNFTCount = BIGINT_ZERO;
    proxy.tradeNFTCount = BIGINT_ZERO;
    proxy.accountUpdateCount = BIGINT_ZERO;
    proxy.ammUpdateCount = BIGINT_ZERO;
    proxy.signatureVerificationCount = BIGINT_ZERO;
    proxy.nftMintCount = BIGINT_ZERO;
    proxy.nftDataCount = BIGINT_ZERO;
    proxy.nftCount = BIGINT_ZERO;
    proxy.userCount = BIGINT_ZERO;
    proxy.poolCount = BIGINT_ZERO;

    proxy.save();
  }

  return proxy as Proxy;
}

export function getOrCreateExchange(
  id: String,
  createIfNotFound: boolean = true
): Exchange {
  let exchange = Exchange.load(id);

  if (exchange == null && createIfNotFound) {
    exchange = new Exchange(id);
  }

  return exchange as Exchange;
}
