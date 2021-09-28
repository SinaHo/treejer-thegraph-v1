
import { RegularMint, RegularSell as RegularSellContract, RegularTreeRequsted, RegularTreeRequstedById, TreePriceUpdated } from "../../generated/RegularSell/RegularSell";
import { BatchBuy,  Owner, Tree, Activity } from "../../generated/schema";
import { Address, BigInt, log } from '@graphprotocol/graph-ts';
import { COUNTER_ID, getCount_BatchBuy, getCount_BatchBuy, getCount_updateSpec, getGlobalData, INCREMENTAL_SELL_ID, ZERO_ADDRESS } from '../helpers';



function newOwner(id: string): Owner {
    let owner = new Owner(id);
    owner.treeCount = BigInt.fromI32(0);
    owner.spentWeth = BigInt.fromI32(0);
    owner.spentDai = BigInt.fromI32(0);
    owner.auctionCount = BigInt.fromI32(0);
    owner.regularCount = BigInt.fromI32(0);
    owner.incrementalCount = BigInt.fromI32(0);
    owner.auctionSpent = BigInt.fromI32(0);
    owner.regularSpent = BigInt.fromI32(0);
    owner.incrementalSpent = BigInt.fromI32(0);
    return owner;   
}
function newReferrer(id: string): Owner {
    let referrer = new Referrer(id);
    referrer.referredRegular = BigInt.fromI32(0);
    referrer.regularUnused=BigInt.fromI32(0);
    referrer.referredAuction = BigInt.fromI32(0);
    referrer.referredBid = BigInt.fromI32(0);
    referrer.referredIncremental = BigInt.fromI32(0);
    referrer.genesisGifts = BigInt.fromI32(0);
    referrer.regularGifts = BigInt.fromI32(0);
    referrer.claimedGenesisGifts = BigInt.fromI32(0);
    referrer.claimedRegularGifts = BigInt.fromI32(0);
    return referrer;
}

export function handleRegularTreeRequsted(event: RegularTreeRequsted): void {
    let referrerAddress=event.params.referrer;
    let rr = new BatchBuy(getCount_BatchBuy(COUNTER_ID).toHexString());
    rr.count = event.params.count as BigInt;
    rr.owner = event.params.buyer.toHexString();
    rr.amount = event.params.amount as BigInt;

    rr.referrer=referrerAddress.toHexString();
    rr.date = event.block.timestamp;
    rr.type="regular";
    rr.save();
    if (referrerAddress!= ZERO_ADDRESS){
        if (referrerAddress!= ZERO_ADDRESS){
            let referrer: Referrer | null =Referrer.load(referrerAddress);
            if (!referrer) referrer=new Referrer(referrerAddress.toHexString());
            referrer.referredRegular=referrer.referredIncremental.plus(count as BigInt);
            referrer.genesisGifts=referrer.genesisGifts.plus(count as BigInt);
            referrer.save();
            isr.referrer=referrerAddress;
        }
    }
    let owner: Owner | null = Owner.load(rr.owner);
    if (!owner) gb.ownerCount=gb.ownerCount.plus(BigInt.fromI32(1));
    if (!owner) owner = newOwner(winner.toHexString());
    owner.regularSpent = owner.regularSpent.plus(event.params.amount as BigInt);
    owner.treeCount = owner.treeCount.plus(event.params.count as BigInt);
    owner.regularCount = owner.regularCount.plus(event.params.count as BigInt);
    owner.lastRequestId = rr.id;
    
    owner.save();
    let activity = new Activity(getCount_activity(COUNTER_ID).toHexString());
    activity.activityType='regular';
    activity.actor=event.params.buyer.toHexString();
    activity.treeCount=event.params.count as BigInt;
    activity.amount=event.params.amount as BigInt;
    activity.activityReferenceId=rr.id;
    activity.eventDate=event.block.timestamp as BigInt;
    activity.save()
    let gb = getGlobalData();
    gb.totalRegularTreeSellAmount = gb.totalRegularTreeSellAmount.plus(event.params.amount as BigInt);
    gb.totalRegularTreeSellCount = gb.totalRegularTreeSellCount.plus(event.params.count as BigInt);
    if (flag) gb.ownerCount = gb.ownerCount.plus(BigInt.fromI32(1));
    gb.ownedTreeCount = gb.ownedTreeCount.plus(event.params.count as BigInt);
    gb.save();


}

export function handleRegularMint(event: RegularMint): void {
    let owner = Owner.load(event.params.buyer.toHexString());
    if (!owner) owner = newOwner(event.params.buyer.toHexString());
    let tree = Tree.load(event.params.treeId.toHexString());
    // let tree = RegularTree.load(event.params.treeId.toHexString());
    if (!tree) {
        tree = new Tree(event.params.treeId.toHexString());
    }
    tree.owner = owner.id;
    tree.requestId = owner.lastRequestId;
    tree.save();
}

export function handleRegularTreeRequstedById(event: RegularTreeRequstedById): void {
    let owner = Owner.load(event.params.buyer.toHexString());
    let flag = false;
    if (!owner) {
        owner = newOwner(event.params.buyer.toHexString());
        flag = true;
    }
    owner.regularSpent = owner.regularSpent.plus(event.params.amount as BigInt);
    owner.regularCount = owner.regularCount.plus(BigInt.fromI32(1));
    owner.treeCount = owner.treeCount.plus(BigInt.fromI32(1));
    owner.spentDai = owner.spentDai.plus(event.params.amount as BigInt);
    // owner.spentWeth = owner.spentWeth.plus(event.params.amount as BigInt); // DAI to WETH ???
    owner.treeCount = owner.treeCount.plus(BigInt.fromI32(1));
    let tree = Tree.load(event.params.treeId.toHexString());
    tree.owner = owner.id;
    tree.save();
    owner.save();
    if (flag) {
        let gb = getGlobalData();
        gb.ownerCount = gb.ownerCount.plus(BigInt.fromI32(1));
        gb.save();
    }
}

export function handleTreePriceUpdated(event: TreePriceUpdated): void {
    let gb = getGlobalData();
    gb.regularTreePrice = event.params.price as BigInt;
    gb.save();
}








