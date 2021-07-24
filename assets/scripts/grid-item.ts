
const { ccclass, property } = cc._decorator;

@ccclass
export class gridItem extends cc.Component {
    isCollision = false;
    check = false;
    vx = 0;
    vy = 0;
    quadrant = -1;
    index: number = -1;
}
