'use strict';

class Vector {

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  plus(vec) {
    if (!(vec instanceof Vector)) {
      throw new TypeError('В метод plus() каласса Vector передеан не обьект класса Vector');
    }

    return new Vector(this.x + vec.x, this.y +vec.y)

  }

  times(factor) {
    return new Vector(this.x * factor, this.y * factor);
  }

}


class Actor {

  constructor(positionVec = new Vector(0, 0), sizeVec = new Vector(1, 1), speedVec = new Vector(0, 0)) {
    if (!(positionVec instanceof Vector)) {
        throw new TypeError('В конструктор класса Actor первым аргументом передан не объект класса Vector');
    }
    if (!(sizeVec instanceof Vector)) {
        throw new TypeError('В конструктор класса Actor вторым аргументом передан не объект класса Vector');
      }
    if (!(speedVec instanceof Vector)) {
        throw new TypeError('В конструктор класса Actor третьим аргументом передан не объект класса Vector');
    }

    this.pos = positionVec;
    this.size = sizeVec;
    this.speed = speedVec;
 
  }

  get type() {
    return 'actor';
  }
  get left() {
    return this.pos.x;
  }
  get right() {
    return this.pos.x + this.size.x;
  }
  get top() {
    return this.pos.y;
  }
  get bottom() {
    return this.pos.y + this.size.y;
  }

  isIntersect(actor) {
    if (!(actor instanceof Actor)) {
        throw new TypeError('В функцию isIntersect() класса Actor передан не объект класса Actor');
    }

    if (actor === this) {
        return false;
    }

    return (actor.bottom > this.top && actor.top < this.bottom && actor.left < this.right && actor.right > this.left);

  }

  act() {}

}


class Level {

  constructor(grid = [], actorsList = []) {
    this.grid = grid;
    this.actors = actorsList;
    this.player = actorsList.find( el => el.type === 'player' );
    this.height = this.grid.length;
    this.width = this.grid.reduce( (memo, el) => {
      if ((el.length) > memo) {
        memo = el.length;
      }
      return memo;
    }, 0);
    this.status = null;
    this.finishDelay = 1;
  }

  isFinished() {

    return (this.status !== null && this.finishDelay < 0);

  }

  actorAt(actor) {
    if ( !(actor instanceof Actor) ) {
        throw new TypeError('В функцию actorAt() класса Level передан не объект класса Actor');
    }

    return this.actors.find( el => actor.isIntersect(el))
  }

  obstacleAt(futurePosVec, sizeVec) {

    if (!(futurePosVec instanceof Vector) || !(sizeVec instanceof Vector)) {
      throw new TypeError('В функцию obstacleAt() кдасса Level одним из аргументов передан на объект класса Vector');
    }

    const left = Math.floor(futurePosVec.x);
    const right = Math.ceil(futurePosVec.x + sizeVec.x);
    const top = Math.floor(futurePosVec.y);
    const bottom = Math.ceil(futurePosVec.y + sizeVec.y);

    if (bottom > this.height) {
      return 'lava';
    }
    if (left < 0 || right > this.width || top < 0) {
      return 'wall';
    }

    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        const obstacle = this.grid[y][x];
        if (obstacle) {
          return obstacle;
        }
      }
    }

  }

  removeActor(actor) {
    const index = this.actors.indexOf(actor);
    if (index !== -1) {
      this.actors.splice(index, 1);
    }
  }

  noMoreActors(actorType) {

    return !( this.actors.some(el => el.type === actorType) )

  }

  playerTouched(typeStr, actor) {

    if (this.status !== null) {
      return;
    }
    if (typeStr === 'lava' || typeStr === 'fireball') {
      this.status = 'lost';
      return;
    }
    if (typeStr === 'coin') {
      this.removeActor(actor);
      if (this.noMoreActors(typeStr)) {
        this.status = 'won';
      }
    }
  }

}


class LevelParser {

  constructor(dictionaryActors) {
    this.dictionary = Object.assign({}, dictionaryActors);
  }

