import builtIn from "./data.json";

export interface ItemInfo {
    Id: number;
    Name: string;
    PriceLow: number;
}

interface MapData {
    maps: { [key: number]: string; };
    explorations: { id: number; mapId: number; name: string }[];
}

export class DataRepo {
    itemMap: Map<number, ItemInfo>;
    mapData: MapData | null = null;

    constructor(items: ItemInfo[] | null = null) {
        if (items === null) {
            items = builtIn;
        }

        this.itemMap = new Map<number, ItemInfo>();
        items.forEach(item => {
            this.itemMap.set(item.Id, item);
        });

        fetch("data/item.json").then(res => {
            return res.json();
        }).then((data: ItemInfo[]) => {
            data.forEach(item => {
                this.itemMap.set(item.Id, item);
            });
            console.log("Loaded item data", data.length);
        });

        fetch("data/map.json").then(res => {
            return res.json();
        }).then((data: MapData) => {
            this.mapData = data;
            console.log("Loaded map data", data);
        });
    }

    public getItemInfo(id: number): ItemInfo | undefined {
        return this.itemMap.get(id);
    }

    public name(id: number): string {
        const info = this.itemMap.get(id);
        if (info) {
            return info.Name;
        }
        return id.toString();
    }

    public price(id: number): number {
        const info = this.itemMap.get(id);
        if (info) {
            return info.PriceLow;
        }
        return 0;
    }

    public getRating(rating: number): string {
        switch (rating) {
            case 0: return "SS";
            case 1: return "S";
            case 2: return "A";
            case 3: return "B";
            case 4: return "C";
            default: return rating.toString();
        }
    }

    getDest(destId: number): { name: string; mapId: number } | null {
        if (this.mapData === null) {
            return null;
        }

        const exploration = this.mapData.explorations.find(exp => exp.id === destId);
        if (!exploration) {
            return null;
        }

        return exploration;
    }

    public getDestName(destId: number): string {
        const exploration = this.getDest(destId);
        if (!exploration) {
            return destId.toString();
        }
        return exploration.name;
    }

    public getDestMapName(destId: number): string {
        if (this.mapData === null) {
            return destId.toString();
        }

        const exploration = this.getDest(destId);
        if (!exploration) {
            return destId.toString();
        }

        const mapName = this.mapData.maps[exploration.mapId];
        return mapName || exploration.mapId.toString();
    }

    public getPartName(partId: number): string {
        const cate = Math.floor((partId - 1) / 4) + 1;
        if (cate <= 5)
            return cate.toString();
        if (cate <= 10)
            return (cate - 5).toString() + "改";
        return partId.toString();
    }
}

const repo = new DataRepo();
export { repo };
