import { Upgraded } from "../../generated/OwnedUpgradabilityProxy/OwnedUpgradabilityProxy";
import { getProxy, getOrCreateExchange } from "../utils/helpers";
import { log } from "@graphprotocol/graph-ts";

export function handleUpgraded(event: Upgraded): void {
  let proxy = getProxy();
  let exchange = getOrCreateExchange(event.params.implementation.toHexString());

  proxy.currentImplementation = exchange.id;

  exchange.proxy = proxy.id;

  proxy.save();
  exchange.save();
}
