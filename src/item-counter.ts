export class RingBuffer<T> {
    array: T[];
    capacity: number;
    _front: number;
    _back: number;
    _full: boolean;
    constructor(size: number) {
        this.array = [];
        this.capacity = size;
        this._front = 0;
        this._back = 0;
        this._full = false;
    }

    public push_back(data: T) {
        if (this.array.length < this.capacity) {
            this.array.push(data);
        } else {
            this.array[this._back] = data;
        }
        this._back = (this._back + 1) % this.capacity;
        if (this._full)
            this._front = this._back;
        if (this._back == this._front)
            this._full = true;
    }
    public front(): T | undefined {
        if (this._front == this._back && !this._full) {
            return undefined;
        } 
        return this.array[this._front];
    }
    public pop_front(): T | undefined {
        if (this._front == this._back && !this._full) {
            return undefined;
        }
        var data = this.array[this._front];
        this._front = (this._front + 1) % this.capacity;
        if (this._full)
            this._full = false;
        return data;
    }
    public empty(): boolean {
        return !this._full && (this._front === this._back);
    }
}

export class Item {
    id: number;
    amount: number;
    hq: boolean;

    constructor(id: number, hq: boolean, amount: number) {
        this.id = id;
        this.hq = hq;
        this.amount = amount;
    }

    static parse(combinedID: number, amount: number) {
        return new Item(combinedID % 1000000, combinedID >= 1000000, amount);
    }
}

export class ItemInfo {
    Id!: number;
    Name!: string;
    PriceLow!: number;
    PriceMid!: number;
}

class ItemLog {
    itemID: number;
    amount: number;
    date: number;

    constructor(id: number, amount: number) {
        this.itemID = id;
        this.amount = amount;
        this.date = Date.now();
    }
}

export class ItemCounter {
    buffer: RingBuffer<ItemLog>;
    callback: (name: string, items: Item[]) => void;
    constructor(callback: (name: string, items: Item[]) => void) {
        this.buffer = new RingBuffer<ItemLog>(100);
        this.callback = callback;
    }

    public parseLogLines(lines: string[]) {
        if (lines.length < 1) return;
        switch (lines[0]) {
            case "00":
                this.parseLogLine(lines[2], lines[3], lines[4]);
                break;
            case "41":
                this.parseSystemLogMessage(lines[2], lines[3], lines[4], lines[5], lines[6]);
            break;
            default:
                break;
        }
    }

    parseLogLine(filterChannel: string, sender: string, content: string) {
        if (filterChannel !== "0039" && sender !== "")
            return;
        var regex = /接受了“(.+)”探索完成的报告。/g;
        var match = regex.exec(content);
        if (!match || match.length < 1)
            return;
        
        var shipName = match[1];

        // 如果0039日志行先出现，则等会再解析
        this.queueCleanup(Date.now());
        setTimeout(() => {
            this.setShipName(shipName);
        }, 1000);
    }

    parseSystemLogMessage(instance: string, id: string, param0: string, param1: string, param2: string) {
        if (id !== "2EF")
            return;
        (instance);
        (param0);
        var itemID = parseInt(param1, 16);
        var amount = parseInt(param2, 16);
        this.enqueueItem(itemID, amount);
    }

    setShipName(name: string) {
        var itemMap = new Map<number, number>();
        while(!this.buffer.empty()) {
            var front = this.buffer.front();
            this.buffer.pop_front();
            if (!front) {
                continue;
            }
            var id = front.itemID;
            var amount = front.amount;
            if (itemMap.has(id)) {
                var last = itemMap.get(id);
                if (last != null) {
                    amount += last;
                }
            }
            itemMap.set(id, amount);
        }

        let items: Item[] = [];
        itemMap.forEach((value, key) => {
            var item = Item.parse(key, value);
            items.push(item);
        });

        this.callback(name, items);
    }

    enqueueItem(id: number, amount: number) {
        var item = new ItemLog(id, amount);
        this.queueCleanup(item.date);
        this.buffer.push_back(item);
    }

    queueCleanup(time: number) {
        while(!this.buffer.empty()) {
            var front = this.buffer.front();
            if (!front) break;
            if (time - front.date > 5000)
                this.buffer.pop_front();
            else
                break;
        }
    }
}
