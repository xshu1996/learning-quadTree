
export interface Bounds {
    x: number,
    y: number,
    width: number,
    height: number
}

export default class QuadTree<T extends Bounds> {

    /** 四叉树的最大层数 */
    public maxLevel: number = 5;
    /** 该四叉树的范围 */
    public bounds: Bounds;
    /** 该节点所容纳的最多的对象个数 */
    public maxObjects: number;
    /** 当前节点的层级 */
    public level: number;
    /** 当前节点所拥有的四个象限的子节点数组 */
    public nodes: QuadTree<T>[];
    /** 当前节点所存储的节点对象数组 */
    public objects: T[];

    constructor(bounds: Bounds, maxObjects?: number, maxLevel?: number, level?: number) {
        this.maxLevel = maxLevel || 4;
        this.bounds = bounds;
        this.maxObjects = maxObjects || 10;
        this.level = level || 0;

        this.objects = [];
        this.nodes = [];
    }

    /** 将该节点分割为4个子节点 */
    public split(): void {
        let nextLevel = this.level + 1,
            subWidth = this.bounds.width / 2,
            subHeight = this.bounds.height / 2,
            x = this.bounds.x,
            y = this.bounds.y;

        const nodePosList: { x: number, y: number }[] = [
            { x: x + subWidth, y: y + subHeight },
            { x, y: y + subHeight },
            { x, y },
            { x: x + subWidth, y }
        ];
        this.nodes = nodePosList.map(pos =>
            new QuadTree({
                x: pos.x,
                y: pos.y,
                width: subWidth,
                height: subHeight
            }, this.maxObjects, this.maxLevel, nextLevel)
        );
    }

    public getIndex(obj: Bounds): number[] {
        let indexes: number[] = [];

        let verticalMidPoint = this.bounds.x + this.bounds.width / 2;
        let horizonMidPoint = this.bounds.y + this.bounds.height / 2;

        // 判断象限
        let isFirst = obj.x > verticalMidPoint && obj.y > horizonMidPoint;
        let isSecond = obj.x < verticalMidPoint && obj.y > horizonMidPoint;
        let isThird = obj.x < verticalMidPoint && obj.y < horizonMidPoint;
        let isFour = obj.x > verticalMidPoint && obj.y < horizonMidPoint;

        if (isFirst) indexes.push(0);
        if (isSecond) indexes.push(1);
        if (isThird) indexes.push(2);
        if (isFour) indexes.push(3);
        else indexes.push(-1);

        // console.log("查看象限：", indexes);
        return indexes;
    }

    /** 插入 */
    public insert(obj): void {
        if (!obj) return;

        // console.log("插入");
        let i = 0,
            indexes;
        /** 如果该节点已经分裂了就将对象放到对应的子节点里面 */
        if (this.nodes.length) {
            indexes = this.getIndex(obj);

            indexes.forEach(element => {
                if (element !== -1) {
                    this.nodes[element].insert(obj);
                }
            });
            return;
        }
        this.objects.push(obj);
        // 长度大于容量
        if (this.objects.length > this.maxObjects && this.level < this.maxLevel) {
            /** 如果超过该节点所能容纳的最多节点就分裂并且将该节点下的所有对象都放到分裂的子节点下 */
            if (!this.nodes.length) {
                /** 分裂 */
                this.split();
            }
            this.objects.forEach(obj => {
                this.getIndex(obj)
                    .filter(ele => ele !== -1)
                    .forEach(ele => {
                        this.nodes[ele].insert(this.objects[i]);
                    });
            });

            /** 清空该节点下的所有对象 */
            this.objects.length = 0;
        }
    }

    /**
     * 返回所有可能与给定对象发生冲突的对象
     * return all objects that could collide with the given object
     * 
     */
    public retrieve(obj) {
        let indexes = this.getIndex(obj),
            ret = this.objects;

        if (this.nodes.length) {
            indexes
                .filter(v => v !== -1)
                .forEach((ele) => {
                    ret = ret.concat(this.nodes[ele].retrieve(obj));
                });
        }
        /** 去重 */
        ret = ret.filter((ele, index) => {
            return ret.indexOf(ele) >= index;
        });

        return ret;
    }

    public clear(): void {
        this.objects.length = 0;
        this.nodes.forEach(ele => ele.clear());
        this.nodes.length = 0;
    }
}