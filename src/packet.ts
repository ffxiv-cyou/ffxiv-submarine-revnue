export class PacketSegment {
    size: number;
    sourceActor: number;
    targetActor: number;
    type: number;

    constructor(dw: DataView, offset: number = 0) {
        this.size = dw.getUint16(offset, true);
        this.sourceActor = dw.getUint32(offset + 4, true);
        this.targetActor = dw.getUint32(offset + 8, true);
        this.type = dw.getUint16(offset + 12, true);
    }

    static PacketSize() {
        return 16;
    }
}

export class IpcPacket extends PacketSegment {
    opcode: number;
    serverId: number;
    timestamp: number;

    constructor(dw: DataView, offset: number = 0) {
        super(dw, offset);

        offset += PacketSegment.PacketSize();
        this.opcode = dw.getUint16(offset + 2, true);
        this.serverId = dw.getUint32(offset + 4, true);
        this.timestamp = dw.getUint32(offset + 8, true);
    }

    static PacketSize() {
        return PacketSegment.PacketSize() + 16;
    }
}

export class FFXIVIpcActorControlSelf extends IpcPacket {
    category: number;
    padding: number;
    param1: number;
    param2: number;
    param3: number;
    param4: number;
    param5: number;
    param6: number;
    padding1: number;

    constructor(dw: DataView, offset: number = 0) {
        super(dw, offset);
        offset += IpcPacket.PacketSize();
        this.category = dw.getUint16(offset + 0, true);
        this.padding = dw.getUint16(offset + 2, true);
        this.param1 = dw.getUint32(offset + 4, true);
        this.param2 = dw.getUint32(offset + 8, true);
        this.param3 = dw.getUint32(offset + 12, true);
        this.param4 = dw.getUint32(offset + 16, true);
        this.param5 = dw.getUint32(offset + 20, true);
        this.param6 = dw.getUint32(offset + 24, true);
        this.padding1 = dw.getUint32(offset + 28, true);
    }
}

export class FFXIVIpcSubmarineStatusList extends IpcPacket {
    items: SubmarineStatusListItem[] = [];

    constructor(dw: DataView, offset: number = 0) {
        super(dw, offset);
        offset += IpcPacket.PacketSize();
        for (let i = 0; i < 4; i++) {
            this.items.push(new SubmarineStatusListItem(dw, offset + i * 60));
        }
    }
}

export class SubmarineStatusListItem {
    status: number;
    rank: number;
    registerTime: number;
    returnTime: number;
    currentExp: number;
    totalExpForNextRank: number;
    capacity: number;
    name: string;
    hull: number;
    stern: number;
    bow: number;
    bridge: number;
    dests: number[];

    constructor(dw: DataView, offset: number) {
        this.status = dw.getUint16(offset + 0, true);
        this.rank = dw.getUint16(offset + 2, true);
        this.registerTime = dw.getUint32(offset + 4, true);
        this.returnTime = dw.getUint32(offset + 8, true);
        this.currentExp = dw.getUint32(offset + 12, true);
        this.totalExpForNextRank = dw.getUint32(offset + 16, true);
        this.capacity = dw.getUint16(offset + 20, true);

        const nameDec = new TextDecoder("utf-8");
        let nameLength = 0;
        for (let i = 0; i < 24; i++) {
            if (dw.getUint8(offset + 22 + i) == 0) {
                nameLength = i;
                break;
            }
        }
        const nameBytes = new Uint8Array(dw.buffer, dw.byteOffset + offset + 22, nameLength);
        this.name = nameDec.decode(nameBytes);
        this.hull = dw.getUint16(offset + 46, true);
        this.stern = dw.getUint16(offset + 48, true);
        this.bow = dw.getUint16(offset + 50, true);
        this.bridge = dw.getUint16(offset + 52, true);
        this.dests = [];
        for (let i = 0; i < 5; i++){
            const dest = dw.getUint8(offset + 54 + i);
            if (dest != 0) {
                this.dests.push(dest);
            } else {
                break;
            }
        }
    }
}

export class FFXIVIpcSubmarineExplorationResult extends IpcPacket {
    rating: number;
    marineSpeed: number;
    items: submarineExplorationResultItem[] = [];

    constructor(dw: DataView, offset: number = 0) {
        super(dw, offset);
        offset += IpcPacket.PacketSize();

        this.rating = dw.getUint16(offset + 0, true);
        this.marineSpeed = dw.getUint16(offset + 2, true);
        for (let i = 0; i < 5; i++) {
            this.items.push(new submarineExplorationResultItem(dw, offset + 4 + i * 56));
        }
    }
}

export class submarineExplorationResultItem {
    destId: number;
    rating: number;
    unlockId: number;
    firstTimeExploration: boolean;
    unlockedSubmarineSlot: boolean;
    doubleDip: boolean;

    unknown0: number;

    favorResult: number;
    exp: number;
    item1Id: number;
    item2Id: number;
    item1Quantity: number;
    item2Quantity: number;
    item1IsHq: boolean;
    item2IsHq: boolean;

    item1IsNormal: number; // 0 = tier 3 pool, 1 = other
    item2IsNormal: number;

    loot1SurveillanceResult: number;
    loot2SurveillanceResult: number;
    loot1RetrievalResult: number;
    loot2RetrievalResult: number;
    loot1ItemDiscoveryDescription: number;
    loot2ItemDiscoveryDescription: number;

    constructor(dw: DataView, offset: number) {
        this.destId = dw.getUint8(offset + 0);
        this.rating = dw.getUint8(offset + 1);
        this.unlockId = dw.getUint8(offset + 2);
        this.firstTimeExploration = dw.getUint8(offset + 3) != 0;
        this.unlockedSubmarineSlot = dw.getUint8(offset + 4) != 0;
        this.doubleDip = dw.getUint8(offset + 5) != 0;
        this.unknown0 = dw.getUint16(offset + 6, true);
        this.favorResult = dw.getUint32(offset + 8, true);
        this.exp = dw.getUint32(offset + 12, true);
        this.item1Id = dw.getUint32(offset + 16, true);
        this.item2Id = dw.getUint32(offset + 20, true);
        this.item1Quantity = dw.getUint16(offset + 24, true);
        this.item2Quantity = dw.getUint16(offset + 26, true);
        this.item1IsHq = dw.getUint8(offset + 28) != 0;
        this.item2IsHq = dw.getUint8(offset + 29) != 0;
        this.item1IsNormal = dw.getUint8(offset + 30);
        this.item2IsNormal = dw.getUint8(offset + 31);
        this.loot1SurveillanceResult = dw.getUint32(offset + 32, true);
        this.loot2SurveillanceResult = dw.getUint32(offset + 36, true);
        this.loot1RetrievalResult = dw.getUint32(offset + 40, true);
        this.loot2RetrievalResult = dw.getUint32(offset + 44, true);
        this.loot1ItemDiscoveryDescription = dw.getUint32(offset + 48, true);
        this.loot2ItemDiscoveryDescription = dw.getUint32(offset + 52, true);
    }
}