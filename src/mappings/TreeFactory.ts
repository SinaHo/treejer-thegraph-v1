import { Counter, Planter, RegularTree, Tree, TreeSpec, UpdateTree } from '../../generated/schema';
import { AddTreeCall, AssignTreeToPlanterCall, PlantRejected, PlantVerified, RegularPlantRejected, RegularPlantVerified, RegularTreePlanted, TreeAdded, TreeAssigned, TreeFactory as TreeFactoryContract, TreeFactory__regularTreesResult, TreeFactory__treeDataResult, TreeFactory__updateTreesResult, TreePlanted, TreeUpdated, UpdateRejected, UpdateVerified } from '../../generated/TreeFactory/TreeFactory';
import { Address, BigInt, JSONValue, log, Value, ipfs, json, Bytes, BigDecimal, } from '@graphprotocol/graph-ts';
import { COUNTER_ID, getCount_treeSpecs, getCount_updateSpec, ZERO_ADDRESS } from '../helpers';

/**
 * 
 struct TreeStruct {
        address planterId;
        uint256 treeType;
        uint16 mintStatus;
        uint16 countryCode;
        uint32 provideStatus;
        uint64 treeStatus;
        uint64 plantDate;
        uint64 birthDate;
        string treeSpecs;
    }


     struct UpdateTree {
        string updateSpecs;
        uint64 updateStatus;
    }

    struct RegularTree {
        uint64 birthDate;
        uint64 plantDate;
        uint64 countryCode;
        uint64 otherData;
        address planterAddress;
        string treeSpecs;
    }
 */
function setRegularTreeData(rtree: RegularTree | null, c_rtree: TreeFactory__regularTreesResult): void {
    if (rtree === null) return;
    rtree.birthDate = c_rtree.value0 as BigInt;
    rtree.plantDate = c_rtree.value1 as BigInt;
    rtree.countryCode = c_rtree.value2 as BigInt;
    rtree.planter = c_rtree.value4.toHexString();
    rtree.treeSpecs = c_rtree.value5;

}
function setTreeData(tree: Tree | null, c_tree: TreeFactory__treeDataResult): void {
    if (tree === null) return;
    tree.planter = c_tree.value0.toHexString();
    tree.treeType = c_tree.value1 as BigInt;
    tree.mintStatus = c_tree.value2.toString();
    tree.countryCode = c_tree.value3.toString();
    tree.provideStatus = c_tree.value4 as BigInt;
    tree.treeStatus = c_tree.value5 as BigInt;
    tree.plantDate = c_tree.value6 as BigInt;
    tree.birthDate = c_tree.value7 as BigInt;
    tree.treeSpecs = c_tree.value8.toString();
}
function setUpTreeData(uptree: UpdateTree | null, c_uptree: TreeFactory__updateTreesResult): void {
    if (uptree === null) return;
    uptree.treeSpecs = c_uptree.value0.toString();
    uptree.status = c_uptree.value1 as BigInt;
}
function copyTree(t1: Tree | null, t2: Tree | null): void {
    if (t1 === null || t2 === null) return;
    t1.birthDate = t2.birthDate;
    t1.countryCode = t2.countryCode;
    t1.mintStatus = t2.mintStatus;
    t1.owner = t2.owner;
    t1.treeType = t2.treeType;
    t1.treeStatus = t2.treeStatus;
    t1.treeSpecs = t2.treeSpecs;
    t1.treeAttribute = t2.treeAttribute;
    t1.provideStatus = t2.provideStatus;
    t1.planter = t2.planter;
    t1.plantDate = t2.plantDate;
}
function upsertTree(tree: Tree | null): void {
    if (tree === null) return;
    let t = Tree.load(tree.id);
    if (t !== null) {
        copyTree(t, tree);
        t.save();
    } else {
        tree.save();
    }
}

