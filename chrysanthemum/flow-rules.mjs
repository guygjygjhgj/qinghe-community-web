const healthyBranches = new Set(['待选黄色花枝', '待选杏色花枝', '待选粉色花枝']);

export function completedStepNext(scene, state) {
  if (scene === 'P02') {
    const chosen = new Set(state.chosen);
    return chosen.size === 3 && [...chosen].every(name => healthyBranches.has(name)) ? 'P03' : null;
  }
  if (scene === 'T04') return Number.isFinite(state.water) && state.water >= .35 && state.water <= 1 ? 'P05' : null;
  if (scene === 'P09' || scene === 'T08') return state.inserted === 3 ? 'P10' : null;
  if (scene === 'P12') return state.cleaned && state.leafCount >= 2 && state.inserted === 3 && state.water >= .35 ? 'P13' : null;
  return null;
}

export function canInsert(scene, state) {
  return state.leafCount >= 2 && state.water >= .35 &&
    ({P08: 0, T18: 1, T20: 2})[scene] === state.inserted;
}

export function validPlacement(point) {
  return point.x > 500 && point.x < 900 && point.y > 700 && point.y < 1390;
}