  actorFromSymbol(actorSymbol) {

    return this.dictionary[actorSymbol];

  }

  obstacleFromSymbol(obstacleSymbol) {
    if (obstacleSymbol === 'x') {
      return 'wall';
    } else if (obstacleSymbol === '!') {
      return 'lava';
    }
  }

  createGrid(stringArr) {

    return stringArr.map( el => el.split('').map( symbol => this.obstacleFromSymbol(symbol) ))

  }

  createActors(stringArr) {

    return stringArr.reduce( (actors, el, y) => {
      el.split('').forEach( (symbol, x) => {
        const constr = this.actorFromSymbol(symbol);
        if ((typeof constr) === 'function') {
          const position = new Vector(x, y);
          const actor = new constr(position);
          if (actor instanceof Actor) {
            actors.push(actor);
          }
        }
      })
      return actors;
    }, [])

  }

  parse(plan) {

    const grid = this.createGrid(plan);
    const actors = this.createActors(plan);
    return new Level(grid, actors);

  }

}



class Fireball extends Actor {
  constructor(positionVec = new Vector(0, 0), speedVec = new Vector(0, 0)) {
    super(positionVec, new Vector(1, 1), speedVec);
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(time = 1) {

    return this.pos.plus(this.speed.times(time));

  }

  handleObstacle() {

    this.speed = this.speed.times(-1);

  }

  act(time, level) {

    const futurePos = this.getNextPosition(time);

    if (level.obstacleAt(futurePos, this.size)) {
      this.handleObstacle();
    } else {
      this.pos = futurePos;
    }

  }

}


class HorizontalFireball extends Fireball {

  constructor(positionVec = new Vector(0, 0)) {
    super(positionVec, new Vector(2, 0));
  }

}

class VerticalFireball extends Fireball {

  constructor(positionVec = new Vector(0, 0)) {
    super(positionVec, new Vector(0, 2));
  }

}

class FireRain extends Fireball {

  constructor(positionVec = new Vector(0, 0)) {
    super(positionVec, new Vector(0, 3));
    this.startPos = positionVec;
  }

  handleObstacle() {
    this.pos = this.startPos;
  }

}


class Coin extends Actor {

  constructor(positionVec = new Vector(0, 0)) {
    super(positionVec.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * (Math.PI * 2);
    this.basicPos = this.pos
  }

  get type() {
    return 'coin';
  }

  updateSpring(time = 1) {
    this.spring += this.springSpeed * time;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(time = 1) {
    this.updateSpring(time);
    return this.basicPos.plus(this.getSpringVector());
  }

  act(time) {
    this.pos = this.getNextPosition(time);
  }

}


class Player extends Actor {

  constructor(positionVec = new Vector(0, 0)) {
    super(positionVec.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5), new Vector(0, 0));
  }

  get type() {
    return 'player';
  }

}

const schemas = [
  [
    'o ov  o o',
    '        =',
    '         ',
    ' @       ',
    '         ',
    '         ',
    'xxx!o!xxx',
    '         ',
    '    x    '
  ],
  [
    '     x    ',
    '     | = x',
    '          ',
    '@o|      o',
    'x        x',
    'x       ox',
    'x   x   xx'
  ],
  [
    ' |                  ',
    '         |      =   ',
    '              o     ',
    '@   =    o    xx    ',
    '        xx!         ',
    '    xx              ',
    'xx               o  ',
    '                xxx '
  ],
  [
    '               x           ',
    '                           ',
    '        x                  ',
    '        x    | |           ',
    '       ox                  ',
    '    x            |       o ',
    '    x          o         x ',
    '    x          x         = ',
    '@   x         x            ',
    'xxxxxxxxxxx         xxxxxxx'
  ],
];
const actorDict = {
  '@': Player,
  'v': FireRain,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball
}
const parser = new LevelParser(actorDict);
runGame(schemas, parser, DOMDisplay)
  .then(() => console.log('Вы выиграли приз!'));
