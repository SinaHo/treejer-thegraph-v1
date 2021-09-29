
import { RegularMint, RegularSell as RegularSellContract, RegularTreeRequsted, RegularTreeRequstedById, TreePriceUpdated,GiftPerRegularBuyUpdated, RegularPlanterFundSet, ReferrGiftClaimed, LastSoldRegularTreeUpdated } from "../../generated/RegularSell/RegularSell";
import { BatchBuy,  Owner, Tree, Activity,Referrer } from "../../generated/schema";
import { Address, BigInt, log } from '@graphprotocol/graph-ts';
import { COUNTER_ID, getCount_BatchBuy,  getCount_activity, getGlobalData, INCREMENTAL_SELL_ID, ZERO_ADDRESS } from '../helpers';



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

function newReferrer(id: string): Referrer {
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
    rr.date = event.block.timestamp;
    rr.type="regular";
    if (referrerAddress!= ZERO_ADDRESS){
        let regularSellContract = RegularSellContract.bind(event.address);
        let ruu=regularSellContract.reffererRegularCount(referrerAddress.toHexString());
        let rnc=regularSellContract.regularReferrerGifts(referrerAddress.toHexString());
        let referrer: Referrer | null =Referrer.load(referrerAddress);
        if (!referrer) referrer=newReferrer(referrerAddress.toHexString());
        referrer.referredRegular=referrer.referredIncremental.plus(event.params.count as BigInt);
        referrer.regularGifts=referrer.claimedRegularGifts.plus(rnc as BigInt);
        referrer.regularUnused=(ruu as BigInt);
        referrer.save();
        rr.referrer=referrerAddress;

    }
    rr.save();
    let gb = getGlobalData();
    let owner: Owner | null = Owner.load(rr.owner);
    if (!owner) gb.ownerCount=gb.ownerCount.plus(BigInt.fromI32(1));
    if (!owner) owner = newOwner(event.params.buyer.toHexString());
    owner.regularSpent = owner.regularSpent.plus(event.params.amount as BigInt);
    owner.spentDai= owner.spentDai.plus(event.params.amount as BigInt);
    owner.treeCount = owner.treeCount.plus(event.params.count as BigInt);
    owner.regularCount = owner.regularCount.plus(event.params.count as BigInt);
    owner.buyCount=owner.buyCount.plus(BigInt.fromI32(1));
    owner.lastRequestId = rr.id;
    
    owner.save();
    
    let activity = new Activity(getCount_activity(COUNTER_ID).toHexString());
    activity.activityType='regular';
    activity.actor=event.params.buyer.toHexString();
    activity.treeCount=event.params.count as BigInt;
    activity.amount=event.params.amount as BigInt;
    activity.activityReferenceId=rr.id;
    activity.eventDate=event.block.timestamp as BigInt;
    activity.save();
    gb.totalRegularTreeSellAmount = gb.totalRegularTreeSellAmount.plus(event.params.amount as BigInt);
    gb.totalRegularTreeSellCount = gb.totalRegularTreeSellCount.plus(event.params.count as BigInt);
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
    let referrerAddress=event.params.referrer;

    let rr = new BatchBuy(getCount_BatchBuy(COUNTER_ID).toHexString());
    rr.count = BigInt.fromI32(1);
    rr.owner = event.params.buyer.toHexString();
    rr.amount = event.params.amount as BigInt;
    rr.date = event.block.timestamp;
    rr.type="regularById";
    if (referrerAddress!= ZERO_ADDRESS){
        let regularSellContract = RegularSellContract.bind(event.address);
        let ruu=regularSellContract.reffererRegularCount(referrerAddress.toHexString());
        let rnc=regularSellContract.regularReferrerGifts(referrerAddress.toHexString());
        let referrer: Referrer | null =Referrer.load(referrerAddress);
        if (!referrer) referrer=newReferrer(referrerAddress.toHexString());
        referrer.referredRegular=referrer.referredIncremental.plus(BigInt.fromI32(1));
        referrer.regularGifts=referrer.claimedRegularGifts.plus(rnc as BigInt);
        referrer.regularUnused=(ruu as BigInt);
        referrer.save();
        rr.referrer=referrerAddress;

    }
    rr.save();
    let gb = getGlobalData();
    if (!owner) {
        owner = newOwner(event.params.buyer.toHexString());
        gb.ownerCount = gb.ownerCount.plus(BigInt.fromI32(1));
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
    gb.reg
    gb.save();
    let activity = new Activity(getCount_activity(COUNTER_ID).toHexString());
    activity.activityType='regularById';
    activity.actor=event.params.buyer.toHexString();
    activity.treeCount=event.params.count as BigInt;
    activity.amount=event.params.amount as BigInt;
    activity.activityReferenceId=rr.id;
    activity.eventDate=event.block.timestamp as BigInt;
    activity.save();   
}

export function handleTreePriceUpdated(event: TreePriceUpdated): void {
    let gb = getGlobalData();
    gb.regularTreePrice = event.params.price as BigInt;
    gb.save();
}

export function handleRegularPlanterFundSet(event: RegularPlanterFundSet): void {
    let gb = getGlobalData();
    gb.referrerPlanterFund= event.params.regularPlanterFund as BigInt;
    gb.referrerReferralFund= event.params.regularReferralFund as BigInt;
    gb.save();
}


export function handleGiftPerRegularBuyUpdated(event: GiftPerRegularBuyUpdated): void {
    let gb = getGlobalData();
    gb.giftPerRegularBuy= event.params.count as BigInt;
    gb.save();
}

export function handleLastSoldRegularTreeUpdated(event: LastSoldRegularTreeUpdated): void {
    let gb = getGlobalData();
    gb.lastRegularSold = event.params.lastSoldRegularTree as BigInt;
    gb.save();
}


export function handleReferrGiftClaimed(event: ReferrGiftClaimed): void {
    let gb = getGlobalData();
    gb.lastRegularSold = event.params.lastSoldRegularTree as BigInt;
    gb.save();
}



