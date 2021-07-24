
import QuadTree, { Bounds } from "./quad-tree";
import { gridItem } from "./grid-item";

const { ccclass, property } = cc._decorator;

@ccclass
export class QuadTreeCtr extends cc.Component {

    @property(cc.Prefab)
    p_pfbBlock: cc.Prefab = null;

    private draw: cc.Graphics;
    private drawNode: cc.Node;
    private w: number = 0;
    private h: number = 0;
    private qtRoot: QuadTree<cc.Node> = null;
    private _blockList: cc.Node[] = [];
    private isMouseMoving: boolean = false;
    private mouseNode: Bounds = null;
    private waitCheckNodeQue: cc.Node[] = [];

    protected onLoad(): void {
        this.drawNode = new cc.Node();
        this.node.addChild(this.drawNode);

        this.drawNode.addComponent(cc.Graphics);

        this.draw = this.drawNode.getComponent(cc.Graphics);

        this.draw.lineWidth = 2;
        this.draw.lineCap = cc.Graphics.LineCap.SQUARE;
        this.draw.lineJoin = cc.Graphics.LineJoin.MITER;
        this.draw.strokeColor = new cc.Color(255, 0, 0, 255);

        this.node.on(cc.Node.EventType.MOUSE_MOVE, this._mouseMove, this);
        this.node.on(cc.Node.EventType.MOUSE_LEAVE, this._mouseLeave, this);

        this.w = this.node.width;
        this.h = this.node.height;
        this.createRange(this.w, this.h);
        this.qtRoot = new QuadTree({
            x: 0,
            y: 0,
            width: 960,
            height: 640,
        }, 4, 5);

        this.mouseNode = {
            x: 0,
            y: 0,
            width: 20,
            height: 20
        };
    }

    /** 鼠标移动 */
    private _mouseMove(event: cc.Event.EventMouse): void {
        this.waitCheckNodeQue = [];
        let worldLocation = event.getLocation();

        let mouseLocation = this.node.convertToNodeSpaceAR(worldLocation);
        this.mouseNode.x = mouseLocation.x;
        this.mouseNode.y = mouseLocation.y;

        this.qtRoot.getIndex(this.mouseNode);
    }

    private updateTargetsInfo(targets: cc.Node[]): void {
        for (let i = 0; i < targets.length; i++) {
            let itemCom: gridItem = targets[i].getComponent(gridItem);
            itemCom.check = true;
            targets[i].color = cc.Color.BLACK;
            targets[i].getChildByName('debug_num').color = cc.Color.WHITE;
        }
    }

    private resetTargetsColor(): void {
        this.waitCheckNodeQue.forEach((item) => {
            let itemCom: gridItem = item.getComponent(gridItem);
            itemCom.isCollision = false;
            item.color = cc.Color.BLACK;
            item.getChildByName('debug_num').color = cc.Color.WHITE;
        })
    }

    /** 鼠标离开 */
    private _mouseLeave(event): void {
        this.waitCheckNodeQue.forEach((item) => {
            let itemCom: gridItem = item.getComponent(gridItem);
            itemCom.isCollision = true;
            item.color = cc.Color.WHITE;
        })
    }

    private createRange(w: number, h: number): void {
        if (this.draw) {
            this.draw.moveTo(-this.w / 2, 0);
            this.draw.lineTo(this.w / 2, 0);

            this.draw.moveTo(0, this.h / 2);
            this.draw.lineTo(0, -this.h / 2);
            this.draw.stroke();
        }
    }

    public addObj(count: number = 1): void {
        for (let i = 0; i < count; i++) {
            let rect: cc.Node = cc.instantiate(this.p_pfbBlock);
            rect.getComponent(gridItem).vx = this.randomNumBoth(-0.5, 0.5);
            rect.getComponent(gridItem).vy = this.randomNumBoth(-0.5, 0.5);
            rect.x = this.randomNumBoth(rect.width / 2, this.qtRoot.bounds.width - rect.width / 2);
            rect.y = this.randomNumBoth(rect.height / 2, this.qtRoot.bounds.height - rect.height / 2);
            this.node.addChild(rect);
            const currIndex: number = this._blockList.length ?? 0;
            rect.getComponent('gridItem').index = currIndex;
            rect.getChildByName('debug_num').getComponent(cc.Label).string = `${currIndex}`;
            this._blockList.push(rect);
            this.qtRoot.insert(rect);
        }
    }

    public drawQT(qt: QuadTree<cc.Node>): void {
        let bounds = qt.bounds;
        if (qt.nodes.length) {
            qt.nodes.forEach((item) => {
                this.drawQT(item);
            });
        } else {
            this.draw.rect(bounds.x, bounds.y, bounds.width, bounds.height);
            this.draw.strokeColor = cc.Color.RED;
            this.draw.stroke();
        }
    }

    public loop(): void {
        this.qtRoot.clear();
        // update myObjects and insert them into the tree again
        for (let i = 0; i < this._blockList.length; i++) {
            let script = this._blockList[i].getComponent(gridItem);

            if (this.is(this._blockList[i].x, { value1: 960, value2: 0 })) {
                script.vx = -script.vx;
            }
            if (this.is(this._blockList[i].y, { value1: 600, value2: 0 })) {
                script.vy = -script.vy;
            }
            script.check = false;
            this._blockList[i].color = cc.Color.WHITE;
            this._blockList[i].getChildByName('debug_num').color = cc.Color.BLACK;
            this._blockList[i].x += script.vx;
            this._blockList[i].y += script.vy;
            this.qtRoot.insert(this._blockList[i]);
        }
    }

    public is(location, range): boolean {
        if (location > range.value1 || location < range.value2) {
            return true;
        }
        return false;
    }

    /**
     * 区间的随机数
     * @param min
     * @param max
     * @returns {number} [min, max]
     * @constructor
     */
    public randomNumBoth(min, max): number {
        [min, max] = [Math.min(min, max), Math.max(min, max)];
        let range = max - min;
        let rand = Math.random();
        // 四舍五入
        return min + Math.floor(rand * range);
    }

    protected update(dt: number): void {
        if (this.qtRoot) {
            this.draw.clear();
            this.drawQT(this.qtRoot);
            this.loop();
            this.updateTargetsInfo(this.qtRoot.retrieve(this.mouseNode));
        }
    }
}
