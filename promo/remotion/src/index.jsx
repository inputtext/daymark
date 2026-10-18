import React from 'react';
import {registerRoot, Composition} from 'remotion';
import {DaymarkHero} from './promo.jsx';
const Root=()=> <Composition id="DaymarkHero" component={DaymarkHero} durationInFrames={300} fps={30} width={1920} height={1080}/>;
registerRoot(Root);
