import React from 'react';
import {registerRoot,Composition} from 'remotion';
import {DaymarkFilm} from './film.jsx';
const Root=()=> <React.Fragment>
  <Composition id="DaymarkLaunch" component={DaymarkFilm} durationInFrames={720} fps={30} width={1920} height={1080} defaultProps={{mode:'launch'}}/>
  <Composition id="DaymarkHeroLoop" component={DaymarkFilm} durationInFrames={360} fps={30} width={1920} height={1080} defaultProps={{mode:'loop'}}/>
  <Composition id="DaymarkVertical" component={DaymarkFilm} durationInFrames={600} fps={30} width={1080} height={1920} defaultProps={{mode:'vertical'}}/>
</React.Fragment>;
registerRoot(Root);