export function saveTreeSpec(value: JSONValue, userData: Value): void {
    if (value.isNull()) { return; }
    let obj = value.toObject();
    let name = obj.get('name').toString();
    let description = obj.get('description').toString();
    let external_url = obj.get('external_url').toString();
    let image = obj.get('image').toString();
    let image_ipfs_hash = obj.get('image_ipfs_hash').toString();
    let symbol = obj.get('symbol').toString();
    let symbol_ipfs_hash = obj.get('symbol_ipfs_hash').toString();
    let animation_url = obj.get('animation_url').toString();
    let diameter = obj.get('diameter').toBigInt();
    let location = obj.get('location').toObject();
    let attributes = obj.get('attributes').toArray();

    let attrStr = "[";
    for (let i = 0; i < attributes.length; i++) {
        let el = attributes[i];
        attrStr += "{";
        let trait_type = el.toObject().get("trait_type").toString();
        if (trait_type == "birthday") {
            attrStr += '"trait_type":"' + trait_type + '","value":"' + el.toObject().get("value").toBigInt().toString() + '","display_type":"date"';
        } else {
            attrStr += '"trait_type":"' + trait_type + '","value":"' + el.toObject().get("value").toString() + '"';
        }
        attrStr += "},";
    }
    attrStr += "]";
    let treeSpec = new TreeSpec(getCount_treeSpecs(COUNTER_ID).toHexString());
    treeSpec.name = name;
    treeSpec.description = description;
    treeSpec.externalUrl = external_url;
    treeSpec.imageFs = image;
    treeSpec.imageHash = image_ipfs_hash;
    treeSpec.symbolFs = symbol;
    treeSpec.symbolHash = symbol_ipfs_hash;
    treeSpec.animationUrl = animation_url;
    treeSpec.diameter = diameter;
    // log.warning("longtitude === {}", []);
    treeSpec.longitude = (location.get("longitude").data.toString());
    treeSpec.latitude = (location.get('latitude').data.toString());
    treeSpec.attributes = attrStr;
    treeSpec.save();

    let tree = Tree.load(userData.toString());
    if (tree) {
        tree.treeSpecsEntity = treeSpec.id;
        tree.save();
    } else {
        let rtree = RegularTree.load(userData.toString());
        rtree.treeSpecsEntity = treeSpec.id;
        rtree.save();
    }
}

function handleTreeSpecs(hash: string, treeId: string): void {
    let data = ipfs.cat(hash);
    if (data) {
        let dd = data.toString();
        if (dd.length > 0) {
            let jsonValue = json.fromBytes(data as Bytes);
            saveTreeSpec(jsonValue, Value.fromString(treeId));
        }
    }
}
export function handleTreePlanted(event: TreePlanted): void {
    let treeFactoryContract = TreeFactoryContract.bind(event.address);
    let treeId = event.params.treeId.toHexString();

    // log.debug("treeID {}", [treeId]);
    let tree = new Tree(treeId);
    // log.debug("BIGINT treeId {}", [BigInt.fromString(treeId)])
    let c_tree = treeFactoryContract.treeData(event.params.treeId);
    // log.debug("ctree planter: {}", [c_tree.value0.toHexString()]);
    let c_uptree = treeFactoryContract.updateTrees(event.params.treeId);
    setTreeData(tree, c_tree);

    upsertTree(tree);
    let uptree = new UpdateTree(getCount_updateSpec(COUNTER_ID).toHexString());
    uptree.treeSpecs = c_uptree.value0.toString();
    uptree.tree = treeId;
    uptree.updateDate = event.block.timestamp as BigInt;
    uptree.status = BigInt.fromString(c_uptree.value1.toString());
    uptree.type = true;
    tree.treeStatus = BigInt.fromI32(3);
    uptree.save();
    tree.lastUpdate = uptree.id;
    tree.save();

    // ipfs.mapJSON(tree.treeSpecs'saveTreeSpec', Value.fromString(tree.id));
    handleTreeSpecs(tree.treeSpecs, tree.id);
    let planter = Planter.load(tree.planter);
    if (!planter) return;
    planter.plantedCount = planter.plantedCount.plus(BigInt.fromI32(1));
    if (planter.plantedCount.equals(planter.capacity as BigInt)) {
        planter.status = BigInt.fromI32(2);
    }
    planter.save();

}

