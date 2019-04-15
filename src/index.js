document.body.style.backgroundColor = "black";
document.body.style.margin = "0px";

import xs from 'xstream';
import fromEvent from 'xstream/extra/fromEvent';
import pairwise from 'xstream/extra/pairwise';
import delay from 'xstream/extra/delay';
import dropRepeats from 'xstream/extra/dropRepeats';
import {run} from '@cycle/run';
import {div, img, makeDOMDriver} from '@cycle/dom';
import {makeAudioPlayerDriver} from '@cycle-robot-drivers/sound';

function main() {
  const input$ = xs.merge(
    fromEvent(window, 'mousedown').mapTo('on'),
    fromEvent(window, 'mouseup').mapTo('off'),
    fromEvent(window, 'touchstart').mapTo('on'),
    fromEvent(window, 'touchend').mapTo('off'),
  ).startWith('off').debug();

  const vdom$ = xs.merge(
    input$.filter(input => input === 'on'),
    input$.filter(input => input === 'off').compose(delay(2000)),
  )
  .map(evtName =>
    div({
      style: {
        'display': 'flex',
        'height': '100vh',
        'align-items': 'center',
        'justify-content': 'center',
      }
    }, [img({
      attrs: {
        src: evtName === 'off'
          ? '/public/img/magic_wand_white.svg'
          : '/public/img/magic_wand_yellow.svg',
        disabled: true
      },
      style: {'height': '50vmin'}
    })])
  ).debug();

  const deviceMotion$ = fromEvent(window, 'devicemotion');
  const play$ = xs.combine(
    input$,
    deviceMotion$
      .map(({
        acceleration,
        ..._, // accelerationIncludingGravity, rotationRate, interval
      }) => acceleration),
  )
  .fold((prev, [input, acc]) => (input === 'on' ? {
    maxX: (prev === null || acc.x > prev.maxX) ? acc.x : prev.maxX,
    maxY: (prev === null || acc.y > prev.maxY) ? acc.y : prev.maxY,
    maxZ: (prev === null || acc.z > prev.maxZ) ? acc.z : prev.maxZ,
  } : null), null)
  .compose(pairwise)
  .filter(([first, second]) => first !== null && second === null)
  .map(([first, _]) => {
    if (first.maxX > first.maxY && first.maxX > first.maxZ) {
      return {src: '/public/snd/345058_5865517-lq.mp3'};
    } else if (first.maxY > first.maxX && first.maxY > first.maxZ) {
      return {src: '/public/snd/221683_1015240-lq.mp3'};
    } else {
      return {src: '/public/snd/376747_5968849-lq.mp3'}
    }
  })
  .compose(dropRepeats());

  return {
    // DOM: vdom$,
    AudioPlayer: play$,
  };
}

run(main, {
  DOM: makeDOMDriver('#app'),
  AudioPlayer: makeAudioPlayerDriver(),
});