export function handleTreeAdded(event: TreeAdded): void {
    let tree = new Tree(event.params.treeId.toHexString());
    let treeFactoryContract = TreeFactoryContract.bind(event.address);
    let c_tree = treeFactoryContract.treeData(event.params.treeId);
    setTreeData(tree, c_tree);
    tree.treeStatus = BigInt.fromI32(2);
    tree.save();
    handleTreeSpecs(tree.treeSpecs, tree.id);
    // ipfs.mapJSON(tree.treeSpecs, 'saveTreeSpec', Value.fromString(tree.id));
}

export function handleTreeAssigned(event: TreeAssigned): void {
    let tree = Tree.load(event.params.treeId.toHexString());
    if (!tree) return;
    let treeFactoryContract = TreeFactoryContract.bind(event.address);
    let c_tree = treeFactoryContract.treeData(event.params.treeId);
    setTreeData(tree, c_tree);
    tree.save();
    handleTreeSpecs(tree.treeSpecs, tree.id);
    // ipfs.mapJSON(tree.treeSpecs, 'saveTreeSpec', Value.fromString(tree.id));
}

export function handlePlantVerified(event: PlantVerified): void {
    let tree = Tree.load(event.params.treeId.toHexString());
    if (!tree) return;
    let treeFactoryContract = TreeFactoryContract.bind(event.address);
    let c_tree = treeFactoryContract.treeData(event.params.treeId);
    setTreeData(tree, c_tree);
    tree.treeStatus = BigInt.fromI32(4);
    let uptree = UpdateTree.load(tree.lastUpdate);
    uptree.status = BigInt.fromI32(3);
    let planter = Planter.load(tree.planter);
    planter.verifiedPlantedCount = planter.verifiedPlantedCount.plus(BigInt.fromI32(1));
    planter.save();
    uptree.save();
    tree.save();
    handleTreeSpecs(tree.treeSpecs, tree.id);
    // ipfs.mapJSON(tree.treeSpecs, 'saveTreeSpec', Value.fromString(tree.id));
}

export function handlePlantRejected(event: PlantRejected): void {
    let tree = Tree.load(event.params.treeId.toHexString());
    if (!tree) return;
    let planter = Planter.load(tree.planter);
    if (planter) {
        planter.plantedCount = planter.plantedCount.minus(BigInt.fromI32(1));
        if (planter.status.equals(BigInt.fromI32(2))) {
            planter.status = BigInt.fromI32(1);
        }
        planter.save();
    }
    let uptree = UpdateTree.load(tree.lastUpdate);
    uptree.status = BigInt.fromI32(2);
    uptree.save();
    tree.treeStatus = BigInt.fromI32(2);
    tree.save();
    // ipfs.mapJSON(tree.treeSpecs, 'saveTreeSpec', Value.fromString(tree.id));
}

export function handleRegularTreePlanted(event: RegularTreePlanted): void {
    let rtree = new RegularTree(event.params.treeId.toHexString());
    let treeFactoryContract = TreeFactoryContract.bind(event.address);
    let c_rtree = treeFactoryContract.regularTrees(event.params.treeId);
    setRegularTreeData(rtree, c_rtree);
    rtree.status = BigInt.fromI32(0);
    rtree.save();
    let planter = Planter.load(rtree.planter);
    planter.plantedCount = planter.plantedCount.plus(BigInt.fromI32(1));
    if (planter.plantedCount.equals(planter.capacity as BigInt)) {
        planter.status = BigInt.fromI32(2);
    }
    planter.save();
    handleTreeSpecs(rtree.treeSpecs, rtree.id);
}

export function handleRegularPlantVerified(event: RegularPlantVerified): void {
    let rtree = new RegularTree(event.params.treeId.toHexString());
    let treeFactoryContract = TreeFactoryContract.bind(event.address);
    let c_rtree = treeFactoryContract.regularTrees(event.params.treeId);
    setRegularTreeData(rtree, c_rtree);
    rtree.status = BigInt.fromI32(4);
    let tree = Tree.load(event.params.treeId.toHexString());
    if (!tree) {
        tree = new Tree(event.params.treeId.toHexString());
    }
    // log.warning("planter {} ", [rtree.planter]);
    tree.planter = rtree.planter;
    tree.birthDate = rtree.birthDate;
    tree.plantDate = rtree.plantDate as BigInt;
    tree.countryCode = rtree.countryCode.toString();
    tree.treeSpecs = rtree.treeSpecs;
    tree.treeStatus = BigInt.fromI32(4);
    tree.treeType = BigInt.fromI32(0);
    if (tree.owner == ZERO_ADDRESS) {
        tree.provideStatus = BigInt.fromI32(4);
    }
    let uptree = new UpdateTree(getCount_updateSpec(COUNTER_ID).toHexString());
    uptree.tree = tree.id;
    uptree.updateDate = tree.plantDate;
    uptree.status = BigInt.fromI32(3);
    uptree.treeSpecs = tree.treeSpecs;
    uptree.type = true;
    uptree.save();
    tree.save();
    rtree.save();
    handleTreeSpecs(rtree.treeSpecs, rtree.id);
    // ipfs.mapJSON(tree.treeSpecs, 'saveTreeSpec', Value.fromString(tree.id));
}

export function handleRegularPlantRejected(event: RegularPlantRejected): void {
    let rtree = RegularTree.load(event.params.treeId.toHexString());
    let planter = Planter.load(rtree.planter);
    planter.plantedCount = planter.plantedCount.minus(BigInt.fromI32(1));
    if (planter.status.equals(BigInt.fromI32(2))) {
        planter.status = BigInt.fromI32(1);
    }
    planter.save();
    rtree.status = BigInt.fromI32(1);
    rtree.save();
}

export function handleTreeUpdated(event: TreeUpdated): void {
    let tree = Tree.load(event.params.treeId.toHexString());
    let treeFactoryContract = TreeFactoryContract.bind(event.address);
    let c_rtree = treeFactoryContract.regularTrees(event.params.treeId);
    let c_uptree = treeFactoryContract.updateTrees(event.params.treeId);
    let uptree = new UpdateTree(getCount_updateSpec(COUNTER_ID).toHexString());
    uptree.tree = tree.id;
    uptree.updateDate = event.block.timestamp;
    uptree.status = BigInt.fromI32(1);
    uptree.treeSpecs = c_uptree.value0;
    uptree.type = false;
    uptree.save();
    // handleTreeSpecs(tree.treeSpecstree.id);
    // ipfs.mapJSON(tree.treeSpecs, 'saveTreeSpec', Value.fromString(tree.id));
}



export function handleUpdateVerified(event: UpdateVerified): void {
    let tree = Tree.load(event.params.treeId.toHexString());
    let upTree = UpdateTree.load(tree.lastUpdate);
    upTree.status = BigInt.fromI32(3);
    let treeFactoryContract = TreeFactoryContract.bind(event.address);
    let c_tree = treeFactoryContract.treeData(event.params.treeId);
    tree.treeSpecs = c_tree.value8;
    tree.treeStatus = c_tree.value4 as BigInt;
    tree.save();
    upTree.save();
    handleTreeSpecs(tree.treeSpecs, tree.id);
    // ipfs.mapJSON(tree.treeSpecs, 'saveTreeSpec', Value.fromString(tree.id));
}

export function handleUpdateRejected(event: UpdateRejected): void {
    let tree = Tree.load(event.params.treeId.toHexString());
    let uptree = UpdateTree.load(tree.lastUpdate);
    uptree.status = BigInt.fromI32(2);
    uptree.save();
}
